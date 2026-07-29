import { create } from 'zustand'
import { cartApi, type CartResponse } from '../api/cart'

interface CartState {
  cart: CartResponse | null
  loading: boolean
  error: boolean
  fetchCart: () => Promise<void>
  setCart: (cart: CartResponse) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  loading: false,
  error: false,

  fetchCart: async () => {
    set({ loading: true, error: false })
    try {
      const cart = await cartApi.get()
      set({ cart, loading: false })
    } catch {
      set({ loading: false, error: true })
    }
  },

  setCart: (cart) => set({ cart }),

  clearCart: () => set({ cart: null }),
}))
