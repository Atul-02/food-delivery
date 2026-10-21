import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { notFound } from '../../utils/httpError';
import { paginated, toSkipTake, type Pagination } from '../../utils/pagination';

export const restaurantCardSelect = {
  id: true,
  name: true,
  description: true,
  cuisines: true,
  imageUrl: true,
  addressLine: true,
  city: true,
  pincode: true,
  lat: true,
  lng: true,
  isOpen: true,
  avgRating: true,
  ratingCount: true,
} satisfies Prisma.RestaurantSelect;

export interface RestaurantFilters extends Pagination {
  search?: string;
  cuisine?: string;
  city?: string;
}

export async function listRestaurants(filters: RestaurantFilters) {
  const { search, cuisine, city } = filters;

  const where: Prisma.RestaurantWhereInput = {
    isApproved: true,
    ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
    ...(cuisine ? { cuisines: { has: cuisine.toLowerCase() } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { cuisines: { has: search.toLowerCase() } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.restaurant.findMany({
      where,
      select: restaurantCardSelect,
      orderBy: [{ isOpen: 'desc' }, { avgRating: 'desc' }, { createdAt: 'desc' }],
      ...toSkipTake(filters),
    }),
    prisma.restaurant.count({ where }),
  ]);

  return paginated(items, total, filters);
}

export async function getApprovedRestaurant(restaurantId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, isApproved: true },
    select: restaurantCardSelect,
  });
  if (!restaurant) throw notFound('Restaurant not found');
  return restaurant;
}

// Returns the full menu grouped by category. Unavailable items are included
// with isAvailable=false so the UI can show them as "currently unavailable".
export async function getMenu(restaurantId: string) {
  const [categories, uncategorized] = await prisma.$transaction([
    prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { items: { orderBy: { name: 'asc' } } },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId, categoryId: null },
      orderBy: { name: 'asc' },
    }),
  ]);

  return { categories, uncategorized };
}

export async function listReviews(restaurantId: string, pagination: Pagination) {
  const where = { restaurantId };
  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
      ...toSkipTake(pagination),
    }),
    prisma.review.count({ where }),
  ]);
  return paginated(items, total, pagination);
}
