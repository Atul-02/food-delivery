import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type { Cart } from '../types';

export const CART_KEY = ['cart'];

export function useCart() {
  const { user } = useAuth();
  return useQuery({
    queryKey: CART_KEY,
    queryFn: () => api<Cart>('/cart'),
    enabled: user?.role === 'CUSTOMER',
  });
}

// Every cart endpoint returns the updated cart, so we drop it straight into the cache
export function useCartActions() {
  const queryClient = useQueryClient();
  const setCart = (cart: Cart) => queryClient.setQueryData(CART_KEY, cart);

  const addItem = useMutation({
    mutationFn: (input: { menuItemId: string; quantity?: number; replaceCart?: boolean }) =>
      api<Cart>('/cart/items', { method: 'POST', body: input }),
    onSuccess: setCart,
  });

  const setQuantity = useMutation({
    mutationFn: ({ menuItemId, quantity }: { menuItemId: string; quantity: number }) =>
      api<Cart>(`/cart/items/${menuItemId}`, { method: 'PATCH', body: { quantity } }),
    onSuccess: setCart,
  });

  return { addItem, setQuantity };
}
