import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../lib/api';
import { formatDateTime, rupees, STATUS_LABEL } from '../lib/format';
import type { Order, OrderStatus } from '../types';
import { useToast } from '../components/Toast';
import { Button, ErrorBox, Modal, Spinner, StatusBadge } from '../components/ui';

const STEPS: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'];
const FINISHED: OrderStatus[] = ['DELIVERED', 'REJECTED', 'CANCELLED'];
const CANCELLABLE: OrderStatus[] = ['PLACED', 'ACCEPTED'];

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api<Order>(`/orders/${id}`),
    // Check for status updates every 10 seconds until the order is finished.
    // (Phase 2 replaces this with live updates over WebSockets.)
    refetchInterval: (query) => (query.state.data && FINISHED.includes(query.state.data.status) ? false : 10_000),
  });

  const cancel = useMutation({
    mutationFn: () => api<Order>(`/orders/${id}/cancel`, { method: 'POST' }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setConfirmCancel(false);
      toast('Order cancelled');
    },
    onError: (err) => {
      setConfirmCancel(false);
      toast(errorMessage(err), 'error');
      refetch();
    },
  });

  if (isLoading) return <Spinner />;
  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />
      </div>
    );
  }

  const currentStep = STEPS.indexOf(order.status);
  const addr = order.deliveryAddress;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link to="/orders" className="text-sm font-semibold text-brand-600">
        ← All orders
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.restaurant.name}</h1>
          <p className="text-sm text-gray-500">
            Order #{order.id.slice(-8).toUpperCase()} · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      {/* Progress */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        {order.status === 'REJECTED' || order.status === 'CANCELLED' ? (
          <p className="font-semibold text-red-700">
            {order.status === 'REJECTED' ? 'The restaurant could not accept this order.' : 'This order was cancelled.'}
          </p>
        ) : (
          <ol className="space-y-4">
            {STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <li key={step} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                    } ${active && step !== 'DELIVERED' ? 'ring-4 ring-green-100' : ''}`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span className={`text-sm ${done ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{STATUS_LABEL[step]}</span>
                </li>
              );
            })}
          </ol>
        )}
        {!FINISHED.includes(order.status) && (
          <p className="mt-4 text-xs text-gray-400">This page updates automatically.</p>
        )}
      </section>

      {/* Items + bill */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-bold">Items</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{rupees(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-gray-200 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Item total</dt>
            <dd>{rupees(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Delivery fee</dt>
            <dd>{rupees(order.deliveryFee)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Discount</dt>
              <dd>−{rupees(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-1 text-base font-bold">
            <dt>Total</dt>
            <dd>{rupees(order.total)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-gray-500">
          Payment: {order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online'}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-gray-200">
        <h2 className="font-bold">Delivering to</h2>
        <p className="mt-2 text-gray-700">
          {addr.label && <span className="font-semibold">{addr.label}: </span>}
          {addr.line1}
          {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} {addr.pincode}
        </p>
        {order.notes && <p className="mt-2 text-gray-500">Note: {order.notes}</p>}
      </section>

      {CANCELLABLE.includes(order.status) && (
        <Button variant="danger" onClick={() => setConfirmCancel(true)}>
          Cancel order
        </Button>
      )}

      {confirmCancel && (
        <Modal title="Cancel this order?" onClose={() => setConfirmCancel(false)}>
          <p className="text-sm text-gray-600">You can only cancel before the restaurant starts preparing your food.</p>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep order
            </Button>
            <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>
              Yes, cancel
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
