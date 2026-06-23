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

  updateVariant: (variantId: string, data: { price_override?: number | null; stock_quantity?: number }) =>
    client.put<AdminVariant>(`/api/admin/variants/${variantId}`, data).then(r => r.data),

  // Orders
  listOrders: () =>
    client.get<AdminOrder[]>('/api/admin/orders').then(r => r.data),

  updateOrderStatus: (id: string, status: string) =>
    client.put(`/api/admin/orders/${id}/status`, { status }).then(r => r.data),

  // Coupons
  listCoupons: () =>
    client.get<AdminCoupon[]>('/api/admin/coupons').then(r => r.data),

  createCoupon: (data: { code: string; type: 'percent' | 'fixed'; value: number; expires_at?: string }) =>
    client.post<AdminCoupon>('/api/admin/coupons', data).then(r => r.data),

  toggleCoupon: (id: string) =>
    client.patch(`/api/admin/coupons/${id}/toggle`).then(r => r.data),
}
