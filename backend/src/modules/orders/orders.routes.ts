import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth';
import { paginationSchema } from '../../utils/pagination';
import * as ordersService from './orders.service';

const placeOrderSchema = z.object({
  addressId: z.string().min(1),
  paymentMethod: z.enum(['COD', 'ONLINE']),
  notes: z.string().trim().max(300).optional(),
});

export const ordersRouter = Router();
ordersRouter.use(requireAuth, requireRole('CUSTOMER'));

ordersRouter.post('/', async (req, res) => {
  const input = placeOrderSchema.parse(req.body);
  res.status(201).json(await ordersService.placeOrder(currentUser(req).id, input));
});

ordersRouter.get('/', async (req, res) => {
  const pagination = paginationSchema.parse(req.query);
  res.json(await ordersService.listMyOrders(currentUser(req).id, pagination));
});

ordersRouter.get('/:id', async (req, res) => {
  res.json(await ordersService.getMyOrder(currentUser(req).id, req.params.id));
});

ordersRouter.post('/:id/cancel', async (req, res) => {
  res.json(await ordersService.cancelOrder(currentUser(req).id, req.params.id));
});
