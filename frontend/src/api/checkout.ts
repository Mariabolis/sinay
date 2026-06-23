import client from './client'

// ── address ───────────────────────────────────────────────────────────────────

export interface Address {
  id: string
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
  label?:       string
  full_name:    string
  phone:        string
  governorate:  string
  city:         string
  street:       string
  building?:    string
  notes?:       string
  is_default?:  boolean
  save_address?: boolean
}

// ── checkout ──────────────────────────────────────────────────────────────────

export interface CheckoutRequest {
  address_id?:     string
  address?:        AddressInput
  payment_method?: 'card' | 'cod'
}

export interface CheckoutResponse {
  order_id:           string
  paymob_iframe_url?: string  // only present when payment_method='card'
}

// ── order ─────────────────────────────────────────────────────────────────────

export interface OrderVariant {
  id:         string
  color_name: string
  color_hex:  string
  size:       string
  product: {
    name:  string
    type:  string
    style: string
  }
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
  status:         string   // pending | paid | cancelled | processing | shipped | delivered
  payment_method: string   // card | cod
  subtotal:       number
  discount:       number
  total:          number
  coupon_code:    string | null
  items:          OrderItem[]
  payment_status: string   // initiated | success | failed | refunded
  created_at:     string
}

// ── API ───────────────────────────────────────────────────────────────────────

export const checkoutApi = {
  listAddresses: () =>
    client.get<Address[]>('/api/addresses').then(r => r.data),

  createAddress: (data: AddressInput) =>
    client.post<Address>('/api/addresses', data).then(r => r.data),

  deleteAddress: (id: string) =>
    client.delete(`/api/addresses/${id}`),

  checkout: (req: CheckoutRequest) =>
    client.post<CheckoutResponse>('/api/checkout', req).then(r => r.data),

  getOrder: (orderId: string) =>
    client.get<Order>(`/api/orders/${orderId}`).then(r => r.data),
}
