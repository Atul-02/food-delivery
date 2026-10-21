import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { badRequest, conflict, notFound } from '../../utils/httpError';

function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} });
}

// When the last item is removed, the cart is no longer tied to a restaurant
async function resetIfEmpty(cartId: string) {
  const remaining = await prisma.cartItem.count({ where: { cartId } });
  if (remaining === 0) {
    await prisma.cart.update({ where: { id: cartId }, data: { restaurantId: null, couponCode: null } });
  }
}

export async function getCart(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      restaurant: { select: { id: true, name: true, isOpen: true, imageUrl: true } },
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          menuItem: { select: { id: true, name: true, price: true, isVeg: true, isAvailable: true, imageUrl: true } },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return { restaurant: null, items: [], subtotal: 0, deliveryFee: 0, total: 0 };
  }

  const items = cart.items.map((i) => ({
    menuItemId: i.menuItemId,
    name: i.menuItem.name,
    price: i.menuItem.price,
    isVeg: i.menuItem.isVeg,
    isAvailable: i.menuItem.isAvailable,
    imageUrl: i.menuItem.imageUrl,
    quantity: i.quantity,
    lineTotal: i.menuItem.price * i.quantity,
  }));
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const deliveryFee = env.DELIVERY_FEE_PAISE;

  return { restaurant: cart.restaurant, items, subtotal, deliveryFee, total: subtotal + deliveryFee };
}

export async function addItem(userId: string, input: { menuItemId: string; quantity: number; replaceCart: boolean }) {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: input.menuItemId },
    include: { restaurant: { select: { isApproved: true } } },
  });
  if (!menuItem || !menuItem.restaurant.isApproved) throw notFound('Menu item not found');
  if (!menuItem.isAvailable) throw badRequest('This item is currently unavailable');

  const cart = await getOrCreateCart(userId);
  const itemCount = await prisma.cartItem.count({ where: { cartId: cart.id } });
  const isOtherRestaurant = itemCount > 0 && cart.restaurantId !== menuItem.restaurantId;

  if (isOtherRestaurant && !input.replaceCart) {
    throw conflict('Your cart has items from another restaurant. Send replaceCart: true to clear it.', {
      code: 'CART_RESTAURANT_MISMATCH',
    });
  }

  await prisma.$transaction(async (tx) => {
    if (isOtherRestaurant) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    await tx.cart.update({
      where: { id: cart.id },
      data: { restaurantId: menuItem.restaurantId, ...(isOtherRestaurant ? { couponCode: null } : {}) },
    });
    await tx.cartItem.upsert({
      where: { cartId_menuItemId: { cartId: cart.id, menuItemId: menuItem.id } },
      create: { cartId: cart.id, menuItemId: menuItem.id, quantity: input.quantity },
      update: { quantity: { increment: input.quantity } },
    });
  });

  return getCart(userId);
}

export async function setItemQuantity(userId: string, menuItemId: string, quantity: number) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  const cartItem = cart
    ? await prisma.cartItem.findUnique({ where: { cartId_menuItemId: { cartId: cart.id, menuItemId } } })
    : null;
  if (!cart || !cartItem) throw notFound('Item is not in your cart');

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: cartItem.id } });
    await resetIfEmpty(cart.id);
  } else {
    await prisma.cartItem.update({ where: { id: cartItem.id }, data: { quantity } });
  }
  return getCart(userId);
}

export function removeItem(userId: string, menuItemId: string) {
  return setItemQuantity(userId, menuItemId, 0);
}

export async function clearCart(userId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await resetIfEmpty(cart.id);
}
