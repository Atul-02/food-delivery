import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { notFound } from '../../utils/httpError';
import { paginated, paginationSchema, toSkipTake } from '../../utils/pagination';

const listQuerySchema = paginationSchema.extend({
  approved: z.enum(['true', 'false']).optional(),
});

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/restaurants', async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const where: Prisma.RestaurantWhereInput = query.approved ? { isApproved: query.approved === 'true' } : {};

  const [items, total] = await prisma.$transaction([
    prisma.restaurant.findMany({
      where,
      include: { owner: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(query),
    }),
    prisma.restaurant.count({ where }),
  ]);
  res.json(paginated(items, total, query));
});

adminRouter.patch('/restaurants/:id/approval', async (req, res) => {
  const { isApproved } = z.object({ isApproved: z.boolean() }).parse(req.body);
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } });
  if (!restaurant) throw notFound('Restaurant not found');

  const updated = await prisma.restaurant.update({
    where: { id: req.params.id },
    // Un-approving a restaurant also closes it
    data: { isApproved, ...(isApproved ? {} : { isOpen: false }) },
  });
  res.json(updated);
});
