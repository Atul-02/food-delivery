import { Link, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../hooks/useCart';

export function Navbar() {
  const { user, logout } = useAuth();
  const { data: cart } = useCart();
  const navigate = useNavigate();
  const cartCount = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium ${isActive ? 'text-brand-600' : 'text-gray-700 hover:text-brand-600'}`;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold text-brand-500">
          <span aria-hidden>🍔</span> QuickBite
        </Link>

        <nav className="flex items-center gap-5">
          {user?.role === 'CUSTOMER' && (
            <>
              <NavLink to="/orders" className={linkClass}>
                Orders
              </NavLink>
              <NavLink to="/cart" className={linkClass}>
                <span className="relative inline-flex items-center gap-1">
                  Cart
                  {cartCount > 0 && (
                    <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-xs font-bold text-white">{cartCount}</span>
                  )}
                </span>
              </NavLink>
            </>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-gray-500 sm:inline">Hi, {user.name.split(' ')[0]}</span>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="text-sm font-medium text-gray-700 hover:text-brand-600"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>
                Log in
              </NavLink>
              <Link
                to="/register"
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
