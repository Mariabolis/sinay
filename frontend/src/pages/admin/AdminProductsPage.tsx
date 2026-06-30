import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AdminProduct } from '../../api/admin'
import { adminApi } from '../../api/admin'

const STYLE_LABELS: Record<string, string> = {
  classic_short_sleeve: 'Classic Short Sleeve',
  sleeveless:           'Sleeveless',
  relaxed_shirt:        'Relaxed Shirt',
  shorts:               'Shorts',
  bermuda:              'Bermuda',
  wide_leg:             'Wide Leg',
}

const ALL_STYLES = Object.keys(STYLE_LABELS)

export default function AdminProductsPage() {
  const navigate = useNavigate()

  const [products,  setProducts]  = useState<AdminProduct[]>([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [search,    setSearch]    = useState('')
  const [styleFilter, setStyleFilter] = useState('')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  // Delete modal state
  const [deleting,  setDeleting]  = useState<AdminProduct | null>(null)
  const [deleteErr, setDeleteErr] = useState('')
  const [delBusy,   setDelBusy]   = useState(false)

  const PER_PAGE = 20

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    adminApi.listProducts({ page, per_page: PER_PAGE, search: search || undefined, style: styleFilter || undefined })
      .then(res => {
        setProducts(res.products ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false))
  }, [page, search, styleFilter])

  useEffect(() => { load() }, [load])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [search, styleFilter])

  async function confirmDelete() {
    if (!deleting) return
    setDelBusy(true)
    setDeleteErr('')
    try {
      await adminApi.deleteProduct(deleting.id)
      setDeleting(null)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setDeleteErr(msg ?? 'Delete failed — product may have linked orders')
    } finally {
      setDelBusy(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="max-w-6xl space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#4A3F38]">Products</h1>
        <Link
          to="/admin/products/new"
          className="px-4 py-2 rounded-lg bg-[#8B7568] text-white text-sm font-medium
                     hover:bg-[#7a6659] transition-colors"
        >
          + New Product
        </Link>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-56 border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38]
                     placeholder:text-[#b0a89f] focus:outline-none focus:border-[#8B7568] bg-white"
        />
        <select
          value={styleFilter}
          onChange={e => setStyleFilter(e.target.value)}
          className="border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38]
                     focus:outline-none focus:border-[#8B7568] bg-white"
        >
          <option value="">All styles</option>
          {ALL_STYLES.map(s => (
            <option key={s} value={s}>{STYLE_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : loading ? (
        <p className="text-[#8B7568] text-sm">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-[#8B7568] text-sm">No products found.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F4EEE8] text-[#8B7568] text-xs font-medium">
                <th className="text-left px-5 py-3 w-16">Image</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Style</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
              {products.map(p => (
                <ProductRow
                  key={p.id}
                  product={p}
                  onEdit={() => navigate(`/admin/products/${p.id}/edit`)}
                  onDelete={() => { setDeleteErr(''); setDeleting(p) }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────── */}
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
          <span>Page {page} of {totalPages}</span>
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

      {/* ── Delete confirmation modal ────────────────────────────────────── */}
      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={e => { if (e.target === e.currentTarget) setDeleting(null) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-[#4A3F38] mb-2">Delete product?</h2>
            <p className="text-sm text-[#8B7568] mb-4">
              <strong className="text-[#4A3F38]">"{deleting.name}"</strong> and all its variants will
              be permanently removed. This cannot be undone.
            </p>
            {deleteErr && (
              <p className="text-xs text-red-500 mb-3">{deleteErr}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleting(null)}
                className="px-4 py-2 rounded-lg text-sm text-[#4A3F38] border border-[#d8cfc5]
                           hover:bg-[#ECE3D9] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={delBusy}
                className="px-4 py-2 rounded-lg text-sm bg-red-500 text-white
                           hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {delBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ProductRow ─────────────────────────────────────────────────────────────────

interface ProductRowProps {
  product:  AdminProduct
  onEdit:   () => void
  onDelete: () => void
}

function ProductRow({ product, onEdit, onDelete }: ProductRowProps) {
  // Thumbnail: first variant image, or first variant colour swatch
  const thumbUrl  = product.variants.find(v => v.image_url)?.image_url ?? null
  const thumbHex  = product.variants[0]?.color_hex ?? '#ECE3D9'
  const totalStock = product.variants.reduce((s, v) => s + v.stock_quantity, 0)
  const isActive   = product.is_active && totalStock > 0

  return (
    <tr className="hover:bg-[#FAF7F4] transition-colors">
      <td className="px-5 py-3">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={product.name}
            className="w-10 h-10 object-cover rounded-lg border border-[#F4EEE8]"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-lg border border-[#F4EEE8]"
            style={{ background: thumbHex }}
          />
        )}
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-[#4A3F38]">{product.name}</span>
        <span className="block text-[11px] text-[#b0a89f] font-mono">{product.slug}</span>
      </td>
      <td className="px-4 py-3 text-[#8B7568]">
        {STYLE_LABELS[product.style] ?? product.style}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#ECE3D9] text-[#8B7568]">
          {product.type}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-[#4A3F38]">
        EGP {product.base_price.toFixed(0)}
      </td>
      <td className="px-4 py-3 text-right text-[#4A3F38]">{totalStock}</td>
      <td className="px-4 py-3 text-center">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isActive
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-[#F4EEE8] text-[#b0a89f]'
          }`}
        >
          {isActive ? 'Active' : product.is_active ? 'Out of stock' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onEdit}
            className="text-xs px-2.5 py-1 rounded-md border border-[#d8cfc5] text-[#4A3F38]
                       hover:bg-[#ECE3D9] transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-500
                       hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}
