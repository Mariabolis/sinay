import type { Product } from '../api/products'

export interface RecentlyViewedItem {
  id:        string
  slug:      string
  name:      string
  price:     number
  color_hex: string
  image_url: string | null
  // Optional: items saved before these fields existed won't have them
  type?:     string
  style?:    string
}

const MAX_ITEMS = 6

function storageKey(userId: string | undefined) {
  return `sinay_recently_viewed_${userId ?? 'guest'}`
}

export function getRecentlyViewed(userId: string | undefined): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as RecentlyViewedItem[]) : []
  } catch {
    return []
  }
}

export function trackRecentlyViewed(userId: string | undefined, product: Product) {
  const firstVariant = product.variants[0]
  const item: RecentlyViewedItem = {
    id:        product.id,
    slug:      product.slug,
    name:      product.name,
    price:     firstVariant?.price ?? product.base_price,
    color_hex: firstVariant?.color_hex ?? '#EBCFD2',
    image_url: product.variants.find(v => v.image_url)?.image_url ?? null,
    type:      product.type,
    style:     product.style,
  }
  const existing = getRecentlyViewed(userId).filter(i => i.id !== product.id)
  const next = [item, ...existing].slice(0, MAX_ITEMS)
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next))
  } catch {
    // localStorage unavailable (private browsing, quota) — silently skip
  }
}
