import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { checkoutApi, type Order } from '../api/checkout'

const POLL_INTERVAL = 2000   // ms between polls
const POLL_TIMEOUT  = 30000  // give up after 30 s

type Stage = 'cod' | 'polling' | 'success' | 'failed' | 'timeout'

export default function OrderConfirmationPage() {
  const { id }        = useParams<{ id: string }>()
  const [params]      = useSearchParams()
  const isCod         = params.get('cod') === 'true'
  const paymobSuccess = params.get('paymob_success') === 'true'
  const fetchCart     = useCartStore(s => s.fetchCart)

  const [stage, setStage] = useState<Stage>(isCod ? 'cod' : 'polling')
  const [order, setOrder] = useState<Order | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(Date.now())

  // For COD: just load the order once for the summary, no polling needed
  useEffect(() => {
    if (!isCod || !id) return
    checkoutApi.getOrder(id).then(setOrder).catch(() => {})
    fetchCart() // cart was already cleared by the backend
  }, [isCod, id, fetchCart])

  useEffect(() => {
    if (!id) { setStage('failed'); return }
    if (isCod) return // handled above

    // If Paymob already reported failure, skip polling
    if (!paymobSuccess) {
      setStage('failed')
      return
    }

    function stopPolling() {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    async function poll() {
      try {
        const o = await checkoutApi.getOrder(id!)
        setOrder(o)

        if (o.status === 'paid' || o.payment_status === 'success') {
          stopPolling()
          setStage('success')
          fetchCart() // sync cart (now empty) into the store
          return
        }
        if (o.status === 'cancelled' || o.payment_status === 'failed') {
          stopPolling()
          setStage('failed')
          return
        }
        if (Date.now() - startRef.current > POLL_TIMEOUT) {
          stopPolling()
          setStage('timeout')
        }
      } catch {
        // Network hiccup — keep trying until timeout
        if (Date.now() - startRef.current > POLL_TIMEOUT) {
          stopPolling()
          setStage('timeout')
        }
      }
    }

    poll() // immediate first check
    timerRef.current = setInterval(poll, POLL_INTERVAL)
    return () => stopPolling()
  }, [id, paymobSuccess, fetchCart])

  return (
    <main className="max-w-[600px] mx-auto px-6 py-20 text-center">
      {stage === 'cod'     && <CodView order={order} />}
      {stage === 'polling' && <PollingView />}
      {stage === 'success' && <SuccessView order={order} />}
      {stage === 'failed'  && <FailedView />}
      {stage === 'timeout' && <TimeoutView order={order} />}
    </main>
  )
}

// ── sub-views ──────────────────────────────────────────────────────────────────

function CodView({ order }: { order: Order | null }) {
  return (
    <div className="space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-cream-deep flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#8B7568" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>

      <div>
        <h1 className="font-logo text-ink" style={{ fontSize: 'clamp(24px,5vw,32px)' }}>
          Order placed!
        </h1>
        <p className="font-body text-mocha/70 text-[14px] mt-2">
          Pay in cash when your order arrives. We'll start preparing it right away.
        </p>
      </div>

      {order && (
        <div className="bg-white rounded-[18px] p-5 text-left shadow-[0_4px_16px_rgba(139,117,104,0.08)]">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-mocha/50 mb-3">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <ul className="space-y-2 mb-4">
            {order.items.map(item => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md shrink-0"
                  style={{ background: item.variant.color_hex }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-ink truncate">
                    {item.variant.product.name}
                  </p>
                  <p className="text-[11px] text-mocha/60">
                    {item.variant.color_name} · {item.variant.size}
                    {item.quantity > 1 && ` × ${item.quantity}`}
                  </p>
                </div>
                <p className="text-[12px] text-ink shrink-0">
                  EGP {(item.unit_price * item.quantity).toFixed(0)}
                </p>
              </li>
            ))}
          </ul>
          <div className="border-t border-mocha/10 pt-3 space-y-1">
            <div className="flex justify-between text-[13px] font-semibold text-ink">
              <span>Total (cash on delivery)</span>
              <span>EGP {order.total.toFixed(0)}</span>
            </div>
          </div>
        </div>
      )}

      <Link to="/shop" className="btn-pill-solid inline-block">
        Continue shopping
      </Link>
    </div>
  )
}

function PollingView() {
  return (
    <div className="flex flex-col items-center gap-6">
      <Spinner />
      <p className="font-body text-mocha text-[15px]">Confirming your payment…</p>
    </div>
  )
}

function SuccessView({ order }: { order: Order | null }) {
  return (
    <div className="space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-[#4a7c4a]/10 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#4a7c4a" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div>
        <h1 className="font-logo text-ink" style={{ fontSize: 'clamp(24px,5vw,32px)' }}>
          Order confirmed!
        </h1>
        <p className="font-body text-mocha/70 text-[14px] mt-2">
          Thank you for your order. We'll start preparing it shortly.
        </p>
      </div>

      {order && (
        <div className="bg-white rounded-[18px] p-5 text-left shadow-[0_4px_16px_rgba(139,117,104,0.08)]">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-mocha/50 mb-3">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <ul className="space-y-2 mb-4">
            {order.items.map(item => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md shrink-0"
                  style={{ background: item.variant.color_hex }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-ink truncate">
                    {item.variant.product.name}
                  </p>
                  <p className="text-[11px] text-mocha/60">
                    {item.variant.color_name} · {item.variant.size}
                    {item.quantity > 1 && ` × ${item.quantity}`}
                  </p>
                </div>
                <p className="text-[12px] text-ink shrink-0">
                  EGP {(item.unit_price * item.quantity).toFixed(0)}
                </p>
              </li>
            ))}
          </ul>
          <div className="border-t border-mocha/10 pt-3 flex justify-between text-[13px] font-semibold text-ink">
            <span>Total paid</span>
            <span>EGP {order.total.toFixed(0)}</span>
          </div>
        </div>
      )}

      <Link to="/shop" className="btn-pill-solid inline-block">
        Continue shopping
      </Link>
    </div>
  )
}

function FailedView() {
  return (
    <div className="space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6"  y1="6" x2="18" y2="18" />
        </svg>
      </div>

      <div>
        <h1 className="font-logo text-ink" style={{ fontSize: 'clamp(24px,5vw,32px)' }}>
          Payment failed
        </h1>
        <p className="font-body text-mocha/70 text-[14px] mt-2">
          Your card was not charged. You can try again from your cart.
        </p>
      </div>

      <Link to="/cart" className="btn-pill-solid inline-block">
        Back to cart
      </Link>
    </div>
  )
}

function TimeoutView({ order }: { order: Order | null }) {
  return (
    <div className="space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-cream-deep flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#8B7568" strokeWidth="2"
          strokeLinecap="round" className="w-8 h-8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>

      <div>
        <h1 className="font-logo text-ink" style={{ fontSize: 'clamp(24px,5vw,32px)' }}>
          Payment received
        </h1>
        <p className="font-body text-mocha/70 text-[14px] mt-2">
          We're processing your payment. We'll email you once your order is confirmed.
        </p>
        {order && (
          <p className="text-[12px] text-mocha/50 mt-1">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </p>
        )}
      </div>

      <Link to="/shop" className="btn-pill-solid inline-block">
        Continue shopping
      </Link>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-10 h-10 animate-spin text-mocha/30" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
        strokeLinecap="round" strokeDasharray="60" strokeDashoffset="15" />
    </svg>
  )
}
