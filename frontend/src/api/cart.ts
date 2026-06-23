import client from './client'

export interface CartProduct {
  id: string
  name: string
  slug: string
  type: 'top' | 'bottom' | 'set'
  style: string
}

export interface CartVariant {
  id: string
  color_name: string
  color_hex: string
  size: string
  product: CartProduct
}

export interface CartItem {
  id: string
  variant_id: string
  quantity: number
  set_id: string | null
  unit_price: number
  variant: CartVariant
}

export interface CartResponse {
  cart_id: string
  items: CartItem[]
  item_count: number
  subtotal: number
  coupon_code: string | null
  discount: number
  total: number
}

export const cartApi = {
  get: () =>
    client.get<CartResponse>('/api/cart').then(r => r.data),

  addSet: (topVariantId: string, bottomVariantId: string) =>
    client
      .post<CartResponse>('/api/cart/sets', {
        top_variant_id:    topVariantId,
        bottom_variant_id: bottomVariantId,
      })
      .then(r => r.data),

  addItem: (variantId: string, quantity = 1) =>
    client
      .post<CartResponse>('/api/cart/items', { variant_id: variantId, quantity })
      .then(r => r.data),

  updateItem: (itemId: string, quantity: number) =>
    client
      .put<CartResponse>(`/api/cart/items/${itemId}`, { quantity })
      .then(r => r.data),

  removeItem: (itemId: string) =>
    client.delete<CartResponse>(`/api/cart/items/${itemId}`).then(r => r.data),

  applyCoupon: (code: string) =>
    client.post<CartResponse>('/api/cart/coupon', { code }).then(r => r.data),

  removeCoupon: () =>
    client.delete<CartResponse>('/api/cart/coupon').then(r => r.data),
}
