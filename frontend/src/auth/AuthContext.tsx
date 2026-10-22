import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getTokens, onTokensCleared, setTokens } from '../lib/api';
import type { AuthResponse, Role, User } from '../types';

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: Extract<Role, 'CUSTOMER' | 'RESTAURANT_OWNER'>;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => getTokens() !== null);

  // On page load, if we have saved tokens, find out who is logged in
  useEffect(() => {
    if (!getTokens()) return;
    api<User>('/users/me')
      .then(setUser)
      .catch(() => setTokens(null))
      .finally(() => setLoading(false));
  }, []);

  // If the session ends on its own (refresh token expired), log out in the UI
  useEffect(
    () =>
      onTokensCleared(() => {
        setUser(null);
        queryClient.clear();
      }),
    [queryClient],
  );

  const startSession = (res: AuthResponse) => {
    setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    queryClient.clear();
    setUser(res.user);
    return res.user;
  };

  const value: AuthContextValue = {
    user,
    loading,
    login: async (email, password) =>
      startSession(await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } })),
    register: async (input) =>
      startSession(await api<AuthResponse>('/auth/register', { method: 'POST', body: input })),
    logout: async () => {
      const refreshToken = getTokens()?.refreshToken;
      if (refreshToken) {
        await api('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined);
      }
      setTokens(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
