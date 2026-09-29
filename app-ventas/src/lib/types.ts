export type Plan = 'free' | 'pro';

export type Store = {
  id: string;
  name: string;
  slug: string;
  whatsapp: string | null;
  plan: Plan;
};

export type Product = {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  stock: number;
  low_stock_threshold: number;
  image_url: string | null;
  active: boolean;
  created_at: string;
};

export const ORDER_STATUSES = ['pendiente', 'pagado', 'entregado', 'cancelado'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
};

export type Order = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  status: OrderStatus;
  total: number;
  notes: string | null;
  source: 'app' | 'web';
  created_at: string;
  order_items?: OrderItem[];
};

// Límites del plan gratis. El plan Pro no tiene límites.
// Se validan también en la base (enforce_free_limits en supabase/schema.sql).
export const FREE_LIMITS = {
  products: 15,
  ordersPerMonth: 30,
};
