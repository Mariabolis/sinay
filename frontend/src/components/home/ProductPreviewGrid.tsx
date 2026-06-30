import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi, type Product } from '../../api/products'
import { useReveal } from '../../lib/useReveal'

export default function ProductPreviewGrid() {
  const [products, setProducts] = useState<Product[]>([])

  const [headRef, headVisible] = useReveal<HTMLDivElement>()
  const [gridRef, gridVisible] = useReveal<HTMLDivElement>()

  useEffect(() => {
    productsApi.list({ per_page: 4 })
      .then(res => setProducts(res.products))
      .catch(() => {})
  }, [])

  return (
    <section className="bg-cream-deep px-6 pt-[60px] pb-20">
      <div className="max-w-[1080px] mx-auto">
        <div
          ref={headRef}
          className={`text-center mb-9 reveal ${headVisible ? 'is-visible' : ''}`}
        >
          <p className="text-xs tracking-[0.3em] uppercase text-mocha">
            Sold separately
          </p>
          <h2
            className="font-logo text-ink mt-2"
            style={{ fontSize: 'clamp(28px, 5vw, 38px)' }}
          >
            Or shop individual pieces
          </h2>
        </div>

        <div
          ref={gridRef}
          className={`stagger-grid grid grid-cols-2 md:grid-cols-4 gap-5 ${gridVisible ? 'is-visible' : ''}`}
        >
          {products.map(product => {
            const firstVariant = product.variants[0]
            const colorHex  = firstVariant?.color_hex  ?? '#EBCFD2'
            const colorName = firstVariant?.color_name ?? ''
            const price     = firstVariant?.price      ?? product.base_price

            const imageUrl = product.variants.find(v => v.image_url)?.image_url ?? null

            return (
              <Link
                key={product.id}
                to={`/product/${product.slug}`}
                className="block bg-white rounded-[18px] p-[18px] text-center
                           transition-transform duration-300 hover:-translate-y-1
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px]"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="h-[120px] w-full object-cover rounded-xl mb-3.5"
                  />
                ) : (
                  <div
                    className="h-[120px] rounded-xl mb-3.5 transition-colors duration-200"
                    style={{ background: colorHex }}
                  />
                )}
                <h4 className="font-body font-semibold text-[14px] text-ink mb-0.5">{product.name}</h4>
                {colorName && (
                  <p className="text-[11.5px] text-mocha/60 mb-1 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full inline-block border border-mocha/20" style={{ background: colorHex }} />
                    {colorName}
                  </p>
                )}
                <p className="text-[13px] text-mocha">EGP {price.toFixed(0)}</p>
              </Link>
            )
          })}
        </div>

        <div className="text-center mt-9">
          <Link to="/shop" className="btn-pill-ghost">
            View all pieces
          </Link>
        </div>
      </div>
    </section>
  )
}
