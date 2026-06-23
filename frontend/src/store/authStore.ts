import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'sinay-auth' },
  ),
)
