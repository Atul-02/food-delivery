import type { Request, RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { verifyAccessToken } from '../lib/tokens';
import { forbidden, unauthorized } from '../utils/httpError';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw unauthorized('Missing access token');

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    throw unauthorized('Invalid or expired access token');
  }
  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw forbidden('You do not have access to this resource');
    }
    next();
  };

// Use inside handlers that run after requireAuth.
export function currentUser(req: Request) {
  if (!req.user) throw unauthorized();
  return req.user;
}
