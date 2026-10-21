import { Router } from 'express';
import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination';
import * as restaurantsService from './restaurants.service';

const listQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(100).optional(),
  cuisine: z.string().trim().min(1).max(50).optional(),
  city: z.string().trim().min(1).max(60).optional(),
});

// Public endpoints: no login needed to browse
export const restaurantsRouter = Router();

restaurantsRouter.get('/', async (req, res) => {
  const filters = listQuerySchema.parse(req.query);
  res.json(await restaurantsService.listRestaurants(filters));
});

restaurantsRouter.get('/:id', async (req, res) => {
  res.json(await restaurantsService.getApprovedRestaurant(req.params.id));
});

restaurantsRouter.get('/:id/menu', async (req, res) => {
  await restaurantsService.getApprovedRestaurant(req.params.id);
  res.json(await restaurantsService.getMenu(req.params.id));
});

restaurantsRouter.get('/:id/reviews', async (req, res) => {
  const pagination = paginationSchema.parse(req.query);
  await restaurantsService.getApprovedRestaurant(req.params.id);
  res.json(await restaurantsService.listReviews(req.params.id, pagination));
});
