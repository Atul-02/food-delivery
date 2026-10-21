import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { generateRefreshToken, hashToken, signAccessToken } from '../../lib/tokens';
import { conflict, unauthorized } from '../../utils/httpError';
import { publicUserSelect } from '../users/users.service';

const DAY_MS = 24 * 60 * 60 * 1000;

async function issueTokens(user: { id: string; role: Role }) {
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
    },
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

export async function register(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('An account with this email already exists');

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: input.role,
      riderProfile: input.role === 'RIDER' ? { create: {} } : undefined,
    },
    select: publicUserSelect,
  });

  return { user, ...(await issueTokens(user)) };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized('Invalid email or password');
  }

  const { passwordHash: _hash, updatedAt: _updated, ...publicUser } = user;
  return { user: publicUser, ...(await issueTokens(user)) };
}

// Each refresh token works once. Using it deletes it and issues a new pair.
export async function refresh(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: { select: { id: true, role: true } } },
  });
  if (!stored) throw unauthorized('Invalid refresh token');

  await prisma.refreshToken.delete({ where: { id: stored.id } });
  if (stored.expiresAt < new Date()) throw unauthorized('Refresh token expired');

  return issueTokens(stored.user);
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(refreshToken) } });
}
