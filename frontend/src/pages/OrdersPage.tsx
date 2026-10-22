import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '../lib/api';
import { formatDateTime, rupees } from '../lib/format';
import type { Order, Paginated } from '../types';
import { EmptyState, ErrorBox, RestaurantImage, Spinner, StatusBadge } from '../components/ui';

export function OrdersPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api<Paginated<Order>>('/orders?limit=50'),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Your orders</h1>

      {error && (
        <div className="mt-4">
          <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />
        </div>
      )}

      {data?.items.length === 0 && (
        <EmptyState icon="🧾" title="No orders yet">
          <Link to="/" className="font-semibold text-brand-600">
            Order something tasty →
          </Link>
        </EmptyState>
      )}

      <ul className="mt-6 space-y-4">
        {data?.items.map((order) => (
          <li key={order.id}>
            <Link
              to={`/orders/${order.id}`}
              className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 transition hover:shadow-md"
            >
              <RestaurantImage name={order.restaurant.name} imageUrl={order.restaurant.imageUrl} className="h-16 w-16 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">{order.restaurant.name}</h2>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 truncate text-sm text-gray-600">
                  {order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatDateTime(order.createdAt)} · {rupees(order.total)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
