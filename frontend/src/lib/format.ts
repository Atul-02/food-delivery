import type { OrderStatus } from '../types';

// 24000 paise -> "₹240", 24050 -> "₹240.50"
export function rupees(paise: number): string {
  const value = paise / 100;
  return '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function titleCase(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Order placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for pickup',
  PICKED_UP: 'Out for delivery',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected by restaurant',
  CANCELLED: 'Cancelled',
};
