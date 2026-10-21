import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth';
import * as cartService from './cart.service';

const addItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
  replaceCart: z.boolean().default(false),
});

const quantitySchema = z.object({ quantity: z.number().int().min(0).max(20) });

export const cartRouter = Router();
cartRouter.use(requireAuth, requireRole('CUSTOMER'));

cartRouter.get('/', async (req, res) => {
  res.json(await cartService.getCart(currentUser(req).id));
});

cartRouter.post('/items', async (req, res) => {
  const input = addItemSchema.parse(req.body);
  res.json(await cartService.addItem(currentUser(req).id, input));
});

cartRouter.patch('/items/:menuItemId', async (req, res) => {
  const { quantity } = quantitySchema.parse(req.body);
  res.json(await cartService.setItemQuantity(currentUser(req).id, req.params.menuItemId, quantity));
});

cartRouter.delete('/items/:menuItemId', async (req, res) => {
  res.json(await cartService.removeItem(currentUser(req).id, req.params.menuItemId));
});

cartRouter.delete('/', async (req, res) => {
  await cartService.clearCart(currentUser(req).id);
  res.status(204).end();
});
