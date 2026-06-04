export type UserRole = "admin" | "manager" | "customer";
export type OrderStatus =
  | "new"
  | "confirmed"
  | "processing"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface Manufacturer {
  id: number;
  name: string;
  country: string | null;
}

export interface UploadedObjectRead {
  key: string;
  url: string;
  content_type: string;
  size: number;
}

export interface ProductCharacteristic {
  material: string | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  load_capacity_kg: number | null;
  volume_l: number | null;
  color: string | null;
  compatibility: string | null;
  warranty_months: number | null;
}

export interface Product {
  id: number;
  article: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  image_url: string;
  price: string;
  old_price: string | null;
  rating: string;
  stock: number;
  is_featured: boolean;
  created_at: string;
  category: Category;
  manufacturer: Manufacturer;
  characteristic?: ProductCharacteristic | null;
  min_quantity?: number | null;
  image_key?: string | null;
}

export interface HomePayload {
  featured_products: Product[];
  latest_products: Product[];
  categories: Category[];
}

export interface PricePoint {
  changed_at: string;
  price: string;
}

export interface ProductPagePayload {
  product: Product;
  price_history: PricePoint[];
}

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  patronymic: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface CartItem {
  id: number;
  slug: string;
  name: string;
  article: string;
  image_url: string;
  price: string;
  quantity: number;
}

export interface OrderAddressInput {
  city: string;
  street: string;
  building: string;
  apartment?: string;
  postal_code?: string;
  comment?: string;
}

export interface OrderPayload {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  comment?: string;
  address: OrderAddressInput;
  items: Array<{ product_id: number; quantity: number }>;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name_snapshot: string;
  quantity: number;
  unit_price: string;
}

export interface Address {
  id: number;
  city: string;
  street: string;
  building: string;
  apartment: string | null;
  postal_code: string | null;
  comment: string | null;
}

export interface Order {
  id: number;
  number: string;
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  comment: string | null;
  total_amount: string;
  payment_url: string | null;
  payment_token: string | null;
  confirmed_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  created_at: string;
  address: Address | null;
  items: OrderItem[];
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
  order_id: number | null;
}

export interface DashboardMetric {
  label: string;
  value: string;
  note: string;
}

export interface StockAlert {
  product_name: string;
  article: string;
  stock: number;
  min_quantity: number;
}

export interface DashboardPayload {
  metrics: DashboardMetric[];
  recent_orders: Order[];
  low_stock: StockAlert[];
}

export interface AdminCategoryCreatePayload {
  name: string;
  slug?: string;
  description?: string | null;
}

export interface AdminManufacturerCreatePayload {
  name: string;
  country?: string | null;
}

export interface AdminProductCreatePayload {
  article: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  price: string;
  old_price?: string | null;
  stock: number;
  is_featured: boolean;
  category_name: string;
  category_slug?: string;
  manufacturer_name: string;
  manufacturer_country?: string;
  image_url?: string;
  image_key?: string;
  material?: string;
  compatibility?: string;
  warranty_months?: number;
  min_quantity?: number;
}
