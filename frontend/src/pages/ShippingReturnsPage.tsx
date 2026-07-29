import { useCallback, useEffect, useState } from 'react'
import { productsApi, type ShippingReturnsCopy } from '../api/products'
import { SkeletonText } from '../components/Skeleton'
import InlineError from '../components/InlineError'

export default function ShippingReturnsPage() {
  const [copy,    setCopy]    = useState<ShippingReturnsCopy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    productsApi.storeContent()
      .then(res => setCopy(res.shipping_returns_copy))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="max-w-[600px] mx-auto px-5 py-14 font-body">
      <div className="text-center mb-10">
        <p className="text-xs tracking-[0.3em] uppercase text-mocha mb-2">Good to know</p>
        <h1 className="font-logo text-[32px] text-ink">Shipping & Returns</h1>
      </div>

      {loading ? (
        <div className="space-y-8">
          <SkeletonText lines={3} />
          <SkeletonText lines={2} />
        </div>
      ) : error ? (
        <InlineError message="We couldn't load this page." onRetry={load} />
      ) : copy && (
        <div className="space-y-8">
          <section>
            <h2 className="text-[13px] font-semibold tracking-[0.08em] uppercase text-mocha/70 mb-3">Shipping</h2>
            <ul className="space-y-2 text-[14px] text-ink/70 leading-relaxed">
              <li>{copy.free_shipping}</li>
              <li>{copy.delivery}</li>
              <li>{copy.express}</li>
            </ul>
          </section>

          <section className="pt-2 border-t border-mocha/10">
            <h2 className="text-[13px] font-semibold tracking-[0.08em] uppercase text-mocha/70 mb-3">Returns</h2>
            <p className="text-[14px] text-ink/70 leading-relaxed">{copy.returns}</p>
          </section>
        </div>
      )}
    </div>
  )
}
