import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ordersApi, type Order } from '../../api/account'
import { STATUS_CONFIG } from '../../lib/orderStatus'
import { SkeletonRows } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import InlineError from '../../components/InlineError'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AccountOrdersPage() {
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    ordersApi.list()
      .then(setOrders)
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-logo text-[24px] text-ink">Order History</h1>
        <p className="text-[13px] text-mocha/55 mt-1">All your past orders, newest first.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#EDE7E0] p-5">
          <SkeletonRows count={4} rowClassName="h-12" />
        </div>
      ) : error ? (
        <InlineError message={error} onRetry={load} />
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE7E0]">
          <EmptyState
            message="You haven't placed any orders yet"
            ctaLabel="Start shopping"
            ctaTo="/shop"
          />
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="sm:hidden space-y-3">
            {orders.map(o => {
              const status = STATUS_CONFIG[o.status] ?? { label: o.status, cls: 'bg-mocha/10 text-mocha' }
              return (
                <Link
                  key={o.id}
                  to={`/account/orders/${o.id}`}
                  className="block bg-white rounded-2xl border border-[#EDE7E0] px-4 py-3.5 active:bg-[#FAF7F4] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs text-mocha/70">#{o.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-ink/60">{fmtDate(o.created_at)}</span>
                    <span className="font-medium text-ink">EGP {o.total.toLocaleString()}</span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-[#EDE7E0] overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[520px]">
              <thead>
                <tr className="border-b border-[#EDE7E0] text-mocha/50 text-xs">
                  <th className="text-left px-5 py-3">Order</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EEE8]">
                {orders.map(o => {
                  const status = STATUS_CONFIG[o.status] ?? { label: o.status, cls: 'bg-mocha/10 text-mocha' }
                  return (
                    <tr key={o.id} className="hover:bg-[#FAF7F4] transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-mocha/70">#{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3.5 text-ink/70">{fmtDate(o.created_at)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-ink">EGP {o.total.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link to={`/account/orders/${o.id}`} className="text-mocha underline underline-offset-2 hover:text-ink text-xs">
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
