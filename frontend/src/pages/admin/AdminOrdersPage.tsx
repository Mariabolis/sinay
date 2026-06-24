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
  const [error, setError]   = useState('')

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
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Items</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
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
  const shortId = order.id.slice(0, 8)
  const date    = new Date(order.created_at).toLocaleDateString('en-EG', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const itemSummary = order.items
    .map(i => `${i.variant?.product?.name ?? '—'} (${i.variant?.size})`)
    .join(', ')

  return (
    <tr className="hover:bg-[#faf8f5]">
      <td className="px-4 py-3 font-mono text-xs text-[#8B7568]">{shortId}…</td>
      <td className="px-4 py-3 text-[#4A3F38] whitespace-nowrap">{date}</td>
      <td className="px-4 py-3 text-[#4A3F38]">{order.customer_email ?? '—'}</td>
      <td className="px-4 py-3 text-[#8B7568] max-w-[200px] truncate" title={itemSummary}>
        {itemSummary}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          order.payment_method === 'cod'
            ? 'bg-[#ECE3D9] text-[#8B7568]'
            : 'bg-[#C9D8E8] text-[#4A3F38]'
        }`}>
          {order.payment_method === 'cod' ? 'COD' : 'Card'}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-medium text-[#4A3F38]">
        EGP {order.total.toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <select
          value={order.status}
          onChange={e => onStatusChange(order.id, e.target.value)}
          className={`text-xs px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer
                      appearance-none text-center ${STATUS_COLORS[order.status] ?? ''}`}
        >
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
    </tr>
  )
}
