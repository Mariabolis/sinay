import client from './client'

// ── types ──────────────────────────────────────────────────────────────────────

export interface ProductVariant {
  id: string
  color_name: string
  color_hex: string
  size: string
  sku: string
  stock_quantity: number
  price: number
}

export interface Product {
  id: string
  slug: string
  name: string
  type: 'top' | 'bottom' | 'set'
  style: string
  description: string
  fabric: string
  base_price: number
  variants: ProductVariant[]
}

export interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  per_page: number
}

export interface ColorOption {
  color_name: string
  color_hex: string
}

export interface ProductFilters {
  type?: 'top' | 'bottom'
  style?: string
  color?: string
  size?: string
  page?: number
  per_page?: number
}

// ── API ────────────────────────────────────────────────────────────────────────

export const productsApi = {
  list(filters?: ProductFilters) {
    const params = new URLSearchParams()
    if (filters?.type)     params.set('type',     filters.type)
    if (filters?.style)    params.set('style',    filters.style)
    if (filters?.color)    params.set('color',    filters.color)
    if (filters?.size)     params.set('size',     filters.size)
    if (filters?.page)     params.set('page',     String(filters.page))
    if (filters?.per_page) params.set('per_page', String(filters.per_page))
    const qs = params.toString()
    return client.get<ProductsResponse>(`/api/products${qs ? '?' + qs : ''}`).then(r => r.data)
  },

  get(slug: string) {
    return client.get<Product>(`/api/products/${slug}`).then(r => r.data)
  },

  colors() {
    return client.get<ColorOption[]>('/api/colors').then(r => r.data)
  },
}
