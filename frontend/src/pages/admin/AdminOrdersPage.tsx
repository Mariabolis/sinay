import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AdminOrder } from '../../api/admin'
import { adminApi } from '../../api/admin'

// ── shared status config (same palette as customer OrdersPage) ─────────────────
export const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Pending',    cls: 'bg-amber-50   text-amber-700'   },
  paid:       { label: 'Paid',       cls: 'bg-blue-50    text-blue-700'    },
  processing: { label: 'Processing', cls: 'bg-blue-50    text-blue-700'    },
  shipped:    { label: 'Shipped',    cls: 'bg-purple-50  text-purple-700'  },
  delivered:  { label: 'Delivered',  cls: 'bg-emerald-50 text-emerald-700' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-red-50     text-red-500'     },
}

const ALL_STATUSES  = Object.keys(STATUS_CONFIG)
const PER_PAGE      = 20

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const navigate = useNavigate()

  const [orders,  setOrders]  = useState<AdminOrder[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [sort,    setSort]    = useState<'asc' | 'desc'>('desc')

  // filters
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [pmFilter,      setPmFilter]      = useState('')
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    adminApi.listOrders({
      page, per_page: PER_PAGE, sort,
      status:         statusFilter  || undefined,
      payment_method: pmFilter      || undefined,
      date_from:      dateFrom      || undefined,
      date_to:        dateTo        || undefined,
      search:         search.trim() || undefined,
    })
      .then(res => { setOrders(res.orders ?? []); setTotal(res.total ?? 0) })
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [page, sort, statusFilter, pmFilter, dateFrom, dateTo, search])

  useEffect(() => { load() }, [load])

  // reset page when filters change
  useEffect(() => { setPage(1) }, [statusFilter, pmFilter, dateFrom, dateTo, search])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="max-w-6xl space-y-5">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-semibold text-[#4A3F38]">Orders</h1>

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Order ID or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-44 border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38]
                     placeholder:text-[#b0a89f] focus:outline-none focus:border-[#8B7568] bg-white"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38]
                     focus:outline-none focus:border-[#8B7568] bg-white"
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <select
          value={pmFilter}
          onChange={e => setPmFilter(e.target.value)}
          className="border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38]
                     focus:outline-none focus:border-[#8B7568] bg-white"
        >
          <option value="">All payment types</option>
          <option value="card">Card</option>
          <option value="cod">Cash on delivery</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          title="From date"
          className="border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38]
                     focus:outline-none focus:border-[#8B7568] bg-white"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          title="To date"
          className="border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38]
                     focus:outline-none focus:border-[#8B7568] bg-white"
        />
        {(search || statusFilter || pmFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setPmFilter(''); setDateFrom(''); setDateTo('') }}
            className="px-3 py-2 text-xs text-[#8B7568] hover:text-[#4A3F38] transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : loading ? (
        <p className="text-[#8B7568] text-sm">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-[#8B7568] text-sm">No orders found.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-[#F4EEE8] text-[#8B7568] text-xs font-medium">
                <th className="text-left px-5 py-3">Order</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">
                  <button
                    onClick={() => setSort(s => s === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-1 ml-auto hover:text-[#4A3F38] transition-colors"
                  >
                    Date {sort === 'desc' ? '↓' : '↑'}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
              {orders.map(o => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                  className="hover:bg-[#FAF7F4] cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-mono text-xs text-[#8B7568]">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-[#4A3F38] max-w-[180px]">
                    <p className="truncate">{o.customer_name ?? '—'}</p>
                    <p className="text-[11px] text-[#b0a89f] truncate">{o.customer_email ?? ''}</p>
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
                  <td className="px-4 py-3 text-right text-[#8B7568] text-xs whitespace-nowrap">
                    {fmtDate(o.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm text-[#8B7568]">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border border-[#d8cfc5] hover:bg-[#ECE3D9]
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span>Page {page} of {totalPages} · {total} orders</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border border-[#d8cfc5] hover:bg-[#ECE3D9]
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

// ── StatusBadge (exported so detail page can reuse it) ─────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-[#F4EEE8] text-[#8B7568]' }
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}
