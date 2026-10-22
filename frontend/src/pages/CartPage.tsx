import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../lib/api';
import { rupees } from '../lib/format';
import type { Address, AddressInput, Order } from '../types';
import { CART_KEY, useCart, useCartActions } from '../hooks/useCart';
import { useToast } from '../components/Toast';
import { Button, EmptyState, ErrorBox, Field, QuantityStepper, Spinner, VegMark } from '../components/ui';

const ADDRESSES_KEY = ['addresses'];

export function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: cart, isLoading, error, refetch } = useCart();
  const { setQuantity } = useCartActions();

  const addressesQuery = useQuery({ queryKey: ADDRESSES_KEY, queryFn: () => api<Address[]>('/users/me/addresses') });
  const [addressId, setAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [notes, setNotes] = useState('');

  // Pick the default address once addresses load
  useEffect(() => {
    const list = addressesQuery.data;
    if (!list) return;
    if (!addressId || !list.some((a) => a.id === addressId)) {
      setAddressId(list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? null);
    }
    if (list.length === 0) setShowAddressForm(true);
  }, [addressesQuery.data, addressId]);

  const placeOrder = useMutation({
    mutationFn: () =>
      api<Order>('/orders', {
        method: 'POST',
        body: { addressId, paymentMethod: 'COD', notes: notes.trim() || undefined },
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: CART_KEY });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast('Order placed! 🎉');
      navigate(`/orders/${order.id}`);
    },
  });

  if (isLoading) return <Spinner />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-8"><ErrorBox message={errorMessage(error)} onRetry={() => refetch()} /></div>;

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState icon="🛒" title="Your cart is empty">
        <Link to="/" className="font-semibold text-brand-600">
          Browse restaurants →
        </Link>
      </EmptyState>
    );
  }

  const unavailable = cart.items.filter((i) => !i.isAvailable);
  const restaurantClosed = cart.restaurant ? !cart.restaurant.isOpen : true;
  const blockReason = restaurantClosed
    ? 'This restaurant is closed right now.'
    : unavailable.length > 0
      ? `Remove unavailable items: ${unavailable.map((i) => i.name).join(', ')}`
      : !addressId
        ? 'Add a delivery address to continue.'
        : null;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {/* Items */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="font-bold">
            Order from{' '}
            {cart.restaurant && (
              <Link to={`/restaurants/${cart.restaurant.id}`} className="text-brand-600">
                {cart.restaurant.name}
              </Link>
            )}
          </h2>
          <ul className="mt-4 divide-y divide-gray-100">
            {cart.items.map((item) => (
              <li key={item.menuItemId} className="flex items-center gap-3 py-3">
                <VegMark isVeg={item.isVeg} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  {!item.isAvailable && <p className="text-xs text-red-600">No longer available</p>}
                </div>
                <QuantityStepper
                  quantity={item.quantity}
                  disabled={setQuantity.isPending}
                  onChange={(quantity) =>
                    setQuantity.mutate(
                      { menuItemId: item.menuItemId, quantity },
                      { onError: (err) => toast(errorMessage(err), 'error') },
                    )
                  }
                />
                <span className="w-20 text-right text-sm font-semibold">{rupees(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-gray-700">Note for the restaurant (optional)</span>
            <textarea
              value={notes}
              maxLength={300}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Less spicy, no onions"
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </section>

        {/* Address */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Delivery address</h2>
            {!showAddressForm && (
              <button onClick={() => setShowAddressForm(true)} className="text-sm font-semibold text-brand-600">
                + Add new
              </button>
            )}
          </div>

          {addressesQuery.isLoading ? (
            <Spinner />
          ) : (
            <div className="mt-4 space-y-3">
              {addressesQuery.data?.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                    a.id === addressId ? 'border-brand-500 bg-brand-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={a.id === addressId}
                    onChange={() => setAddressId(a.id)}
                    className="mt-0.5 accent-brand-500"
                  />
                  <span>
                    <span className="font-semibold">{a.label ?? 'Address'}</span>
                    <span className="block text-gray-600">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {showAddressForm && (
            <AddressForm
              canCancel={(addressesQuery.data?.length ?? 0) > 0}
              onCancel={() => setShowAddressForm(false)}
              onSaved={(a) => {
                setAddressId(a.id);
                setShowAddressForm(false);
              }}
            />
          )}
        </section>
      </div>

      {/* Bill + payment */}
      <aside className="h-fit space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 lg:sticky lg:top-24">
        <h2 className="font-bold">Bill details</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Item total</dt>
            <dd>{rupees(cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Delivery fee</dt>
            <dd>{rupees(cart.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
            <dt>To pay</dt>
            <dd>{rupees(cart.total)}</dd>
          </div>
        </dl>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Payment method</legend>
          <label className="flex items-center gap-3 rounded-lg border border-brand-500 bg-brand-50 p-3 text-sm">
            <input type="radio" checked readOnly className="accent-brand-500" />
            💵 Cash on delivery
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-400">
            <input type="radio" disabled />
            💳 Pay online <span className="ml-auto text-xs">Coming soon</span>
          </label>
        </fieldset>

        {placeOrder.error && <ErrorBox message={errorMessage(placeOrder.error)} />}
        {blockReason && <p className="text-sm text-amber-700">{blockReason}</p>}

        <Button className="w-full" disabled={!!blockReason} loading={placeOrder.isPending} onClick={() => placeOrder.mutate()}>
          Place order · {rupees(cart.total)}
        </Button>
      </aside>
    </div>
  );
}

function AddressForm({
  canCancel,
  onCancel,
  onSaved,
}: {
  canCancel: boolean;
  onCancel: () => void;
  onSaved: (address: Address) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AddressInput>({ label: 'Home', line1: '', line2: '', city: '', state: '', pincode: '' });

  const save = useMutation({
    mutationFn: () =>
      api<Address>('/users/me/addresses', {
        method: 'POST',
        body: { ...form, label: form.label?.trim() || undefined, line2: form.line2?.trim() || undefined },
      }),
    onSuccess: (address) => {
      queryClient.invalidateQueries({ queryKey: ADDRESSES_KEY });
      onSaved(address);
    },
  });

  const update = (key: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
      {save.error && <ErrorBox message={errorMessage(save.error)} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Label" placeholder="Home, Work…" value={form.label} onChange={update('label')} />
        <Field label="Pincode" required inputMode="numeric" maxLength={6} value={form.pincode} onChange={update('pincode')} />
      </div>
      <Field label="House / flat, street" required value={form.line1} onChange={update('line1')} />
      <Field label="Area / landmark (optional)" value={form.line2} onChange={update('line2')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="City" required value={form.city} onChange={update('city')} />
        <Field label="State" required value={form.state} onChange={update('state')} />
      </div>
      <div className="flex justify-end gap-2">
        {canCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={save.isPending}>
          Save address
        </Button>
      </div>
    </form>
  );
}
