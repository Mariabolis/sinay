import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWishlistStore } from '../store/wishlistStore'
import { SkeletonGrid } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import InlineError from '../components/InlineError'

export default function WishlistPage() {
  const { products, loaded, error, fetchWishlist, toggle } = useWishlistStore()

  useEffect(() => {
    if (!loaded) fetchWishlist()
  }, [loaded, fetchWishlist])

  return (
    <div className="max-w-[900px] mx-auto px-5 py-10 font-body">
      <h1 className="font-logo text-[28px] text-ink mb-8">My Wishlist</h1>

      {!loaded ? (
        <SkeletonGrid count={4} className="sm:grid-cols-3 md:grid-cols-4" />
      ) : error && products.length === 0 ? (
        <InlineError message="We couldn't load your wishlist." onRetry={fetchWishlist} />
      ) : products.length === 0 ? (
        <EmptyState
          message="Nothing saved yet"
          subtext="Browse the shop and tap the heart on anything you like."
          ctaLabel="Browse the shop"
          ctaTo="/shop"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {products.map(product => {
            const firstColor = product.variants[0]
            const colorHex   = firstColor?.color_hex ?? '#EBCFD2'
            const colorName  = firstColor?.color_name ?? ''
            const price      = firstColor?.price ?? product.base_price
            const imageUrl   = product.variants.find(v => v.image_url)?.image_url ?? null

            return (
              <div key={product.id} className="bg-white rounded-[18px] p-[18px] text-center relative">
                <button
                  onClick={() => toggle(product)}
                  aria-label="Remove from wishlist"
                  className="absolute top-2.5 right-2.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EBCFD2" stroke="#8B7568" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
                  </svg>
                </button>
                <Link to={`/product/${product.slug}`} className="block group">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="h-[120px] w-full object-cover rounded-xl mb-3.5" />
                  ) : (
                    <div className="h-[120px] rounded-xl mb-3.5" style={{ background: colorHex }} />
                  )}
                  <h3 className="font-body font-semibold text-[14px] text-ink mb-0.5">{product.name}</h3>
                  <p className="text-[11.5px] text-[#8a7c72] mb-1">{colorName}</p>
                  <p className="text-[13px] text-mocha">EGP {price.toFixed(0)}</p>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
