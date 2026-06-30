import { useEffect, useMemo, useState } from 'react'
import type { InventoryItem } from '../../api/admin'
import { adminApi } from '../../api/admin'

type FilterMode = 'all' | 'low' | 'oos'

const STYLE_LABELS: Record<string, string> = {
  classic_short_sleeve: 'Short-sleeve',
  sleeveless:           'Sleeveless',
  relaxed_shirt:        'Relaxed shirt',
  shorts:               'Shorts',
  bermuda:              'Bermuda',
  wide_leg:             'Wide-leg',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminInventoryPage() {
  const [items,     setItems]     = useState<InventoryItem[]>([])
  const [threshold, setThreshold] = useState(5)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  // filters
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')

  // threshold editing
  const [thresholdEdit,   setThresholdEdit]   = useState('')
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [thresholdSaved,  setThresholdSaved]  = useState(false)

  useEffect(() => {
    adminApi.listInventory()
      .then(res => {
        setItems(res.items)
        setThreshold(res.threshold)
        setThresholdEdit(String(res.threshold))
      })
      .catch(() => setError('Failed to load inventory'))
      .finally(() => setLoading(false))
  }, [])

  // ── derived counts ────────────────────────────────────────────────────────

  const oosCount  = useMemo(() => items.filter(i => i.is_out_of_stock).length,  [items])
  const lowCount  = useMemo(() => items.filter(i => i.is_low_stock).length,     [items])

  // ── filtered + searched list ──────────────────────────────────────────────

  const visible = useMemo(() => {
    let list = items
    if (filter === 'low') list = list.filter(i => i.is_low_stock)
    if (filter === 'oos') list = list.filter(i => i.is_out_of_stock)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(i => i.product_name.toLowerCase().includes(q))
    return list
  }, [items, filter, search])

  // ── threshold save ────────────────────────────────────────────────────────

  async function saveThreshold() {
    const n = parseInt(thresholdEdit, 10)
    if (isNaN(n) || n < 0) return
    setSavingThreshold(true)
    try {
      await adminApi.updateSetting('low_stock_threshold', String(n))
      setThreshold(n)
      // Re-derive flags for all items with the new threshold
      setItems(prev => prev.map(item => {
        const oos     = item.is_out_of_stock
        const lowStock = !oos && item.stock_quantity <= n
        return { ...item, is_low_stock: lowStock }
      }))
      setThresholdSaved(true)
      setTimeout(() => setThresholdSaved(false), 2000)
    } catch {
      alert('Failed to save threshold')
    } finally {
      setSavingThreshold(false)
    }
  }

  // ── stock update (called from row) ────────────────────────────────────────

  function handleStockUpdate(variantId: string, qty: number, flags: { is_out_of_stock: boolean; is_low_stock: boolean }) {
    setItems(prev => prev.map(item =>
      item.variant_id === variantId
        ? { ...item, stock_quantity: qty, is_out_of_stock: flags.is_out_of_stock, is_low_stock: flags.is_low_stock }
        : item,
    ))
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (error) return <p className="text-red-500 text-sm">{error}</p>

  return (
    <div className="max-w-5xl space-y-5">
      <h1 className="text-2xl font-semibold text-[#4A3F38]">Inventory</h1>

      {/* ── Alert banner ──────────────────────────────────────────────── */}
      {!loading && (oosCount > 0 || lowCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {oosCount > 0 && (
            <button
              onClick={() => setFilter('oos')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                filter === 'oos'
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-[#d8cfc5] text-[#4A3F38] hover:bg-red-50 hover:border-red-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {oosCount} out of stock
            </button>
          )}
          {lowCount > 0 && (
            <button
              onClick={() => setFilter('low')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                filter === 'low'
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-[#d8cfc5] text-[#4A3F38] hover:bg-amber-50 hover:border-amber-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              {lowCount} low on stock
            </button>
          )}
        </div>
      )}

      {/* ── Controls row ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <input
          type="search"
          placeholder="Search product…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-48 border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38]
                     placeholder:text-[#b0a89f] focus:outline-none focus:border-[#8B7568] bg-white"
        />

        {/* Filter chips */}
        <div className="flex gap-1.5">
          {(['all', 'low', 'oos'] as FilterMode[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filter === f
                  ? 'bg-[#8B7568] text-white'
                  : 'bg-white border border-[#d8cfc5] text-[#8B7568] hover:bg-[#ECE3D9]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'low' ? 'Low stock' : 'Out of stock'}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Threshold editor */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#8B7568] text-xs">Low-stock threshold:</span>
          <input
            type="number"
            min={0}
            value={thresholdEdit}
            onChange={e => setThresholdEdit(e.target.value)}
            className="w-14 border border-[#d8cfc5] rounded-lg px-2 py-1 text-sm text-center
                       text-[#4A3F38] focus:outline-none focus:border-[#8B7568] bg-white"
          />
          {thresholdSaved ? (
            <span className="text-xs text-emerald-600">✓ Saved</span>
          ) : (
            <button
              onClick={saveThreshold}
              disabled={savingThreshold || parseInt(thresholdEdit, 10) === threshold}
              className="px-3 py-1 text-xs rounded-lg bg-[#8B7568] text-white
                         hover:bg-[#7a6659] disabled:opacity-30 transition-colors"
            >
              {savingThreshold ? '…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-[#8B7568] text-sm">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-[#8B7568] text-sm">No items match.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-[#F4EEE8] text-[#8B7568] text-xs font-medium">
                <th className="text-left px-5 py-3">Product</th>
                <th className="text-left px-4 py-3">Style</th>
                <th className="text-left px-4 py-3">Colour</th>
                <th className="text-center px-4 py-3">Size</th>
                <th className="text-center px-4 py-3 w-36">Stock</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
              {visible.map(item => (
                <InventoryRow
                  key={item.variant_id}
                  item={item}
                  onUpdate={handleStockUpdate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (
        <p className="text-xs text-[#b0a89f]">
          {visible.length} of {items.length} variants
        </p>
      )}
    </div>
  )
}

// ── Row component ─────────────────────────────────────────────────────────────

interface InventoryRowProps {
  item:     InventoryItem
  onUpdate: (variantId: string, qty: number, flags: { is_out_of_stock: boolean; is_low_stock: boolean }) => void
}

function InventoryRow({ item, onUpdate }: InventoryRowProps) {
  const [editValue, setEditValue] = useState(String(item.stock_quantity))
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [saveError, setSaveError] = useState('')

  const dirty = parseInt(editValue, 10) !== item.stock_quantity && editValue !== ''

  async function save() {
    const qty = parseInt(editValue, 10)
    if (isNaN(qty) || qty < 0) { setSaveError('Invalid'); return }
    setSaving(true)
    setSaveError('')
    try {
      const res = await adminApi.updateStock(item.variant_id, qty)
      onUpdate(item.variant_id, res.stock_quantity, { is_out_of_stock: res.is_out_of_stock, is_low_stock: res.is_low_stock })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaveError('Failed')
    } finally {
      setSaving(false)
    }
  }

  function handleBlur() {
    if (dirty) save()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') setEditValue(String(item.stock_quantity))
  }

  return (
    <tr className="hover:bg-[#FAF7F4] transition-colors">
      <td className="px-5 py-3 font-medium text-[#4A3F38]">{item.product_name}</td>
      <td className="px-4 py-3 text-[#8B7568] text-xs">
        {STYLE_LABELS[item.style] ?? item.style}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded-full border border-[#d8cfc5] shrink-0"
            style={{ background: item.color_hex }}
          />
          <span className="text-[#4A3F38] text-xs">{item.color_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center text-[#4A3F38] font-semibold text-xs">{item.size}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <input
            type="number"
            min={0}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKey}
            className={`w-16 text-center border rounded-lg px-2 py-1 text-sm transition-colors
                        focus:outline-none ${
              saveError
                ? 'border-red-400 text-red-600'
                : dirty
                ? 'border-[#8B7568] text-[#4A3F38]'
                : 'border-[#d8cfc5] text-[#4A3F38]'
            }`}
          />
          <div className="w-6 text-center">
            {saving ? (
              <span className="text-xs text-[#b0a89f]">…</span>
            ) : saved ? (
              <span className="text-xs text-emerald-600">✓</span>
            ) : saveError ? (
              <span className="text-xs text-red-500">!</span>
            ) : dirty ? (
              <button
                onClick={save}
                className="text-xs text-[#8B7568] hover:text-[#4A3F38] transition-colors font-medium"
              >
                ↵
              </button>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <StockBadge item={item} />
      </td>
    </tr>
  )
}

function StockBadge({ item }: { item: InventoryItem }) {
  if (item.is_out_of_stock) {
    return (
      <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600">
        Out of stock
      </span>
    )
  }
  if (item.is_low_stock) {
    return (
      <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
        Low stock
      </span>
    )
  }
  return (
    <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
      In stock
    </span>
  )
}
