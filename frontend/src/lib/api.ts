// Small fetch wrapper for the backend API.
// - Adds the access token to every request
// - On a 401, refreshes the tokens once and retries the request
// - Throws ApiError with the server's message on failure

import type { AuthResponse } from '../types';

const BASE = '/api/v1';
const STORAGE_KEY = 'quickbite.tokens';

type Tokens = Pick<AuthResponse, 'accessToken' | 'refreshToken'>;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: any,
  ) {
    super(message);
  }
}

// ---------- Token storage ----------

function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

let tokens: Tokens | null = loadTokens();
const clearedListeners = new Set<() => void>();

export function getTokens() {
  return tokens;
}

export function setTokens(next: Tokens | null) {
  tokens = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode): tokens still live in memory for this tab
  }
  if (!next) clearedListeners.forEach((fn) => fn());
}

// Lets the auth context know when the session ends (e.g. refresh token expired)
export function onTokensCleared(fn: () => void) {
  clearedListeners.add(fn);
  return () => {
    clearedListeners.delete(fn);
  };
}

// ---------- Refresh ----------

// If several requests get a 401 at once, they all share one refresh call
let refreshing: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  const current = tokens;
  if (!current) return Promise.resolve(false);

  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!res.ok) {
        setTokens(null);
        return false;
      }
      setTokens((await res.json()) as Tokens);
      return true;
    } catch {
      return false; // network error: keep tokens, let the caller show an error
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

// ---------- Requests ----------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function api<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const send = () =>
    fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && tokens && !path.startsWith('/auth/')) {
      if (await refreshTokens()) res = await send();
    }
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.details);
  }
  return data as T;
}

// Turns any error into one readable sentence for the UI.
// For validation errors, shows the first field problem, e.g. "pincode: Pincode must be 6 digits".
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const fieldErrors = err.details?.fieldErrors as Record<string, string[]> | undefined;
    const first = fieldErrors && Object.entries(fieldErrors).find(([, msgs]) => msgs?.length);
    if (first) return `${first[0]}: ${first[1][0]}`;
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
