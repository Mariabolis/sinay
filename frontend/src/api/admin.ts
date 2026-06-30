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

export interface AdminVariantInput {
  id?:            string         // absent for new variants
  color_name:     string
  color_hex:      string
  size:           string
  sku:            string
  price_override: number | null
  stock_quantity: number
  image_url:      string | null
}

export interface AdminProduct {
  id:          string
  slug:        string
  name:        string
  type:        string
  style:       string
  description: string
  fabric:      string
  care_notes:  string
  base_price:  number
  is_active:   boolean
  variants:    AdminVariant[]
}

export interface AdminProductsListResponse {
  products: AdminProduct[]
  total:    number
  page:     number
  per_page: number
}

export interface AdminProductInput {
  name:        string
  slug?:       string
  type:        string
  style:       string
  description: string
  fabric:      string
  care_notes:  string
  base_price:  number
  is_active?:  boolean
  variants:    AdminVariantInput[]
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
    image_url:  string | null
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
  shipping_fee:   number
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

export interface AdminOrdersListResponse {
  orders:   AdminOrder[]
  total:    number
  page:     number
  per_page: number
}

export interface InventoryItem {
  variant_id:     string
  product_id:     string
  product_name:   string
  style:          string
  color_name:     string
  color_hex:      string
  size:           string
  sku:            string
  stock_quantity: number
  is_low_stock:   boolean
  is_out_of_stock: boolean
}

export interface InventoryResponse {
  items:     InventoryItem[]
  threshold: number
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
  total_spend: number
  created_at:  string
}

export interface AdminCustomersListResponse {
  customers: AdminCustomer[]
  total:     number
  page:      number
  per_page:  number
}

export interface AdminCustomerAddress {
  id:          string
  label:       string | null
  full_name:   string | null
  phone:       string | null
  governorate: string | null
  city:        string | null
  street:      string | null
  building:    string | null
  notes:       string | null
  is_default:  boolean
}

export interface AdminCustomerDetail extends AdminCustomer {
  addresses: AdminCustomerAddress[]
  orders:    AdminOrder[]
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
  listProducts: (params?: { page?: number; per_page?: number; search?: string; style?: string }) => {
    const qs = new URLSearchParams()
    if (params?.page)     qs.set('page',     String(params.page))
    if (params?.per_page) qs.set('per_page', String(params.per_page))
    if (params?.search)   qs.set('search',   params.search)
    if (params?.style)    qs.set('style',    params.style)
    const q = qs.toString()
    return client.get<AdminProductsListResponse>(`/api/admin/products${q ? '?' + q : ''}`).then(r => r.data)
  },

  getProduct: (id: string) =>
    client.get<AdminProduct>(`/api/admin/products/${id}`).then(r => r.data),

  createProduct: (data: AdminProductInput) =>
    client.post<AdminProduct>('/api/admin/products', data).then(r => r.data),

  updateProduct: (id: string, data: Partial<AdminProductInput> & { is_active?: boolean }) =>
    client.put<AdminProduct>(`/api/admin/products/${id}`, data).then(r => r.data),

  deleteProduct: (id: string) =>
    client.delete(`/api/admin/products/${id}`).then(r => r.data),

  createVariant: (productId: string, data: Omit<AdminVariant, 'id'>) =>
    client.post<AdminVariant>(`/api/admin/products/${productId}/variants`, data).then(r => r.data),

  updateVariant: (variantId: string, data: { price_override?: number | null; stock_quantity?: number; image_url?: string | null }) =>
    client.put<AdminVariant>(`/api/admin/variants/${variantId}`, data).then(r => r.data),

  deleteVariant: (variantId: string) =>
    client.delete(`/api/admin/variants/${variantId}`).then(r => r.data),

  // Inventory
  listInventory: () =>
    client.get<InventoryResponse>('/api/admin/inventory').then(r => r.data),

  updateStock: (variantId: string, stockQuantity: number) =>
    client.put<{ stock_quantity: number; is_out_of_stock: boolean; is_low_stock: boolean }>(
      `/api/admin/inventory/${variantId}`,
      { stock_quantity: stockQuantity },
    ).then(r => r.data),

  // Orders
  listOrders: (params?: {
    page?: number; per_page?: number
    status?: string; payment_method?: string
    date_from?: string; date_to?: string
    search?: string; sort?: 'asc' | 'desc'
  }) => {
    const qs = new URLSearchParams()
    if (params?.page)           qs.set('page',           String(params.page))
    if (params?.per_page)       qs.set('per_page',       String(params.per_page))
    if (params?.status)         qs.set('status',         params.status)
    if (params?.payment_method) qs.set('payment_method', params.payment_method)
    if (params?.date_from)      qs.set('date_from',      params.date_from)
    if (params?.date_to)        qs.set('date_to',        params.date_to)
    if (params?.search)         qs.set('search',         params.search)
    if (params?.sort)           qs.set('sort',           params.sort)
    const q = qs.toString()
    return client.get<AdminOrdersListResponse>(`/api/admin/orders${q ? '?' + q : ''}`).then(r => r.data)
  },

  getOrder: (id: string) =>
    client.get<AdminOrder>(`/api/admin/orders/${id}`).then(r => r.data),

  updateOrderStatus: (id: string, status: string) =>
    client.put<{ status: string; previous: string }>(`/api/admin/orders/${id}/status`, { status }).then(r => r.data),

  // Customers
  listCustomers: (params?: {
    page?: number; per_page?: number
    search?: string; sort?: string; sort_dir?: 'asc' | 'desc'
  }) => {
    const qs = new URLSearchParams()
    if (params?.page)     qs.set('page',     String(params.page))
    if (params?.per_page) qs.set('per_page', String(params.per_page))
    if (params?.search)   qs.set('search',   params.search)
    if (params?.sort)     qs.set('sort',     params.sort)
    if (params?.sort_dir) qs.set('sort_dir', params.sort_dir)
    const q = qs.toString()
    return client.get<AdminCustomersListResponse>(`/api/admin/customers${q ? '?' + q : ''}`).then(r => r.data)
  },

  getCustomer: (id: string) =>
    client.get<AdminCustomerDetail>(`/api/admin/customers/${id}`).then(r => r.data),

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

  // Image upload — let axios set Content-Type automatically so the multipart
  // boundary is included; manually setting it strips the boundary and breaks parsing.
  uploadImage: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const r = await client.post<{ url: string }>('/api/admin/upload', form)
    return r.data.url
  },
}
