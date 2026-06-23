import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8081',
  withCredentials: true, // sends sinay_sid session cookie cross-origin for guest cart
})

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401: clear auth and redirect to /login
client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      const current = window.location.pathname + window.location.search
      window.location.replace(`/login?redirect=${encodeURIComponent(current)}`)
    }
    return Promise.reject(error)
  },
)

export default client
