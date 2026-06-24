import client from './client'

// ── types ─────────────────────────────────────────────────────────────────────

export interface AdminVariant {
  id:             string
  color_name:     string
  color_hex:      string
  size:           string
  sku:            string
  price_override: number | null
  stock_quantity: number
  image_url:      string | null
}

export interface AdminProduct {
  id:         string
  slug:       string
  name:       string
  type:       string
  style:      string
  base_price: number
  is_active:  boolean
  variants:   AdminVariant[]
}

export interface AdminOrderItem {
  id:         string
  quantity:   number
  unit_price: number
  set_id:     string | null
  variant: {
    id:         string
    color_name: string
    color_hex:  string
    size:       string
    product:    { name: string; type: string; style: string }
  }
}

export interface AdminAddress {
  full_name:   string | null
  phone:       string | null
  governorate: string | null
  city:        string | null
  street:      string | null
  building:    string | null
  notes:       string | null
}

export interface AdminOrder {
  id:             string
  status:         string
  payment_method: string
  subtotal:       number
  discount:       number
  total:          number
  coupon_code:    string | null
  payment_status: string
  created_at:     string
  customer_email: string | null
  customer_name:  string | null
  customer_phone: string | null
  address:        AdminAddress | null
  items:          AdminOrderItem[]
}

export interface AdminCoupon {
  id:         string
  code:       string
  type:       'percent' | 'fixed'
  value:      number
  active:     boolean
  expires_at: string | null
}

export interface AdminCustomer {
  id:          string
  email:       string
  full_name:   string | null
  phone:       string | null
  order_count: number
  created_at:  string
}

export interface AdminSetting {
  key:   string
  value: string
}

export interface ShippingZone {
  governorate: string
  fee:         number
}

export interface VariantBrief {
  id:            string
  product_name:  string
  color_name:    string
  color_hex:     string
  size:          string
}

export interface AdminReadySet {
  id:                string
  name:              string
  price:             number
  is_active:         boolean
  top_variant_id:    string
  bottom_variant_id: string
  top_variant:       VariantBrief
  bottom_variant:    VariantBrief
}

export interface DashboardSummary {
  total_revenue:        number
  orders_count:         number
  orders_today:         number
  top_selling_variants: TopVariant[]
  low_stock_variants:   LowStockVariant[]
}

export interface TopVariant {
  variant_id:   string
  color_name:   string
  color_hex:    string
  size:         string
  product_name: string
  total_sold:   number
}

export interface LowStockVariant {
  variant_id:   string
  color_name:   string
  color_hex:    string
  size:         string
  product_name: string
  stock:        number
}

// ── API ───────────────────────────────────────────────────────────────────────

export const adminApi = {
  // Dashboard
  getSummary: () =>
    client.get<DashboardSummary>('/api/admin/dashboard/summary').then(r => r.data),

  // Products
  listProducts: () =>
    client.get<AdminProduct[]>('/api/admin/products').then(r => r.data),

  createProduct: (data: Partial<AdminProduct> & { base_price: number }) =>
    client.post<AdminProduct>('/api/admin/products', data).then(r => r.data),

  updateProduct: (id: string, data: { name?: string; base_price?: number; is_active?: boolean }) =>
    client.put<AdminProduct>(`/api/admin/products/${id}`, data).then(r => r.data),

  createVariant: (productId: string, data: Omit<AdminVariant, 'id'>) =>
    client.post<AdminVariant>(`/api/admin/products/${productId}/variants`, data).then(r => r.data),

  updateVariant: (variantId: string, data: { price_override?: number | null; stock_quantity?: number; image_url?: string | null }) =>
    client.put<AdminVariant>(`/api/admin/variants/${variantId}`, data).then(r => r.data),

  // Orders
  listOrders: () =>
    client.get<AdminOrder[]>('/api/admin/orders').then(r => r.data),

  getOrder: (id: string) =>
    client.get<AdminOrder>(`/api/admin/orders/${id}`).then(r => r.data),

  updateOrderStatus: (id: string, status: string) =>
    client.put(`/api/admin/orders/${id}/status`, { status }).then(r => r.data),

  // Customers
  listCustomers: () =>
    client.get<AdminCustomer[]>('/api/admin/customers').then(r => r.data),

  // Coupons
  listCoupons: () =>
    client.get<AdminCoupon[]>('/api/admin/coupons').then(r => r.data),

  createCoupon: (data: { code: string; type: 'percent' | 'fixed'; value: number; expires_at?: string }) =>
    client.post<AdminCoupon>('/api/admin/coupons', data).then(r => r.data),

  toggleCoupon: (id: string) =>
    client.patch(`/api/admin/coupons/${id}/toggle`).then(r => r.data),

  // Settings
  listSettings: () =>
    client.get<AdminSetting[]>('/api/admin/settings').then(r => r.data),

  updateSetting: (key: string, value: string) =>
    client.put<AdminSetting>(`/api/admin/settings/${key}`, { value }).then(r => r.data),

  // Shipping zones
  listShipping: () =>
    client.get<ShippingZone[]>('/api/admin/shipping').then(r => r.data),

  updateShipping: (governorate: string, fee: number) =>
    client.put<ShippingZone>(`/api/admin/shipping/${encodeURIComponent(governorate)}`, { fee }).then(r => r.data),

  // Sets
  listSets: () =>
    client.get<AdminReadySet[]>('/api/admin/sets').then(r => r.data),

  createSet: (data: { name: string; top_variant_id: string; bottom_variant_id: string; price: number }) =>
    client.post<AdminReadySet>('/api/admin/sets', data).then(r => r.data),

  updateSet: (id: string, data: { name?: string; price?: number; is_active?: boolean }) =>
    client.put<AdminReadySet>(`/api/admin/sets/${id}`, data).then(r => r.data),

  deleteSet: (id: string) =>
    client.delete(`/api/admin/sets/${id}`).then(r => r.data),
}
