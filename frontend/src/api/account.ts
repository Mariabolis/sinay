import client from './client'

// ── Orders ────────────────────────────────────────────────────────────────────

export interface OrderVariant {
  id:         string
  color_name: string
  color_hex:  string
  size:       string
  product:    { name: string; type: string; style: string }
}

export interface OrderItem {
  id:         string
  quantity:   number
  unit_price: number
  set_id:     string | null
  variant:    OrderVariant
}

export interface OrderAddress {
  full_name:   string | null
  phone:       string | null
  governorate: string | null
  city:        string | null
  street:      string | null
  building:    string | null
  notes:       string | null
}

export interface Order {
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
  items:          OrderItem[]
  address:        OrderAddress | null
}

export const ordersApi = {
  list: () => client.get<Order[]>('/api/orders').then(r => r.data),
  get:  (id: string) => client.get<Order>(`/api/orders/${id}`).then(r => r.data),
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  id:        string
  email:     string
  full_name: string
  role:      string
}

export const profileApi = {
  update: (data: { full_name?: string; phone?: string; email?: string; current_password?: string }) =>
    client.put<UserProfile>('/api/auth/me', data).then(r => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    client
      .put<{ message: string }>('/api/auth/password', {
        current_password: currentPassword,
        new_password:      newPassword,
      })
      .then(r => r.data),
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export interface Address {
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

export interface AddressInput {
  label?:      string
  full_name:   string
  phone:       string
  governorate: string
  city:        string
  street:      string
  building?:   string
  notes?:      string
  is_default?: boolean
}

export const addressesApi = {
  list:   () =>
    client.get<Address[]>('/api/addresses').then(r => r.data),
  create: (data: AddressInput) =>
    client.post<Address>('/api/addresses', data).then(r => r.data),
  update: (id: string, data: AddressInput) =>
    client.put<Address>(`/api/addresses/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    client.delete(`/api/addresses/${id}`).then(r => r.data),
}

// ── Saved sets ────────────────────────────────────────────────────────────────

export interface SavedSetVariant {
  id:         string
  color_name: string
  color_hex:  string
  size:       string
  price:      number
  image_url:  string | null
  product:    { name: string; slug: string; type: string; style: string }
}

export interface SavedSet {
  id:     string
  top:    SavedSetVariant
  bottom: SavedSetVariant
}

export const savedSetsApi = {
  list: () => client.get<SavedSet[]>('/api/saved-sets').then(r => r.data),

  create: (topVariantId: string, bottomVariantId: string) =>
    client
      .post<SavedSet>('/api/saved-sets', { top_variant_id: topVariantId, bottom_variant_id: bottomVariantId })
      .then(r => r.data),

  remove: (id: string) => client.delete(`/api/saved-sets/${id}`).then(r => r.data),
}
