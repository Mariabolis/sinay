import { create } from 'zustand'
import { wishlistApi } from '../api/wishlist'
import type { Product } from '../api/products'

interface WishlistState {
  products: Product[]
  ids: Set<string>
  loaded: boolean
  error: boolean
  fetchWishlist: () => Promise<void>
  toggle: (product: Product) => Promise<void>
  clear: () => void
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  products: [],
  ids: new Set(),
  loaded: false,
  error: false,

  fetchWishlist: async () => {
    set({ error: false })
    try {
      const products = await wishlistApi.list()
      set({ products, ids: new Set(products.map(p => p.id)), loaded: true })
    } catch {
      set({ loaded: true, error: true })
    }
  },

  toggle: async (product) => {
    const { ids, products } = get()
    const isSaved = ids.has(product.id)
    // optimistic update
    if (isSaved) {
      set({ products: products.filter(p => p.id !== product.id), ids: new Set([...ids].filter(id => id !== product.id)) })
    } else {
      set({ products: [product, ...products], ids: new Set([...ids, product.id]) })
    }
    try {
      if (isSaved) await wishlistApi.remove(product.id)
      else await wishlistApi.add(product.id)
    } catch {
      // revert on failure
      set({ products, ids })
    }
  },

  clear: () => set({ products: [], ids: new Set(), loaded: false, error: false }),
}))
