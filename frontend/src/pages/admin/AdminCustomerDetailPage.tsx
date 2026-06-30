import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AdminCustomerDetail } from '../../api/admin'
import { adminApi } from '../../api/admin'
import { StatusBadge } from './AdminOrdersPage'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!id) return
    adminApi.getCustomer(id)
      .then(setCustomer)
      .catch(() => setError('Customer not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-[#8B7568] text-sm">Loading…</p>
  if (error || !customer) return (
    <div>
      <p className="text-red-500 text-sm mb-3">{error || 'Customer not found'}</p>
      <button onClick={() => navigate('/admin/customers')}
        className="text-sm text-[#8B7568] hover:text-[#4A3F38]">
        ← Back to customers
      </button>
    </div>
  )

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => navigate('/admin/customers')}
          className="text-xs text-[#8B7568] hover:text-[#4A3F38] transition-colors mb-2 block"
        >
          ← Customers
        </button>
        <h1 className="text-xl font-semibold text-[#4A3F38]">
          {customer.full_name ?? customer.email}
        </h1>
        <p className="text-xs text-[#b0a89f] mt-0.5">Joined {fmtDate(customer.created_at)}</p>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Orders"      value={String(customer.order_count)} />
        <StatCard label="Total Spend" value={`EGP ${customer.total_spend.toLocaleString()}`} />
        <StatCard label="Member Since" value={fmtDate(customer.created_at)} />
      </div>

      {/* ── Profile + Addresses row ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Profile */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <SectionTitle>Profile</SectionTitle>
          <div className="space-y-2 mt-3">
            <InfoRow label="Name"  value={customer.full_name  ?? '—'} />
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Phone" value={customer.phone ?? '—'} />
          </div>
        </div>

        {/* Addresses */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <SectionTitle>Saved Addresses</SectionTitle>
          {customer.addresses.length === 0 ? (
            <p className="text-xs text-[#b0a89f] mt-3">No saved addresses.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {customer.addresses.map(a => (
                <div key={a.id} className="text-xs text-[#4A3F38] leading-relaxed border-b border-[#F4EEE8] last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    {a.label && (
                      <span className="font-semibold text-[#8B7568] uppercase tracking-wide text-[10px]">
                        {a.label}
                      </span>
                    )}
                    {a.is_default && (
                      <span className="text-[10px] bg-[#ECE3D9] text-[#8B7568] px-1.5 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  {a.full_name && <p className="font-medium">{a.full_name} · {a.phone ?? ''}</p>}
                  <p className="text-[#8B7568]">
                    {[a.street, a.building].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-[#8B7568]">
                    {[a.city, a.governorate].filter(Boolean).join(', ')}
                  </p>
                  {a.notes && <p className="text-[#b0a89f] italic mt-0.5">{a.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Order history ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-[#F4EEE8]">
          <SectionTitle>Order History</SectionTitle>
        </div>

        {customer.orders.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#8B7568]">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F4EEE8] text-[#8B7568] text-xs font-medium">
                <th className="text-left px-5 py-3">Order</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
              {customer.orders.map(o => (
                <tr key={o.id} className="hover:bg-[#FAF7F4] transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-[#8B7568]">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-[#8B7568] text-xs whitespace-nowrap">
                    {fmtDateTime(o.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      o.payment_method === 'cod'
                        ? 'bg-[#ECE3D9] text-[#8B7568]'
                        : 'bg-[#C9D8E8] text-[#4A3F38]'
                    }`}>
                      {o.payment_method === 'cod' ? 'COD' : 'Card'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#4A3F38]">
                    EGP {o.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/orders/${o.id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-[#8B7568] hover:text-[#4A3F38] transition-colors whitespace-nowrap"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Small reusable pieces ─────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm px-5 py-4">
      <p className="text-[11px] font-semibold text-[#8B7568] uppercase tracking-widest mb-1">{label}</p>
      <p className="text-lg font-semibold text-[#4A3F38]">{value}</p>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-[#8B7568] uppercase tracking-widest">{children}</p>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-[#b0a89f] shrink-0 w-12">{label}</span>
      <span className="text-[#4A3F38] break-all">{value}</span>
    </div>
  )
}
