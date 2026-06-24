import { useEffect, useState } from 'react'
import type { AdminProduct, AdminVariant } from '../../api/admin'
import { adminApi } from '../../api/admin'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [error, setError]       = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    adminApi.listProducts()
      .then(setProducts)
      .catch(() => setError('Failed to load products'))
  }, [])

  const toggleExpand = (id: string) =>
    setExpanded(prev => (prev === id ? null : id))

  const handleProductSave = async (id: string, name: string, price: number, isActive: boolean) => {
    try {
      const updated = await adminApi.updateProduct(id, { name, base_price: price, is_active: isActive })
      setProducts(ps => ps.map(p => (p.id === id ? updated : p)))
      return true
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Save failed'
      alert(`Error: ${msg}`)
      return false
    }
  }

  const handleVariantSave = async (variantId: string, stock: number, priceOverride: number | null) => {
    try {
      const updated = await adminApi.updateVariant(variantId, {
        stock_quantity: stock,
        price_override: priceOverride,
      })
      setProducts(ps =>
        ps.map(p => ({
          ...p,
          variants: p.variants.map(v => (v.id === variantId ? updated : v)),
        }))
      )
      return true
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Save failed'
      alert(`Error: ${msg}`)
      return false
    }
  }

  if (error)            return <p className="text-red-500">{error}</p>
  if (!products.length) return <p className="text-[#8B7568]">Loading…</p>

  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold text-[#4A3F38]">Products</h1>

      <div className="space-y-3">
        {products.map(p => (
          <ProductRow
            key={p.id}
            product={p}
            expanded={expanded === p.id}
            onToggle={() => toggleExpand(p.id)}
            onProductSave={handleProductSave}
            onVariantSave={handleVariantSave}
          />
        ))}
      </div>
    </div>
  )
}

// ── ProductRow ─────────────────────────────────────────────────────────────────

interface ProductRowProps {
  product:        AdminProduct
  expanded:       boolean
  onToggle:       () => void
  onProductSave:  (id: string, name: string, price: number, isActive: boolean) => Promise<boolean>
  onVariantSave:  (variantId: string, stock: number, priceOverride: number | null) => Promise<boolean>
}

function ProductRow({ product, expanded, onToggle, onProductSave, onVariantSave }: ProductRowProps) {
  const [editName,   setEditName]   = useState(product.name)
  const [editPrice,  setEditPrice]  = useState(product.base_price.toString())
  const [editActive, setEditActive] = useState(product.is_active)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  const dirty =
    editName !== product.name ||
    parseFloat(editPrice) !== product.base_price ||
    editActive !== product.is_active

  const save = async () => {
    setSaving(true)
    const ok = await onProductSave(product.id, editName, parseFloat(editPrice) || 0, editActive)
    setSaving(false)
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <button
          onClick={onToggle}
          className="text-[#8B7568] text-lg leading-none select-none"
        >
          {expanded ? '▾' : '▸'}
        </button>

        {/* Name */}
        <input
          className="flex-1 text-sm font-medium text-[#4A3F38] bg-transparent border-b border-transparent
                     focus:border-[#8B7568] focus:outline-none py-0.5 transition-colors"
          value={editName}
          onChange={e => setEditName(e.target.value)}
        />

        {/* Type badge */}
        <span className="text-xs uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#ECE3D9] text-[#8B7568]">
          {product.type}
        </span>

        {/* Base price */}
        <label className="flex items-center gap-1 text-sm text-[#8B7568]">
          EGP
          <input
            type="number"
            className="w-20 text-right text-[#4A3F38] bg-transparent border-b border-transparent
                       focus:border-[#8B7568] focus:outline-none py-0.5 transition-colors"
            value={editPrice}
            onChange={e => setEditPrice(e.target.value)}
          />
        </label>

        {/* Active toggle */}
        <label className="flex items-center gap-1.5 text-xs text-[#8B7568] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={editActive}
            onChange={e => setEditActive(e.target.checked)}
            className="accent-[#8B7568]"
          />
          Active
        </label>

        {/* Save button */}
        <div className="flex items-center gap-2 w-20 justify-end">
          {saved ? (
            <span className="text-xs text-emerald-600">✓ Saved</span>
          ) : (
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="text-xs px-3 py-1 rounded-lg bg-[#8B7568] text-white
                         hover:bg-[#7a6659] disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              {saving ? '…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* Variants sub-table */}
      {expanded && (
        <div className="border-t border-[#F4EEE8] px-5 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#8B7568]">
                <th className="text-left py-1.5 pr-3 font-medium">Color</th>
                <th className="text-left py-1.5 pr-3 font-medium">Size</th>
                <th className="text-left py-1.5 pr-3 font-medium">SKU</th>
                <th className="text-right py-1.5 pr-3 font-medium">Price Override</th>
                <th className="text-right py-1.5 font-medium">Stock</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
              {product.variants.map(v => (
                <VariantRow key={v.id} variant={v} onSave={onVariantSave} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── VariantRow ─────────────────────────────────────────────────────────────────

interface VariantRowProps {
  variant:  AdminVariant
  onSave:   (variantId: string, stock: number, priceOverride: number | null) => Promise<boolean>
}

function VariantRow({ variant, onSave }: VariantRowProps) {
  const [stock,         setStock]         = useState(variant.stock_quantity.toString())
  const [priceOverride, setPriceOverride] = useState(
    variant.price_override != null ? variant.price_override.toString() : ''
  )
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const dirty =
    parseInt(stock, 10) !== variant.stock_quantity ||
    (priceOverride === '' ? null : parseFloat(priceOverride)) !== variant.price_override

  const save = async () => {
    setSaving(true)
    const ok = await onSave(variant.id, parseInt(stock, 10) || 0, priceOverride !== '' ? parseFloat(priceOverride) : null)
    setSaving(false)
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <tr>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3.5 h-3.5 rounded-full border border-[#d8cfc5]"
            style={{ background: variant.color_hex }}
          />
          <span className="text-[#4A3F38]">{variant.color_name}</span>
        </div>
      </td>
      <td className="py-2 pr-3 text-[#4A3F38]">{variant.size}</td>
      <td className="py-2 pr-3 text-[#8B7568] font-mono">{variant.sku}</td>
      <td className="py-2 pr-3 text-right">
        <input
          type="number"
          className="w-20 text-right text-[#4A3F38] bg-transparent border-b border-transparent
                     focus:border-[#8B7568] focus:outline-none transition-colors"
          placeholder="—"
          value={priceOverride}
          onChange={e => setPriceOverride(e.target.value)}
        />
      </td>
      <td className="py-2 text-right">
        <input
          type="number"
          className="w-14 text-right text-[#4A3F38] bg-transparent border-b border-transparent
                     focus:border-[#8B7568] focus:outline-none transition-colors"
          value={stock}
          onChange={e => setStock(e.target.value)}
        />
      </td>
      <td className="py-2 pl-3 text-xs text-right">
        {saved ? (
          <span className="text-emerald-600">✓</span>
        ) : (
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="px-2.5 py-0.5 rounded-md bg-[#8B7568] text-white text-[11px]
                       hover:bg-[#7a6659] disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            {saving ? '…' : 'Save'}
          </button>
        )}
      </td>
    </tr>
  )
}
