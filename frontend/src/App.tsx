import { Link, Route, Routes } from 'react-router';
import { Navbar } from './components/Navbar';
import { RequireCustomer } from './components/RequireCustomer';
import { EmptyState } from './components/ui';
import { HomePage } from './pages/HomePage';
import { RestaurantPage } from './pages/RestaurantPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { CartPage } from './pages/CartPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';

export function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/restaurants/:id" element={<RestaurantPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cart" element={<RequireCustomer><CartPage /></RequireCustomer>} />
          <Route path="/orders" element={<RequireCustomer><OrdersPage /></RequireCustomer>} />
          <Route path="/orders/:id" element={<RequireCustomer><OrderDetailPage /></RequireCustomer>} />
          <Route
            path="*"
            element={
              <EmptyState icon="🤔" title="Page not found">
                <Link to="/" className="font-semibold text-brand-600">
                  Go home
                </Link>
              </EmptyState>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
