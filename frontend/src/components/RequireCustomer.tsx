import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, Spinner } from './ui';

// Wraps pages that only logged-in customers can see (cart, orders)
export function RequireCustomer({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (user.role !== 'CUSTOMER') {
    return (
      <EmptyState icon="🔒" title="This page is for customers">
        You are logged in as {user.role.replace('_', ' ').toLowerCase()}.
      </EmptyState>
    );
  }
  return <>{children}</>;
}
