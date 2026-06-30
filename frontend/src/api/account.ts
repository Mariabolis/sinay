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
}

export const ordersApi = {
  list: () => client.get<Order[]>('/api/orders').then(r => r.data),
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  id:        string
  email:     string
  full_name: string
  role:      string
}

export const profileApi = {
  update: (data: { full_name?: string; phone?: string }) =>
    client.put<UserProfile>('/api/auth/me', data).then(r => r.data),
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
  delete: (id: string) =>
    client.delete(`/api/addresses/${id}`).then(r => r.data),
}
