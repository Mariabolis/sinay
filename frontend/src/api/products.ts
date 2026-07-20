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
  image_url: string | null
}

export interface ProductImage {
  id: string
  variant_id: string | null
  url: string
  position: number
}

export interface Product {
  id: string
  slug: string
  name: string
  type: 'top' | 'bottom' | 'set'
  style: string
  description: string
  fabric: string
  care_notes: string
  base_price: number
  variants: ProductVariant[]
  images: ProductImage[]
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

export interface SizeGuideTopRow {
  size: string
  chest: string
  length: string
  shoulder: string
}

export interface SizeGuideBottomRow {
  size: string
  waist: string
  hip: string
  inseam: string
}

export interface SizeGuideResponse {
  tops: SizeGuideTopRow[]
  bottoms: SizeGuideBottomRow[]
  sizes: string[]
}

export interface ProductStyleOption {
  key: string
  label: string
}

export interface StoreColor {
  hex: string
  name: string
}

export interface ShippingReturnsCopy {
  free_shipping: string
  delivery: string
  express: string
  returns: string
}

export interface StoreContentResponse {
  product_styles: { top: ProductStyleOption[]; bottom: ProductStyleOption[] }
  store_colors: StoreColor[]
  care_icon_labels: string[]
  shipping_returns_copy: ShippingReturnsCopy
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

export interface ReadySetVariant {
  id:           string
  product_name: string
  style:        string
  color_name:   string
  color_hex:    string
}

export interface ReadySet {
  id:              string
  name:            string
  price:           number
  top_variant:     ReadySetVariant
  bottom_variant:  ReadySetVariant
  available_sizes: string[]
}

export const setsApi = {
  list: () => client.get<ReadySet[]>('/api/sets').then(r => r.data),
}

export interface ShippingZone {
  governorate: string
  fee:         number
}

export const shippingApi = {
  list: () => client.get<ShippingZone[]>('/api/shipping-fees').then(r => r.data),
}

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

  sizeGuide() {
    return client.get<SizeGuideResponse>('/api/size-guide').then(r => r.data)
  },

  storeContent() {
    return client.get<StoreContentResponse>('/api/store-content').then(r => r.data)
  },
}
