import type { PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { badRequest, conflict, notFound } from '../../utils/httpError';
import { paginated, toSkipTake, type Pagination } from '../../utils/pagination';

const orderInclude = {
  items: true,
  restaurant: { select: { id: true, name: true, imageUrl: true, addressLine: true } },
  rider: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.OrderInclude;

// Customers can cancel only before the kitchen starts cooking
const CANCELLABLE_STATUSES = ['PLACED', 'ACCEPTED'] as const;

export async function placeOrder(
  customerId: string,
  input: { addressId: string; paymentMethod: PaymentMethod; notes?: string },
) {
  if (input.paymentMethod === 'ONLINE') {
    // Razorpay checkout is built in phase 2
    throw badRequest('Online payment is not available yet. Please choose Cash on Delivery.');
  }

  const address = await prisma.address.findFirst({ where: { id: input.addressId, userId: customerId } });
  if (!address) throw notFound('Address not found');

  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId: customerId },
      include: { restaurant: true, items: { include: { menuItem: true } } },
    });
    if (!cart || cart.items.length === 0 || !cart.restaurant) throw badRequest('Your cart is empty');

    const restaurant = cart.restaurant;
    if (!restaurant.isApproved || !restaurant.isOpen) {
      throw badRequest('This restaurant is not accepting orders right now');
    }

    const unavailable = cart.items.filter((i) => !i.menuItem.isAvailable || i.menuItem.restaurantId !== restaurant.id);
    if (unavailable.length > 0) {
      throw badRequest('Some items in your cart are no longer available', {
        items: unavailable.map((i) => i.menuItem.name),
      });
    }

    // Always price from the database, never from the client
    const subtotal = cart.items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
    const deliveryFee = env.DELIVERY_FEE_PAISE;

    const order = await tx.order.create({
      data: {
        customerId,
        restaurantId: restaurant.id,
        deliveryAddress: {
          label: address.label,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          lat: address.lat,
          lng: address.lng,
        },
        paymentMethod: input.paymentMethod,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        notes: input.notes,
        items: {
          create: cart.items.map((i) => ({
            menuItemId: i.menuItemId,
            name: i.menuItem.name,
            price: i.menuItem.price,
            quantity: i.quantity,
          })),
        },
      },
      include: orderInclude,
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { restaurantId: null, couponCode: null } });

    return order;
  });
}

export async function listMyOrders(customerId: string, pagination: Pagination) {
  const where = { customerId };
  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, ...toSkipTake(pagination) }),
    prisma.order.count({ where }),
  ]);
  return paginated(items, total, pagination);
}

export async function getMyOrder(customerId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, customerId }, include: orderInclude });
  if (!order) throw notFound('Order not found');
  return order;
}

export async function cancelOrder(customerId: string, orderId: string) {
  const order = await getMyOrder(customerId, orderId);

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, customerId, status: { in: [...CANCELLABLE_STATUSES] } },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
  if (count === 0) {
    throw conflict(`Order cannot be cancelled once it is ${order.status}`);
  }

  return getMyOrder(customerId, orderId);
}
