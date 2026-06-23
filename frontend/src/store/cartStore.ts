import { create } from 'zustand'
import { cartApi, type CartResponse } from '../api/cart'

interface CartState {
  cart: CartResponse | null
  loading: boolean
  fetchCart: () => Promise<void>
  setCart: (cart: CartResponse) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  loading: false,

  fetchCart: async () => {
    set({ loading: true })
    try {
      const cart = await cartApi.get()
      set({ cart, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  setCart: (cart) => set({ cart }),

  clearCart: () => set({ cart: null }),
}))
