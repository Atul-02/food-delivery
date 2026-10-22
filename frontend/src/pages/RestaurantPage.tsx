import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError, errorMessage } from '../lib/api';
import { rupees, titleCase } from '../lib/format';
import type { Menu, MenuItem, Restaurant } from '../types';
import { useAuth } from '../auth/AuthContext';
import { useCart, useCartActions } from '../hooks/useCart';
import { useToast } from '../components/Toast';
import { Button, ErrorBox, Modal, QuantityStepper, RestaurantImage, Spinner, VegMark } from '../components/ui';
import { Rating } from './HomePage';

export function RestaurantPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { data: cart } = useCart();
  const { addItem, setQuantity } = useCartActions();
  // Item waiting for "replace your cart?" confirmation
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);

  const restaurantQuery = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => api<Restaurant>(`/restaurants/${id}`),
  });
  const menuQuery = useQuery({
    queryKey: ['menu', id],
    queryFn: () => api<Menu>(`/restaurants/${id}/menu`),
  });

  if (restaurantQuery.isLoading || menuQuery.isLoading) return <Spinner />;
  if (restaurantQuery.error || menuQuery.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ErrorBox message={errorMessage(restaurantQuery.error ?? menuQuery.error)} />
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand-600">
          ← Back to restaurants
        </Link>
      </div>
    );
  }

  const restaurant = restaurantQuery.data!;
  const menu = menuQuery.data!;
  const sections = [
    ...menu.categories.filter((c) => c.items.length > 0),
    ...(menu.uncategorized.length ? [{ id: 'other', name: 'Other', items: menu.uncategorized }] : []),
  ];

  const quantityInCart = (itemId: string) => cart?.items.find((i) => i.menuItemId === itemId)?.quantity ?? 0;
  const busy = addItem.isPending || setQuantity.isPending;

  const add = async (item: MenuItem, replaceCart = false) => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (user.role !== 'CUSTOMER') {
      toast('Only customer accounts can order food.', 'error');
      return;
    }
    try {
      await addItem.mutateAsync({ menuItemId: item.id, replaceCart });
      setPendingItem(null);
    } catch (err) {
      if (err instanceof ApiError && err.details?.code === 'CART_RESTAURANT_MISMATCH') {
        setPendingItem(item);
      } else {
        toast(errorMessage(err), 'error');
      }
    }
  };

  const changeQuantity = (item: MenuItem, quantity: number) =>
    setQuantity.mutate({ menuItemId: item.id, quantity }, { onError: (err) => toast(errorMessage(err), 'error') });

  const cartHasThisRestaurant = cart?.restaurant?.id === restaurant.id && cart.items.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28">
      <Link to="/" className="text-sm font-semibold text-brand-600">
        ← All restaurants
      </Link>

      <header className="mt-4 flex gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <RestaurantImage name={restaurant.name} imageUrl={restaurant.imageUrl} className="h-24 w-24 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            <Rating value={restaurant.avgRating} count={restaurant.ratingCount} />
          </div>
          <p className="mt-1 text-sm text-gray-600">{restaurant.cuisines.map(titleCase).join(', ')}</p>
          {restaurant.description && <p className="mt-1 text-sm text-gray-500">{restaurant.description}</p>}
          <p className="mt-1 text-xs text-gray-400">
            {restaurant.addressLine}, {restaurant.city}
          </p>
          {!restaurant.isOpen && (
            <p className="mt-2 inline-block rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
              Currently closed – you can browse, but not order
            </p>
          )}
        </div>
      </header>

      {sections.length === 0 && <p className="mt-8 text-center text-gray-500">This restaurant has not added a menu yet.</p>}

      {sections.map((section) => (
        <section key={section.id} className="mt-8">
          <h2 className="text-lg font-bold">
            {section.name} <span className="font-normal text-gray-400">({section.items.length})</span>
          </h2>
          <ul className="mt-3 divide-y divide-gray-200 rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            {section.items.map((item) => {
              const qty = quantityInCart(item.id);
              const canOrder = restaurant.isOpen && item.isAvailable;
              return (
                <li key={item.id} className={`flex items-center gap-4 p-4 ${item.isAvailable ? '' : 'opacity-50'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <VegMark isVeg={item.isVeg} />
                      <h3 className="font-medium">{item.name}</h3>
                    </div>
                    <p className="mt-1 text-sm font-semibold">{rupees(item.price)}</p>
                    {item.description && <p className="mt-1 text-sm text-gray-500">{item.description}</p>}
                    {!item.isAvailable && <p className="mt-1 text-xs font-medium text-red-600">Currently unavailable</p>}
                  </div>
                  {qty > 0 ? (
                    <QuantityStepper quantity={qty} disabled={busy} onChange={(n) => changeQuantity(item, n)} />
                  ) : (
                    <Button variant="secondary" disabled={!canOrder || busy} onClick={() => add(item)} className="!text-brand-600">
                      ADD
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {cartHasThisRestaurant && cart && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <span className="text-sm font-semibold">
              {cart.items.reduce((n, i) => n + i.quantity, 0)} items · {rupees(cart.subtotal)}
            </span>
            <Link to="/cart" className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              View cart →
            </Link>
          </div>
        </div>
      )}

      {pendingItem && (
        <Modal title="Start a new cart?" onClose={() => setPendingItem(null)}>
          <p className="text-sm text-gray-600">
            Your cart has items from <strong>{cart?.restaurant?.name ?? 'another restaurant'}</strong>. Adding this item will
            clear it.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPendingItem(null)}>
              Keep current cart
            </Button>
            <Button loading={addItem.isPending} onClick={() => add(pendingItem, true)}>
              Start new cart
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
