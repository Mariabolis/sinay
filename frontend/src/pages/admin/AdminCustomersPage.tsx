import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AdminCustomer } from '../../api/admin'
import { adminApi } from '../../api/admin'

type SortKey = 'join_date' | 'total_spend' | 'order_count'

const PER_PAGE = 20

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Sort header cell ──────────────────────────────────────────────────────────

function SortTh({
  label, col, current, dir, className = '',
  onSort,
}: {
  label: string; col: SortKey; current: SortKey; dir: 'asc' | 'desc'
  className?: string; onSort: (c: SortKey) => void
}) {
  const active = current === col
  return (
    <th className={`py-3 text-xs font-medium text-[#8B7568] ${className}`}>
      <button
        onClick={() => onSort(col)}
        className="flex items-center gap-1 hover:text-[#4A3F38] transition-colors"
      >
        {label}
        <span className={`text-[10px] ${active ? 'text-[#8B7568]' : 'text-[#d8cfc5]'}`}>
          {active ? (dir === 'desc' ? '↓' : '↑') : '↕'}
        </span>
      </button>
    </th>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCustomersPage() {
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  const [search,  setSearch]  = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('join_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    adminApi.listCustomers({
      page, per_page: PER_PAGE,
      search:   search.trim() || undefined,
      sort:     sortKey,
      sort_dir: sortDir,
    })
      .then(res => { setCustomers(res.customers ?? []); setTotal(res.total ?? 0) })
      .catch(() => setError('Failed to load customers'))
      .finally(() => setLoading(false))
  }, [page, search, sortKey, sortDir])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, sortKey, sortDir])

  function handleSort(col: SortKey) {
    if (col === sortKey) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(col)
      setSortDir('desc')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="max-w-5xl space-y-5">
      <h1 className="text-2xl font-semibold text-[#4A3F38]">Customers</h1>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Search name, email or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64 border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38]
                     placeholder:text-[#b0a89f] focus:outline-none focus:border-[#8B7568] bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-[#8B7568] hover:text-[#4A3F38] transition-colors"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-[#b0a89f]">{total} customers</span>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : loading ? (
        <p className="text-[#8B7568] text-sm">Loading…</p>
      ) : customers.length === 0 ? (
        <p className="text-[#8B7568] text-sm">No customers found.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-[#F4EEE8]">
                <th className="text-left px-5 py-3 text-xs font-medium text-[#8B7568]">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8B7568]">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8B7568]">Phone</th>
                <SortTh label="Orders"  col="order_count" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right px-4" />
                <SortTh label="Spend"   col="total_spend" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right px-4" />
                <SortTh label="Joined"  col="join_date"   current={sortKey} dir={sortDir} onSort={handleSort} className="text-right px-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
              {customers.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/admin/customers/${c.id}`)}
                  className="hover:bg-[#FAF7F4] cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-[#4A3F38]">
                    {c.full_name ?? <span className="text-[#b0a89f]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[#8B7568] text-xs">{c.email}</td>
                  <td className="px-4 py-3 text-[#8B7568] text-xs">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      c.order_count > 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-[#ECE3D9] text-[#8B7568]'
                    }`}>
                      {c.order_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#4A3F38] text-xs">
                    {c.total_spend > 0
                      ? `EGP ${c.total_spend.toLocaleString()}`
                      : <span className="text-[#b0a89f]">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-[#8B7568] text-xs whitespace-nowrap">
                    {fmtDate(c.created_at)}
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
          <span className="text-sm">Page {page} of {totalPages}</span>
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
