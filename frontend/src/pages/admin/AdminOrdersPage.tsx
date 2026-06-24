import { useEffect, useState } from 'react'
import type { AdminOrder } from '../../api/admin'
import { adminApi } from '../../api/admin'

const ALL_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700',
  paid:       'bg-emerald-100 text-emerald-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-600',
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [error,  setError]  = useState('')

  useEffect(() => {
    adminApi.listOrders()
      .then(setOrders)
      .catch(() => setError('Failed to load orders'))
  }, [])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await adminApi.updateOrderStatus(id, status)
      setOrders(os => os.map(o => (o.id === id ? { ...o, status } : o)))
    } catch {
      alert('Failed to update order status')
    }
  }

  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="max-w-6xl space-y-4">
      <h1 className="text-2xl font-semibold text-[#4A3F38]">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-[#8B7568] text-sm">No orders yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-[#ECE3D9] text-[#4A3F38]">
              <tr>
                <th className="w-8" />
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <OrderRow key={o.id} order={o} onStatusChange={handleStatusChange} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── OrderRow ───────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order:          AdminOrder
  onStatusChange: (id: string, status: string) => void
}

function OrderRow({ order, onStatusChange }: OrderRowProps) {
  const [open, setOpen] = useState(false)

  const shortId = order.id.slice(0, 8)
  const date    = new Date(order.created_at).toLocaleDateString('en-EG', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const customerLabel = order.customer_name ?? order.customer_email ?? '—'

  return (
    <>
      <tr
        className="hover:bg-[#faf8f5] cursor-pointer border-t border-[#F4EEE8]"
        onClick={() => setOpen(o => !o)}
      >
        <td className="pl-4 text-[#8B7568] text-xs select-none">{open ? '▾' : '▸'}</td>
        <td className="px-4 py-3 font-mono text-xs text-[#8B7568]">{shortId}…</td>
        <td className="px-4 py-3 text-[#4A3F38] whitespace-nowrap">{date}</td>
        <td className="px-4 py-3 text-[#4A3F38] max-w-[160px] truncate">{customerLabel}</td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            order.payment_method === 'cod' ? 'bg-[#ECE3D9] text-[#8B7568]' : 'bg-[#C9D8E8] text-[#4A3F38]'
          }`}>
            {order.payment_method === 'cod' ? 'COD' : 'Card'}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-medium text-[#4A3F38]">
          EGP {order.total.toLocaleString()}
        </td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <select
            value={order.status}
            onChange={e => onStatusChange(order.id, e.target.value)}
            className={`text-xs px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer
                        appearance-none text-center ${STATUS_COLORS[order.status] ?? ''}`}
          >
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </td>
      </tr>

      {open && (
        <tr className="border-t border-[#F4EEE8] bg-[#faf8f5]">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-3 gap-6 text-xs text-[#4A3F38]">

              {/* Customer */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-[#8B7568] font-medium mb-2">Customer</p>
                <p><span className="text-[#8B7568]">Name: </span>{order.customer_name ?? '—'}</p>
                <p><span className="text-[#8B7568]">Email: </span>{order.customer_email ?? '—'}</p>
                <p><span className="text-[#8B7568]">Phone: </span>{order.customer_phone ?? '—'}</p>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-[#8B7568] font-medium mb-2">Shipping Address</p>
                {order.address ? (
                  <>
                    <p>{order.address.full_name ?? '—'} · {order.address.phone ?? '—'}</p>
                    <p>{[order.address.street, order.address.building].filter(Boolean).join(', ') || '—'}</p>
                    <p>{[order.address.city, order.address.governorate].filter(Boolean).join(', ') || '—'}</p>
                    {order.address.notes && <p className="text-[#8B7568]">Note: {order.address.notes}</p>}
                  </>
                ) : (
                  <p className="text-[#8B7568]">No address</p>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#8B7568] font-medium mb-2">Items</p>
                <div className="space-y-1.5">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/50"
                        style={{ background: item.variant?.color_hex }}
                      />
                      <span className="flex-1">
                        {item.variant?.product?.name ?? '—'} · {item.variant?.color_name} · {item.variant?.size}
                      </span>
                      <span className="text-[#8B7568]">×{item.quantity}</span>
                      <span className="font-medium">EGP {item.unit_price}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-[#ece3d9] flex justify-between text-[#8B7568]">
                  <span>Subtotal</span><span>EGP {order.subtotal}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span><span>−EGP {order.discount}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-[#4A3F38]">
                  <span>Total</span><span>EGP {order.total}</span>
                </div>
              </div>

            </div>
          </td>
        </tr>
      )}
    </>
  )
}
