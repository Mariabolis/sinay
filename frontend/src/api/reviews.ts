import client from './client'

export interface Review {
  id: string
  rating: number
  comment: string
  user_name: string
  created_at: string
}

export interface ReviewsResponse {
  reviews: Review[]
  average: number
  count: number
}

export const reviewsApi = {
  list: (slug: string) =>
    client.get<ReviewsResponse>(`/api/products/${slug}/reviews`).then(r => r.data),

  create: (slug: string, rating: number, comment: string) =>
    client.post<Review>(`/api/products/${slug}/reviews`, { rating, comment }).then(r => r.data),
}
