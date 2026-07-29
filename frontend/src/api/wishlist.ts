import client from './client'
import type { Product } from './products'

export const wishlistApi = {
  list: () => client.get<{ products: Product[] }>('/api/wishlist').then(r => r.data.products),

  add: (productId: string) =>
    client.post('/api/wishlist', { product_id: productId }).then(r => r.data),

  remove: (productId: string) =>
    client.delete(`/api/wishlist/${productId}`).then(r => r.data),
}
