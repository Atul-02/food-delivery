import { Router } from 'express';
import { OrderStatus } from '@prisma/client';
import { z } from 'zod';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth';
import { paginationSchema } from '../../utils/pagination';
import { getMenu } from '../restaurants/restaurants.service';
import * as ownerService from './owner.service';

const restaurantSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  cuisines: z.array(z.string().trim().toLowerCase().min(1).max(40)).min(1).max(10),
  imageUrl: z.string().url().optional(),
  addressLine: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  sortOrder: z.number().int().min(0).optional(),
});

const menuItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  price: z.number().int().positive().describe('Price in paise'),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
  categoryId: z.string().nullable().optional(),
});

const ordersQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(OrderStatus).optional(),
});

const orderStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'PREPARING', 'READY_FOR_PICKUP']),
});

export const ownerRouter = Router();
ownerRouter.use(requireAuth, requireRole('RESTAURANT_OWNER'));

// Restaurants
ownerRouter.get('/restaurants', async (req, res) => {
  res.json(await ownerService.listMyRestaurants(currentUser(req).id));
});

ownerRouter.post('/restaurants', async (req, res) => {
  const input = restaurantSchema.parse(req.body);
  res.status(201).json(await ownerService.createRestaurant(currentUser(req).id, input));
});

ownerRouter.patch('/restaurants/:id', async (req, res) => {
  const input = restaurantSchema.partial().parse(req.body);
  res.json(await ownerService.updateRestaurant(currentUser(req).id, req.params.id, input));
});

ownerRouter.patch('/restaurants/:id/status', async (req, res) => {
  const { isOpen } = z.object({ isOpen: z.boolean() }).parse(req.body);
  res.json(await ownerService.setOpen(currentUser(req).id, req.params.id, isOpen));
});

// Menu
ownerRouter.get('/restaurants/:id/menu', async (req, res) => {
  await ownerService.getOwnedRestaurant(currentUser(req).id, req.params.id);
  res.json(await getMenu(req.params.id));
});

ownerRouter.post('/restaurants/:id/categories', async (req, res) => {
  const input = categorySchema.parse(req.body);
  res.status(201).json(await ownerService.createCategory(currentUser(req).id, req.params.id, input));
});

ownerRouter.patch('/categories/:categoryId', async (req, res) => {
  const input = categorySchema.partial().parse(req.body);
  res.json(await ownerService.updateCategory(currentUser(req).id, req.params.categoryId, input));
});

ownerRouter.delete('/categories/:categoryId', async (req, res) => {
  await ownerService.deleteCategory(currentUser(req).id, req.params.categoryId);
  res.status(204).end();
});

ownerRouter.post('/restaurants/:id/items', async (req, res) => {
  const input = menuItemSchema.parse(req.body);
  res.status(201).json(await ownerService.createItem(currentUser(req).id, req.params.id, input));
});

ownerRouter.patch('/items/:itemId', async (req, res) => {
  const input = menuItemSchema.partial().parse(req.body);
  res.json(await ownerService.updateItem(currentUser(req).id, req.params.itemId, input));
});

ownerRouter.delete('/items/:itemId', async (req, res) => {
  await ownerService.deleteItem(currentUser(req).id, req.params.itemId);
  res.status(204).end();
});

// Orders
ownerRouter.get('/restaurants/:id/orders', async (req, res) => {
  const filters = ordersQuerySchema.parse(req.query);
  res.json(await ownerService.listRestaurantOrders(currentUser(req).id, req.params.id, filters));
});

ownerRouter.patch('/orders/:orderId/status', async (req, res) => {
  const { status } = orderStatusSchema.parse(req.body);
  res.json(await ownerService.updateOrderStatus(currentUser(req).id, req.params.orderId, status));
});
