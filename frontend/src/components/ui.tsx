// Small shared UI pieces used across pages.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { OrderStatus } from '../types';
import { STATUS_LABEL } from '../lib/format';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-gray-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-semibold underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="text-5xl">{icon}</div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <div className="mt-2 text-sm text-gray-500">{children}</div>
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-500/50',
    secondary: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:text-gray-400',
    danger: 'border border-red-300 bg-white text-red-600 hover:bg-red-50 disabled:text-red-300',
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

// The green/red square used on Indian food menus
export function VegMark({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 ${
        isVeg ? 'border-green-600' : 'border-red-600'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
    </span>
  );
}

export function QuantityStepper({
  quantity,
  onChange,
  disabled,
}: {
  quantity: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-300 bg-white text-brand-600 shadow-sm">
      <button
        aria-label="Decrease quantity"
        disabled={disabled}
        onClick={() => onChange(quantity - 1)}
        className="px-3 py-1.5 text-lg font-bold leading-none disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-6 text-center text-sm font-semibold text-gray-900">{quantity}</span>
      <button
        aria-label="Increase quantity"
        disabled={disabled || quantity >= 20}
        onClick={() => onChange(quantity + 1)}
        className="px-3 py-1.5 text-lg font-bold leading-none disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  PLACED: 'bg-blue-50 text-blue-700',
  ACCEPTED: 'bg-blue-50 text-blue-700',
  PREPARING: 'bg-amber-50 text-amber-700',
  READY_FOR_PICKUP: 'bg-amber-50 text-amber-700',
  PICKED_UP: 'bg-purple-50 text-purple-700',
  DELIVERED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// Placeholder "image" for restaurants without a photo
const PLACEHOLDER_COLORS = ['from-orange-400 to-rose-500', 'from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500', 'from-sky-400 to-indigo-500'];

export function RestaurantImage({ name, imageUrl, className = '' }: { name: string; imageUrl: string | null; className?: string }) {
  if (imageUrl) return <img src={imageUrl} alt={name} className={`object-cover ${className}`} />;
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const color = PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${color} ${className}`}>
      <span className="text-4xl font-bold text-white/90">{name.charAt(0)}</span>
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        {...props}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
