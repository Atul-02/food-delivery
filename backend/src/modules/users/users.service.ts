import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { notFound } from '../../utils/httpError';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) throw notFound('User not found');
  return user;
}

export function updateMe(userId: string, data: { name?: string; phone?: string }) {
  return prisma.user.update({ where: { id: userId }, data, select: publicUserSelect });
}

// ---------- Addresses ----------

export interface AddressInput {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

async function findOwnAddress(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw notFound('Address not found');
  return address;
}

export async function createAddress(userId: string, input: AddressInput) {
  const count = await prisma.address.count({ where: { userId } });
  // The first address is always the default
  const isDefault = count === 0 || input.isDefault === true;

  return prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.create({ data: { ...input, userId, isDefault } });
  });
}

export async function updateAddress(userId: string, addressId: string, input: Partial<AddressInput>) {
  await findOwnAddress(userId, addressId);

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.update({ where: { id: addressId }, data: input });
  });
}

export async function deleteAddress(userId: string, addressId: string) {
  const address = await findOwnAddress(userId, addressId);
  await prisma.address.delete({ where: { id: addressId } });

  // If we removed the default, promote the newest remaining address
  if (address.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
}
