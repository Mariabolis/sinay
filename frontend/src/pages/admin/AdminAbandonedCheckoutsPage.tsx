import { useCallback, useEffect, useState } from 'react'
import type { AbandonedCheckout } from '../../api/admin'
import { adminApi } from '../../api/admin'
import { SkeletonRows } from '../../components/Skeleton'

const PER_PAGE = 20

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminAbandonedCheckoutsPage() {
  const [checkouts, setCheckouts] = useState<AbandonedCheckout[]>([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [copiedId,  setCopiedId]  = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    adminApi.listAbandonedCheckouts({ page, per_page: PER_PAGE })
      .then(res => { setCheckouts(res.checkouts ?? []); setTotal(res.total ?? 0) })
      .catch(() => setError('Failed to load abandoned checkouts'))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  function copyLink(id: string) {
    const link = `${window.location.origin}/cart`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(cur => (cur === id ? '' : cur)), 2000)
    })
  }

  return (
    <div className="max-w-6xl space-y-5">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-[#4A3F38]">Abandoned checkouts</h1>
        <p className="text-sm text-[#8B7568] mt-1">
          See when customers put an item in their cart but don't check out. Copy a cart link to
          send them a reminder.
        </p>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : loading ? (
        <SkeletonRows count={5} rowClassName="h-12" />
      ) : checkouts.length === 0 ? (
        <p className="text-[#8B7568] text-sm">No abandoned checkouts — nice.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-[#F4EEE8] text-[#8B7568] text-xs font-medium">
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-left px-4 py-3">Items</th>
                <th className="text-right px-4 py-3">Value</th>
                <th className="text-right px-4 py-3">Started</th>
                <th className="text-right px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
              {checkouts.map(cko => (
                <tr key={cko.id} className="hover:bg-[#FAF7F4] transition-colors">
                  <td className="px-5 py-3 text-[#4A3F38] max-w-[200px]">
                    {cko.customer_name || cko.customer_email ? (
                      <>
                        <p className="truncate">{cko.customer_name ?? '—'}</p>
                        <p className="text-[11px] text-[#b0a89f] truncate">{cko.customer_email ?? ''}</p>
                      </>
                    ) : (
                      <span className="text-[#b0a89f] italic">Guest</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#4A3F38] max-w-[280px]">
                    <p className="truncate text-xs">
                      {cko.items.map(it => `${it.product_name} (${it.color_name}, ${it.size}) ×${it.quantity}`).join(', ')}
                    </p>
                    <p className="text-[11px] text-[#b0a89f]">{cko.item_count} item{cko.item_count === 1 ? '' : 's'}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#4A3F38]">
                    EGP {cko.subtotal.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-[#8B7568] text-xs whitespace-nowrap">
                    {fmtDate(cko.created_at)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {cko.customer_email ? (
                      <button
                        onClick={() => copyLink(cko.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[#d8cfc5] text-[#8B7568]
                                   hover:bg-[#ECE3D9] hover:text-[#4A3F38] transition-colors whitespace-nowrap"
                      >
                        {copiedId === cko.id ? 'Copied!' : 'Copy cart link'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#b0a89f]">—</span>
                    )}
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
          <span>Page {page} of {totalPages} · {total} abandoned checkouts</span>
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
