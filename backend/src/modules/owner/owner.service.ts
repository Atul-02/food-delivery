import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, notFound } from '../../utils/httpError';
import { paginated, toSkipTake, type Pagination } from '../../utils/pagination';

// ---------- Restaurants ----------

export interface RestaurantInput {
  name: string;
  description?: string;
  cuisines: string[];
  imageUrl?: string;
  addressLine: string;
  city: string;
  pincode: string;
  lat?: number;
  lng?: number;
}

async function getOwnedRestaurant(ownerId: string, restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || restaurant.ownerId !== ownerId) throw notFound('Restaurant not found');
  return restaurant;
}

export function listMyRestaurants(ownerId: string) {
  return prisma.restaurant.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
}

// New restaurants start unapproved and closed. An admin must approve them.
export function createRestaurant(ownerId: string, input: RestaurantInput) {
  return prisma.restaurant.create({ data: { ...input, ownerId } });
}

export async function updateRestaurant(ownerId: string, restaurantId: string, input: Partial<RestaurantInput>) {
  await getOwnedRestaurant(ownerId, restaurantId);
  return prisma.restaurant.update({ where: { id: restaurantId }, data: input });
}

export async function setOpen(ownerId: string, restaurantId: string, isOpen: boolean) {
  const restaurant = await getOwnedRestaurant(ownerId, restaurantId);
  if (isOpen && !restaurant.isApproved) {
    throw badRequest('Your restaurant must be approved by an admin before it can open');
  }
  return prisma.restaurant.update({ where: { id: restaurantId }, data: { isOpen } });
}

export { getOwnedRestaurant };

// ---------- Menu categories ----------

async function getOwnedCategory(ownerId: string, categoryId: string) {
  const category = await prisma.menuCategory.findUnique({
    where: { id: categoryId },
    include: { restaurant: { select: { ownerId: true } } },
  });
  if (!category || category.restaurant.ownerId !== ownerId) throw notFound('Category not found');
  return category;
}

export async function createCategory(
  ownerId: string,
  restaurantId: string,
  input: { name: string; sortOrder?: number },
) {
  await getOwnedRestaurant(ownerId, restaurantId);
  return prisma.menuCategory.create({ data: { ...input, restaurantId } });
}

export async function updateCategory(
  ownerId: string,
  categoryId: string,
  input: { name?: string; sortOrder?: number },
) {
  await getOwnedCategory(ownerId, categoryId);
  return prisma.menuCategory.update({ where: { id: categoryId }, data: input });
}

// Items in a deleted category become "uncategorized"; they are not deleted.
export async function deleteCategory(ownerId: string, categoryId: string) {
  await getOwnedCategory(ownerId, categoryId);
  await prisma.menuCategory.delete({ where: { id: categoryId } });
}

// ---------- Menu items ----------

export interface MenuItemInput {
  name: string;
  description?: string;
  price: number;
  isVeg?: boolean;
  isAvailable?: boolean;
  imageUrl?: string;
  categoryId?: string | null;
}

async function assertCategoryBelongs(restaurantId: string, categoryId: string | null | undefined) {
  if (!categoryId) return;
  const category = await prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId } });
  if (!category) throw badRequest('Category does not belong to this restaurant');
}

async function getOwnedItem(ownerId: string, itemId: string) {
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: { restaurant: { select: { ownerId: true } } },
  });
  if (!item || item.restaurant.ownerId !== ownerId) throw notFound('Menu item not found');
  return item;
}

export async function createItem(ownerId: string, restaurantId: string, input: MenuItemInput) {
  await getOwnedRestaurant(ownerId, restaurantId);
  await assertCategoryBelongs(restaurantId, input.categoryId);
  return prisma.menuItem.create({ data: { ...input, restaurantId } });
}

export async function updateItem(ownerId: string, itemId: string, input: Partial<MenuItemInput>) {
  const item = await getOwnedItem(ownerId, itemId);
  await assertCategoryBelongs(item.restaurantId, input.categoryId);
  return prisma.menuItem.update({ where: { id: itemId }, data: input });
}

export async function deleteItem(ownerId: string, itemId: string) {
  await getOwnedItem(ownerId, itemId);
  await prisma.menuItem.delete({ where: { id: itemId } });
}

// ---------- Orders ----------

// Which status the restaurant can move an order to, from each status.
// Riders handle PICKED_UP and DELIVERED (phase 2).
const OWNER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PLACED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['PREPARING'],
  PREPARING: ['READY_FOR_PICKUP'],
};

const orderInclude = {
  items: true,
  customer: { select: { id: true, name: true, phone: true } },
  rider: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.OrderInclude;

export async function listRestaurantOrders(
  ownerId: string,
  restaurantId: string,
  filters: Pagination & { status?: OrderStatus },
) {
  await getOwnedRestaurant(ownerId, restaurantId);
  const where: Prisma.OrderWhereInput = {
    restaurantId,
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, ...toSkipTake(filters) }),
    prisma.order.count({ where }),
  ]);
  return paginated(items, total, filters);
}

export async function updateOrderStatus(ownerId: string, orderId: string, nextStatus: OrderStatus) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { restaurant: { select: { ownerId: true } } },
  });
  if (!order || order.restaurant.ownerId !== ownerId) throw notFound('Order not found');

  const allowed = OWNER_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw badRequest(`Cannot change order from ${order.status} to ${nextStatus}`, { allowed });
  }

  // The status check in `where` stops two parallel requests both succeeding
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: order.status },
    data: {
      status: nextStatus,
      ...(nextStatus === 'ACCEPTED' ? { acceptedAt: new Date() } : {}),
      ...(nextStatus === 'REJECTED' ? { cancelledAt: new Date() } : {}),
    },
  });
  if (count === 0) throw conflict('Order was updated by someone else. Please refresh.');

  return prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
}
