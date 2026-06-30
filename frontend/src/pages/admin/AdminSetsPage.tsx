import React, { useEffect, useState } from 'react'
import type { AdminReadySet, AdminProduct } from '../../api/admin'
import { adminApi } from '../../api/admin'

// Unique colors per product, with total stock per color
function colorsOf(p: AdminProduct) {
  const seen  = new Set<string>()
  const stock = new Map<string, number>()
  for (const v of p.variants) {
    stock.set(v.color_hex, (stock.get(v.color_hex) ?? 0) + v.stock_quantity)
  }
  const out: { hex: string; name: string; representativeId: string; totalStock: number }[] = []
  for (const v of p.variants) {
    if (!seen.has(v.color_hex)) {
      seen.add(v.color_hex)
      out.push({ hex: v.color_hex, name: v.color_name, representativeId: v.id, totalStock: stock.get(v.color_hex) ?? 0 })
    }
  }
  return out
}

export default function AdminSetsPage() {
  const [sets,     setSets]     = useState<AdminReadySet[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [error,    setError]    = useState('')

  // form
  const [name,      setName]      = useState('')
  const [topProdId, setTopProdId] = useState('')
  const [topVarId,  setTopVarId]  = useState('')  // representative variant (any size of chosen color)
  const [botProdId, setBotProdId] = useState('')
  const [botVarId,  setBotVarId]  = useState('')
  const [price,     setPrice]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [formErr,   setFormErr]   = useState('')

  useEffect(() => {
    Promise.all([adminApi.listSets(), adminApi.listProducts({ per_page: 100 })])
      .then(([s, p]) => { setSets(s); setProducts(p.products ?? []) })
      .catch(() => setError('Failed to load data'))
  }, [])

  const tops    = products.filter(p => p.type === 'top')
  const bottoms = products.filter(p => p.type === 'bottom')

  const topColors = tops.find(p => p.id === topProdId) ? colorsOf(tops.find(p => p.id === topProdId)!) : []
  const botColors = bottoms.find(p => p.id === botProdId) ? colorsOf(bottoms.find(p => p.id === botProdId)!) : []

  const handleCreate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormErr('')
    if (!name.trim() || !topVarId || !botVarId || !price) {
      setFormErr('All fields are required')
      return
    }
    setSaving(true)
    try {
      const created = await adminApi.createSet({
        name:              name.trim(),
        top_variant_id:    topVarId,
        bottom_variant_id: botVarId,
        price:             parseFloat(price),
      })
      setSets(s => [created, ...s])
      setName(''); setTopProdId(''); setTopVarId(''); setBotProdId(''); setBotVarId(''); setPrice('')
    } catch {
      setFormErr('Failed to create set')
    } finally {
      setSaving(false)
    }
  }

  const handlePriceSave = async (id: string, val: string) => {
    const p = parseFloat(val)
    if (isNaN(p)) return
    try {
      const updated = await adminApi.updateSet(id, { price: p })
      setSets(s => s.map(x => (x.id === id ? updated : x)))
    } catch { alert('Failed to update price') }
  }

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const updated = await adminApi.updateSet(id, { is_active: !current })
      setSets(s => s.map(x => (x.id === id ? updated : x)))
    } catch { alert('Failed to toggle set') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this set?')) return
    try {
      await adminApi.deleteSet(id)
      setSets(s => s.filter(x => x.id !== id))
    } catch { alert('Failed to delete set') }
  }

  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold text-[#4A3F38]">Sets</h1>
      <p className="text-sm text-[#8B7568] -mt-4">
        Define a top + bottom combination. Customers choose their own size when ordering.
      </p>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[#4A3F38] uppercase tracking-wide">New Set</h2>
        {formErr && <p className="text-sm text-red-500">{formErr}</p>}

        {/* Name */}
        <div>
          <SLabel>Set Name</SLabel>
          <input
            required
            className="input-field mt-1"
            placeholder="e.g. Dusty Pink Night Set"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <p className="text-xs text-[#8B7568]">Top and bottom can have different colors.</p>

        <div className="grid grid-cols-2 gap-6">
          {/* ── Top ── */}
          <div className="space-y-3">
            <SLabel>Top — Product</SLabel>
            <select
              required
              className="input-field"
              value={topProdId}
              onChange={e => { setTopProdId(e.target.value); setTopVarId('') }}
            >
              <option value="">— choose top —</option>
              {tops.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {topProdId && (
              <>
                <SLabel>Top — Color</SLabel>
                <div className="flex flex-wrap gap-2">
                  {topColors.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setTopVarId(c.representativeId)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                        topVarId === c.representativeId
                          ? 'border-[#8B7568] bg-[#ECE3D9] font-medium'
                          : 'border-[#d8cfc5] hover:border-[#8B7568]'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full inline-block border border-white/50 shadow-sm"
                            style={{ background: c.hex }} />
                      {c.name}
                      {c.totalStock === 0 && (
                        <span className="text-red-400 text-[10px] font-medium">OOS</span>
                      )}
                    </button>
                  ))}
                </div>
                {topVarId && topColors.find(c => c.representativeId === topVarId)?.totalStock === 0 && (
                  <p className="text-xs text-amber-600">
                    ⚠ هذا اللون مش متاح دلوقتي — السيت مش هيظهر للكستومر لحد ما يتضاف ستوك.
                  </p>
                )}
              </>
            )}
          </div>

          {/* ── Bottom ── */}
          <div className="space-y-3">
            <SLabel>Bottom — Product</SLabel>
            <select
              required
              className="input-field"
              value={botProdId}
              onChange={e => { setBotProdId(e.target.value); setBotVarId('') }}
            >
              <option value="">— choose bottom —</option>
              {bottoms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {botProdId && (
              <>
                <SLabel>Bottom — Color</SLabel>
                <div className="flex flex-wrap gap-2">
                  {botColors.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setBotVarId(c.representativeId)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                        botVarId === c.representativeId
                          ? 'border-[#8B7568] bg-[#ECE3D9] font-medium'
                          : 'border-[#d8cfc5] hover:border-[#8B7568]'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full inline-block border border-white/50 shadow-sm"
                            style={{ background: c.hex }} />
                      {c.name}
                      {c.totalStock === 0 && (
                        <span className="text-red-400 text-[10px] font-medium">OOS</span>
                      )}
                    </button>
                  ))}
                </div>
                {botVarId && botColors.find(c => c.representativeId === botVarId)?.totalStock === 0 && (
                  <p className="text-xs text-amber-600">
                    ⚠ هذا اللون مش متاح دلوقتي — السيت مش هيظهر للكستومر لحد ما يتضاف ستوك.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="w-40">
          <SLabel>Set Price (EGP)</SLabel>
          <input
            required
            type="number"
            min={0}
            step="1"
            className="input-field mt-1"
            placeholder="700"
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !topVarId || !botVarId}
          className="px-5 py-2 bg-[#8B7568] text-white text-sm font-medium rounded-lg
                     hover:bg-[#7a6659] disabled:opacity-40 transition-colors"
        >
          {saving ? 'Creating…' : 'Create Set'}
        </button>
      </form>

      {/* Sets list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#ECE3D9] text-[#4A3F38]">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Top</th>
              <th className="text-left px-4 py-3">Bottom</th>
              <th className="text-right px-4 py-3">Price (EGP)</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4EEE8]">
            {sets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[#8B7568] text-sm">
                  No sets yet.
                </td>
              </tr>
            )}
            {sets.map(s => (
              <SetRow
                key={s.id}
                set={s}
                onPriceSave={handlePriceSave}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── SetRow ─────────────────────────────────────────────────────────────────────

interface SetRowProps {
  set:          AdminReadySet
  onPriceSave:  (id: string, val: string) => Promise<void>
  onToggle:     (id: string, current: boolean) => Promise<void>
  onDelete:     (id: string) => Promise<void>
}

function SetRow({ set, onPriceSave, onToggle, onDelete }: SetRowProps) {
  const [editPrice, setEditPrice] = useState(set.price.toString())
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  const dirty = parseFloat(editPrice) !== set.price

  const handleSave = async () => {
    setSaving(true)
    await onPriceSave(set.id, editPrice)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <tr className="hover:bg-[#faf8f5]">
      <td className="px-4 py-3 font-medium text-[#4A3F38]">{set.name}</td>
      <td className="px-4 py-3">
        <ColorChip v={set.top_variant} />
      </td>
      <td className="px-4 py-3">
        <ColorChip v={set.bottom_variant} />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <input
            type="number"
            className="w-20 text-right text-[#4A3F38] bg-transparent border-b border-transparent
                       focus:border-[#8B7568] focus:outline-none transition-colors"
            value={editPrice}
            onChange={e => setEditPrice(e.target.value)}
          />
          {saved ? (
            <span className="text-xs text-emerald-600">✓</span>
          ) : (
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="text-xs px-2.5 py-0.5 rounded-md bg-[#8B7568] text-white
                         hover:bg-[#7a6659] disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              {saving ? '…' : 'Save'}
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggle(set.id, set.is_active)}
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            set.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-[#ECE3D9] text-[#8B7568]'
          }`}
        >
          {set.is_active ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDelete(set.id)}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          Delete
        </button>
      </td>
    </tr>
  )
}

function ColorChip({ v }: { v: { product_name: string; color_name: string; color_hex: string } }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-[#4A3F38]">
      <span className="w-3 h-3 rounded-full inline-block border border-[#d8cfc5] shrink-0"
            style={{ background: v.color_hex }} />
      <span>{v.product_name}</span>
      <span className="text-[#8B7568]">· {v.color_name}</span>
    </div>
  )
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-[#8B7568] font-medium uppercase tracking-wide">{children}</span>
}
