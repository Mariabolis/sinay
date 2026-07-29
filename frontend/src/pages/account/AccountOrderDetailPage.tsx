import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ordersApi, type Order, type OrderItem } from '../../api/account'
import { cartApi } from '../../api/cart'
import { useCartStore } from '../../store/cartStore'
import { STATUS_CONFIG, STATUS_STEPS, STATUS_STEP_LABELS, stepIndexForStatus } from '../../lib/orderStatus'
import { SkeletonBlock } from '../../components/Skeleton'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const setCart = useCartStore(s => s.setCart)

  const [order,   setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [reordering, setReordering] = useState(false)
  const [reorderError, setReorderError] = useState('')

  useEffect(() => {
    if (!id) return
    ordersApi.get(id)
      .then(setOrder)
      .catch(() => setError('Order not found'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleReorder() {
    if (!order || reordering) return
    setReordering(true)
    setReorderError('')
    try {
      const bySet = new Map<string, OrderItem[]>()
      const standalone: OrderItem[] = []
      for (const item of order.items) {
        if (item.set_id) {
          const group = bySet.get(item.set_id) ?? []
          group.push(item)
          bySet.set(item.set_id, group)
        } else {
          standalone.push(item)
        }
      }

      let cart = null
      for (const group of bySet.values()) {
        const top = group.find(i => i.variant.product.type === 'top')
        const bottom = group.find(i => i.variant.product.type === 'bottom')
        if (top && bottom) {
          cart = await cartApi.addSet(top.variant.id, bottom.variant.id)
        }
      }
      for (const item of standalone) {
        cart = await cartApi.addItem(item.variant.id, item.quantity)
      }
      if (cart) setCart(cart)
      navigate('/cart')
    } catch {
      setReorderError('Could not add all items to your bag — please try again.')
    } finally {
      setReordering(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <SkeletonBlock className="h-64 w-full rounded-2xl" />
          <SkeletonBlock className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }
  if (error || !order) {
    return (
      <div className="space-y-3">
        <p className="text-[13px] text-red-500">{error || 'Order not found'}</p>
        <Link to="/account/orders" className="text-[13px] text-mocha underline underline-offset-2">← Back to orders</Link>
      </div>
    )
  }

  const status = STATUS_CONFIG[order.status] ?? { label: order.status, cls: 'bg-mocha/10 text-mocha' }
  const isCancelled = order.status === 'cancelled'
  const currentStep = stepIndexForStatus(order.status)
  const addr = order.address

  return (
    <div className="space-y-8">
      <div>
        <Link to="/account/orders" className="text-[12.5px] text-mocha/60 hover:text-mocha inline-flex items-center gap-1 mb-3">
          ← Back to orders
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-logo text-[24px] text-ink">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-[13px] text-mocha/55 mt-1">Placed on {fmtDate(order.created_at)}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${status.cls}`}>{status.label}</span>
        </div>
      </div>

      {/* ── Status stepper ────────────────────────────────────────────────── */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-[#EDE7E0] p-6">
          <div className="flex items-start">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStep
              const isLast = i === STATUS_STEPS.length - 1
              return (
                <div key={step} className="flex-1 flex flex-col items-center relative">
                  {!isLast && (
                    <div
                      className={`absolute top-3 left-1/2 w-full h-[2px] transition-colors duration-500 ${
                        i < currentStep ? 'bg-mocha' : 'bg-[#EDE7E0]'
                      }`}
                    />
                  )}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors duration-300 ${
                      done ? 'bg-mocha' : 'bg-[#EDE7E0]'
                    }`}
                  >
                    {done && (
                      <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                  <p className={`mt-2 text-[11.5px] font-medium text-center ${done ? 'text-ink' : 'text-mocha/40'}`}>
                    {STATUS_STEP_LABELS[step]}
                  </p>
                  {step === 'placed' && (
                    <p className="text-[10.5px] text-mocha/40 mt-0.5">{fmtDate(order.created_at)}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ── Items ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#EDE7E0] p-6">
          <h2 className="text-[13px] font-semibold text-mocha/60 uppercase tracking-[0.08em] mb-4">Items</h2>
          <div className="space-y-4">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center bg-[#F9F5F0] overflow-hidden"
                  style={!item.variant.color_hex ? undefined : { background: item.variant.color_hex + '33' }}
                >
                  <span className="w-5 h-5 rounded-full border border-mocha/20" style={{ background: item.variant.color_hex }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-ink truncate">{item.variant.product.name}</p>
                  <p className="text-[12px] text-mocha/55">{item.variant.color_name} · {item.variant.size} · Qty {item.quantity}</p>
                </div>
                <p className="text-[13.5px] font-medium text-ink shrink-0">EGP {(item.unit_price * item.quantity).toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-[#F4EEE8] mt-5 pt-4 space-y-1.5 text-[13px]">
            <div className="flex justify-between text-mocha/60"><span>Subtotal</span><span>EGP {order.subtotal.toLocaleString()}</span></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-mocha/60"><span>Discount</span><span>−EGP {order.discount.toLocaleString()}</span></div>
            )}
            <div className="flex justify-between text-mocha/60"><span>Shipping</span><span>EGP {order.shipping_fee.toLocaleString()}</span></div>
            <div className="flex justify-between text-ink font-semibold text-[14px] pt-1"><span>Total</span><span>EGP {order.total.toLocaleString()}</span></div>
          </div>
        </div>

        {/* ── Address + payment + reorder ───────────────────────────────── */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#EDE7E0] p-6">
            <h2 className="text-[13px] font-semibold text-mocha/60 uppercase tracking-[0.08em] mb-3">Shipping Address</h2>
            {addr ? (
              <div className="text-[13px] text-ink/80 leading-relaxed">
                <p className="font-medium text-ink">{addr.full_name}</p>
                <p>{addr.phone}</p>
                <p>{[addr.street, addr.building].filter(Boolean).join(', ')}</p>
                <p>{[addr.city, addr.governorate].filter(Boolean).join(', ')}</p>
                {addr.notes && <p className="text-mocha/55 mt-1">{addr.notes}</p>}
              </div>
            ) : (
              <p className="text-[13px] text-mocha/50">No address on file.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#EDE7E0] p-6">
            <h2 className="text-[13px] font-semibold text-mocha/60 uppercase tracking-[0.08em] mb-3">Payment</h2>
            <p className="text-[13px] text-ink/80">{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Card'}</p>
          </div>

          <div>
            <button
              onClick={handleReorder}
              disabled={reordering}
              className="w-full btn-pill-solid py-3 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reordering ? 'Adding to bag…' : 'Order Again'}
            </button>
            {reorderError && <p className="text-[12px] text-red-500 mt-2 text-center">{reorderError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
