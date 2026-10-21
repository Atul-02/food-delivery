import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../../middleware/auth';
import * as usersService from './users.service';

const updateMeSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  })
  .partial();

const addressSchema = z.object({
  label: z.string().trim().max(30).optional(),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get('/me', async (req, res) => {
  res.json(await usersService.getMe(currentUser(req).id));
});

usersRouter.patch('/me', async (req, res) => {
  const input = updateMeSchema.parse(req.body);
  res.json(await usersService.updateMe(currentUser(req).id, input));
});

usersRouter.get('/me/addresses', async (req, res) => {
  res.json(await usersService.listAddresses(currentUser(req).id));
});

usersRouter.post('/me/addresses', async (req, res) => {
  const input = addressSchema.parse(req.body);
  res.status(201).json(await usersService.createAddress(currentUser(req).id, input));
});

usersRouter.patch('/me/addresses/:id', async (req, res) => {
  const input = addressSchema.partial().parse(req.body);
  res.json(await usersService.updateAddress(currentUser(req).id, req.params.id, input));
});

usersRouter.delete('/me/addresses/:id', async (req, res) => {
  await usersService.deleteAddress(currentUser(req).id, req.params.id);
  res.status(204).end();
});
