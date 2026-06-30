import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ordersApi, type Order } from '../api/account'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Pending',    cls: 'bg-amber-50  text-amber-700'  },
  paid:       { label: 'Paid',       cls: 'bg-blue-50   text-blue-700'   },
  processing: { label: 'Processing', cls: 'bg-blue-50   text-blue-700'   },
  shipped:    { label: 'Shipped',    cls: 'bg-purple-50 text-purple-700' },
  delivered:  { label: 'Delivered',  cls: 'bg-emerald-50 text-emerald-700' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-red-50    text-red-500'    },
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrdersPage() {
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    ordersApi.list()
      .then(setOrders)
      .catch(() => setError('Could not load your orders.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-[740px] mx-auto px-5 py-10 font-body">
      <h1 className="font-logo text-[28px] text-ink mb-6">My Orders</h1>

      {loading && <p className="text-mocha/60 text-sm">Loading…</p>}
      {error   && <p className="text-red-500 text-sm">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-20">
          <p className="text-mocha/50 text-sm mb-4">You haven't placed any orders yet.</p>
          <Link to="/shop" className="btn-pill-sm">Start shopping</Link>
        </div>
      )}

      <div className="space-y-4">
        {orders.map(order => {
          const status = STATUS_CONFIG[order.status] ?? { label: order.status, cls: 'bg-[#F4EEE8] text-[#8B7568]' }
          const itemCount = order.items.reduce((s, i) => s + i.quantity, 0)

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-[#EDE7E0] p-5 space-y-3"
            >
              {/* Row 1 — order meta */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-mocha/50 mb-0.5">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-mocha/40">{fmt(order.created_at)}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>
                  {status.label}
                </span>
              </div>

              {/* Row 2 — items preview */}
              <div className="flex flex-wrap gap-2">
                {order.items.slice(0, 4).map(item => (
                  <div key={item.id} className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-mocha/20 shrink-0"
                      style={{ background: item.variant.color_hex }}
                    />
                    <span className="text-xs text-ink">
                      {item.variant.product.name} · {item.variant.size}
                      {item.quantity > 1 && ` ×${item.quantity}`}
                    </span>
                  </div>
                ))}
                {order.items.length > 4 && (
                  <span className="text-xs text-mocha/50">+{order.items.length - 4} more</span>
                )}
              </div>

              {/* Row 3 — totals + action */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F4EEE8]">
                <div className="text-sm text-ink">
                  <span className="font-semibold">EGP {order.total.toFixed(0)}</span>
                  <span className="text-mocha/45 ml-1.5">· {itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                  {order.payment_method === 'cod' && (
                    <span className="ml-1.5 text-xs text-mocha/40">· Cash on delivery</span>
                  )}
                </div>
                <Link
                  to={`/order/${order.id}/confirmation`}
                  className="text-xs font-semibold text-mocha hover:underline underline-offset-2"
                >
                  View details →
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
