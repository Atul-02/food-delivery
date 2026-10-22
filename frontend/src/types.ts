// Shapes of the data the backend API returns.
// All money values are in paise (24000 = Rs 240).

export type Role = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'RIDER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  cuisines: string[];
  imageUrl: string | null;
  addressLine: string;
  city: string;
  pincode: string;
  isOpen: boolean;
  avgRating: number;
  ratingCount: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface Menu {
  categories: MenuCategory[];
  uncategorized: MenuItem[];
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  restaurant: { id: string; name: string; isOpen: boolean; imageUrl: string | null } | null;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export interface Address {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, 'id' | 'isDefault' | 'label' | 'line2'> & {
  label?: string;
  line2?: string;
};

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

export interface Order {
  id: string;
  status: OrderStatus;
  paymentMethod: 'COD' | 'ONLINE';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  notes: string | null;
  createdAt: string;
  acceptedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  deliveryAddress: {
    label: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  items: { id: string; name: string; price: number; quantity: number }[];
  restaurant: { id: string; name: string; imageUrl: string | null; addressLine: string };
  rider: { id: string; name: string; phone: string | null } | null;
}
