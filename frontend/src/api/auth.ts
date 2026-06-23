import client from './client'
import type { AuthUser } from '../store/authStore'

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: AuthUser
}

export const authApi = {
  register: (data: {
    email: string
    password: string
    full_name?: string
    phone?: string
  }) => client.post<AuthResponse>('/api/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    client.post<AuthResponse>('/api/auth/login', data).then((r) => r.data),

  refresh: (refreshToken: string) =>
    client
      .post<AuthResponse>('/api/auth/refresh', { refresh_token: refreshToken })
      .then((r) => r.data),

  me: () => client.get<AuthUser>('/api/auth/me').then((r) => r.data),
}
