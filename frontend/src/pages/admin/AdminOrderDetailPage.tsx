import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { AdminOrder } from '../../api/admin'
import { adminApi } from '../../api/admin'
import { StatusBadge, STATUS_CONFIG } from './AdminOrdersPage'

// Status transition graph — mirrors the backend allowedTransitions map
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:    ['paid', 'processing', 'cancelled'],
  paid:       ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['delivered', 'cancelled'],
  delivered:  [],
  cancelled:  [],
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [order,   setOrder]   = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // Status update state
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [updating,      setUpdating]      = useState(false)
  const [updateError,   setUpdateError]   = useState('')

  useEffect(() => {
    if (!id) return
    adminApi.getOrder(id)
      .then(setOrder)
      .catch(() => setError('Order not found'))
      .finally(() => setLoading(false))
  }, [id])

  async function confirmStatusChange() {
    if (!order || !pendingStatus) return
    setUpdating(true)
    setUpdateError('')
    try {
      await adminApi.updateOrderStatus(order.id, pendingStatus)
      setOrder(o => o ? { ...o, status: pendingStatus } : o)
      setPendingStatus(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setUpdateError(msg ?? 'Status update failed')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <p className="text-[#8B7568] text-sm">Loading…</p>
  if (error || !order) return (
    <div>
      <p className="text-red-500 text-sm mb-3">{error || 'Order not found'}</p>
      <button onClick={() => navigate('/admin/orders')} className="text-sm text-[#8B7568] hover:text-[#4A3F38]">
        ← Back to orders
      </button>
    </div>
  )

  const nextStatuses = ALLOWED_TRANSITIONS[order.status] ?? []

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate('/admin/orders')}
            className="text-xs text-[#8B7568] hover:text-[#4A3F38] transition-colors mb-2 block"
          >
            ← Orders
          </button>
          <h1 className="text-xl font-semibold text-[#4A3F38]">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-xs text-[#b0a89f] mt-0.5">{fmtDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* ── Top 3-col grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Customer */}
        <InfoCard title="Customer">
          <Row label="Name"  value={order.customer_name  ?? '—'} />
          <Row label="Email" value={order.customer_email ?? '—'} />
          <Row label="Phone" value={order.customer_phone ?? '—'} />
        </InfoCard>

        {/* Shipping address */}
        <InfoCard title="Shipping Address">
          {order.address ? (
            <>
              <Row label="Contact"  value={`${order.address.full_name ?? ''} · ${order.address.phone ?? ''}`} />
              <Row label="Street"   value={[order.address.street, order.address.building].filter(Boolean).join(', ') || '—'} />
              <Row label="City"     value={[order.address.city, order.address.governorate].filter(Boolean).join(', ') || '—'} />
              {order.address.notes && <Row label="Notes" value={order.address.notes} />}
            </>
          ) : (
            <p className="text-[#b0a89f] text-xs">No address on file</p>
          )}
        </InfoCard>

        {/* Payment */}
        <InfoCard title="Payment">
          <Row label="Method" value={order.payment_method === 'cod' ? 'Cash on delivery' : 'Card'} />
          <Row label="Payment status" value={order.payment_status} />
          {order.coupon_code && <Row label="Coupon" value={order.coupon_code} />}
        </InfoCard>
      </div>

      {/* ── Line items ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <p className="text-[11px] font-semibold text-[#8B7568] uppercase tracking-widest px-5 pt-4 pb-2">
          Items
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F4EEE8] text-[#8B7568] text-xs font-medium">
              <th className="text-left px-5 py-2 w-14">Image</th>
              <th className="text-left px-4 py-2">Product</th>
              <th className="text-left px-4 py-2">Colour / Size</th>
              <th className="text-center px-4 py-2">Qty</th>
              <th className="text-right px-5 py-2">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4EEE8]">
            {order.items.map(item => (
              <tr key={item.id} className="hover:bg-[#FAF7F4] transition-colors">
                <td className="px-5 py-3">
                  {item.variant.image_url ? (
                    <img
                      src={item.variant.image_url}
                      alt={item.variant.product.name}
                      className="w-10 h-10 object-cover rounded-lg border border-[#F4EEE8]"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg border border-[#F4EEE8]"
                      style={{ background: item.variant.color_hex }}
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[#4A3F38]">{item.variant.product.name}</p>
                  <p className="text-[11px] text-[#b0a89f] capitalize">{item.variant.product.type}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-[#d8cfc5] shrink-0"
                      style={{ background: item.variant.color_hex }}
                    />
                    <span className="text-[#4A3F38] text-xs">
                      {item.variant.color_name} / {item.variant.size}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-[#4A3F38]">×{item.quantity}</td>
                <td className="px-5 py-3 text-right font-medium text-[#4A3F38]">
                  EGP {(item.unit_price * item.quantity).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="px-5 py-4 border-t border-[#F4EEE8] space-y-1.5 text-sm">
          <TotalRow label="Subtotal"     value={order.subtotal}     />
          {order.discount > 0 && (
            <TotalRow label="Discount"   value={-order.discount}    color="text-emerald-600" prefix="−" />
          )}
          {order.shipping_fee > 0 && (
            <TotalRow label="Shipping"   value={order.shipping_fee} />
          )}
          <div className="border-t border-[#F4EEE8] pt-2 mt-2">
            <TotalRow label="Total"      value={order.total}        bold />
          </div>
        </div>
      </div>

      {/* ── Status update ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <p className="text-[11px] font-semibold text-[#8B7568] uppercase tracking-widest mb-3">
          Update Status
        </p>

        {nextStatuses.length === 0 ? (
          <p className="text-sm text-[#b0a89f]">
            This order is <strong className="text-[#4A3F38]">{order.status}</strong> — no further changes allowed.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[#8B7568]">
              Current: <strong className="text-[#4A3F38] capitalize">{order.status}</strong>. Change to:
            </p>
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map(s => {
                const cfg = STATUS_CONFIG[s] ?? { label: s, cls: '' }
                return (
                  <button
                    key={s}
                    onClick={() => { setPendingStatus(s); setUpdateError('') }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-colors
                                ${pendingStatus === s
                                  ? 'border-[#8B7568] ' + cfg.cls
                                  : 'border-transparent ' + cfg.cls + ' opacity-70 hover:opacity-100'
                                }`}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>

            {/* Confirmation */}
            {pendingStatus && (
              <div className="flex items-center gap-3 pt-1">
                <p className="text-xs text-[#4A3F38]">
                  Change status to <strong>{pendingStatus}</strong>?
                </p>
                <button
                  onClick={confirmStatusChange}
                  disabled={updating}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#8B7568] text-white
                             hover:bg-[#7a6659] disabled:opacity-50 transition-colors"
                >
                  {updating ? 'Saving…' : 'Confirm'}
                </button>
                <button
                  onClick={() => setPendingStatus(null)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#d8cfc5] text-[#4A3F38]
                             hover:bg-[#ECE3D9] transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            {updateError && <p className="text-xs text-red-500">{updateError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Small reusable components ─────────────────────────────────────────────────

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <p className="text-[11px] font-semibold text-[#8B7568] uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-[#b0a89f] shrink-0 w-24">{label}</span>
      <span className="text-[#4A3F38] break-all">{value}</span>
    </div>
  )
}

function TotalRow({
  label, value, bold, color, prefix,
}: {
  label: string; value: number; bold?: boolean; color?: string; prefix?: string
}) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-[#4A3F38]' : 'text-[#8B7568]'} ${color ?? ''}`}>
      <span>{label}</span>
      <span>{prefix}EGP {Math.abs(value).toLocaleString()}</span>
    </div>
  )
}
