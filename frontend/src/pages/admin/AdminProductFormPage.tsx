import { useEffect, useId, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { AdminVariantInput } from '../../api/admin'
import { adminApi } from '../../api/admin'
import ImageUploader from '../../components/admin/ImageUploader'

// ── constants ─────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = ['top', 'bottom', 'set'] as const

const STYLES_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  top: [
    { value: 'classic_short_sleeve', label: 'Classic Short Sleeve' },
    { value: 'sleeveless',           label: 'Sleeveless'           },
    { value: 'relaxed_shirt',        label: 'Relaxed Shirt'        },
  ],
  bottom: [
    { value: 'shorts',    label: 'Shorts'    },
    { value: 'bermuda',   label: 'Bermuda'   },
    { value: 'wide_leg',  label: 'Wide Leg'  },
  ],
  set: [
    { value: 'classic_short_sleeve', label: 'Classic Short Sleeve' },
    { value: 'sleeveless',           label: 'Sleeveless'           },
    { value: 'relaxed_shirt',        label: 'Relaxed Shirt'        },
    { value: 'shorts',               label: 'Shorts'               },
    { value: 'bermuda',              label: 'Bermuda'               },
    { value: 'wide_leg',             label: 'Wide Leg'             },
  ],
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

// ── types ─────────────────────────────────────────────────────────────────────

interface VariantDraft extends AdminVariantInput {
  _key: string  // stable client-side key for React list rendering
}

interface ProductDraft {
  name:        string
  slug:        string
  type:        string
  style:       string
  base_price:  string
  is_active:   boolean
  description: string
  fabric:      string
  care_notes:  string
}

// ── helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

let _keyCounter = 0
function nextKey() {
  return String(++_keyCounter)
}

function emptyVariant(): VariantDraft {
  return {
    _key:          nextKey(),
    color_name:    '',
    color_hex:     '#EBCFD2',
    size:          'M',
    sku:           '',
    price_override: null,
    stock_quantity: 0,
    image_url:     null,
  }
}

// ── Field components ──────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8B7568] mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38] ' +
  'placeholder:text-[#b0a89f] focus:outline-none focus:border-[#8B7568] bg-white transition-colors'

const textareaCls = inputCls + ' resize-none'

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminProductFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit   = !!id

  const formId = useId()

  const [draft, setDraft] = useState<ProductDraft>({
    name:        '',
    slug:        '',
    type:        'top',
    style:       'classic_short_sleeve',
    base_price:  '',
    is_active:   true,
    description: '',
    fabric:      '',
    care_notes:  '',
  })

  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()])

  const [loading,  setLoading]  = useState(isEdit)
  const [saving,   setSaving]   = useState(false)
  const [errors,   setErrors]   = useState<string[]>([])

  // Load product when editing
  useEffect(() => {
    if (!id) return
    adminApi.getProduct(id)
      .then(p => {
        setDraft({
          name:        p.name,
          slug:        p.slug,
          type:        p.type,
          style:       p.style,
          base_price:  String(p.base_price),
          is_active:   p.is_active,
          description: p.description,
          fabric:      p.fabric,
          care_notes:  p.care_notes,
        })
        setVariants(
          p.variants.map(v => ({
            _key:           nextKey(),
            id:             v.id,
            color_name:     v.color_name,
            color_hex:      v.color_hex,
            size:           v.size,
            sku:            v.sku,
            price_override: v.price_override,
            stock_quantity: v.stock_quantity,
            image_url:      v.image_url,
          }))
        )
      })
      .catch(() => navigate('/admin/products', { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  // Auto-generate slug from name when not editing
  function handleNameChange(name: string) {
    setDraft(d => ({
      ...d,
      name,
      slug: isEdit ? d.slug : slugify(name),
    }))
  }

  // When type changes, reset style to first option of that type
  function handleTypeChange(type: string) {
    const styles = STYLES_BY_TYPE[type] ?? []
    setDraft(d => ({ ...d, type, style: styles[0]?.value ?? '' }))
  }

  // ── Variant helpers ──────────────────────────────────────────────────────────

  function updateVariant(key: string, patch: Partial<VariantDraft>) {
    setVariants(vs => vs.map(v => v._key === key ? { ...v, ...patch } : v))
  }

  function addVariant() {
    setVariants(vs => [...vs, emptyVariant()])
  }

  function removeVariant(key: string) {
    setVariants(vs => vs.filter(v => v._key !== key))
  }

  // Auto-generate SKU for a variant when color or size change (only if SKU is empty or was auto)
  function autoSKU(productSlug: string, colorName: string, size: string) {
    return [
      productSlug,
      colorName.trim().toLowerCase().replace(/\s+/g, '-'),
      size.toLowerCase(),
    ].filter(Boolean).join('-')
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  function validate(): string[] {
    const errs: string[] = []
    if (!draft.name.trim())                       errs.push('Product name is required')
    if (!draft.slug.trim())                       errs.push('Slug is required')
    if (!draft.type)                              errs.push('Type is required')
    if (!draft.style)                             errs.push('Style is required')
    if (!draft.base_price || parseFloat(draft.base_price) <= 0)
                                                  errs.push('Base price must be greater than 0')
    if (variants.length === 0)                    errs.push('At least one variant is required')

    const combos = new Set<string>()
    variants.forEach((v, i) => {
      if (!v.color_name.trim()) errs.push(`Variant ${i + 1}: color name is required`)
      if (!v.color_hex.trim())  errs.push(`Variant ${i + 1}: color hex is required`)
      if (!v.size)              errs.push(`Variant ${i + 1}: size is required`)
      if (!v.sku.trim())        errs.push(`Variant ${i + 1}: SKU is required`)
      const combo = `${v.color_name.toLowerCase()}|${v.size}`
      if (combos.has(combo))    errs.push(`Duplicate color + size combo: ${v.color_name} / ${v.size}`)
      combos.add(combo)
    })
    return errs
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    setSaving(true)

    const payload = {
      name:        draft.name.trim(),
      slug:        draft.slug.trim(),
      type:        draft.type,
      style:       draft.style,
      base_price:  parseFloat(draft.base_price),
      is_active:   draft.is_active,
      description: draft.description.trim(),
      fabric:      draft.fabric.trim(),
      care_notes:  draft.care_notes.trim(),
      variants:    variants.map(({ _key, ...v }) => v),
    }

    try {
      if (isEdit && id) {
        await adminApi.updateProduct(id, payload)
      } else {
        await adminApi.createProduct(payload)
      }
      navigate('/admin/products')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErrors([msg ?? 'Save failed — please try again'])
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return <p className="text-[#8B7568] text-sm">Loading…</p>
  }

  const styleOptions = STYLES_BY_TYPE[draft.type] ?? []

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/products')}
          className="text-[#8B7568] hover:text-[#4A3F38] transition-colors text-sm"
        >
          ← Products
        </button>
        <h1 className="text-2xl font-semibold text-[#4A3F38]">
          {isEdit ? 'Edit Product' : 'New Product'}
        </h1>
      </div>

      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        {/* ── Product info card ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#4A3F38] uppercase tracking-wide">
            Product Info
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" required>
              <input
                className={inputCls}
                value={draft.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Linen Crop Top"
              />
            </Field>

            <Field label="Slug" required>
              <input
                className={inputCls + ' font-mono text-[13px]'}
                value={draft.slug}
                onChange={e => setDraft(d => ({ ...d, slug: e.target.value }))}
                placeholder="linen-crop-top"
              />
            </Field>

            <Field label="Type" required>
              <select
                className={inputCls}
                value={draft.type}
                onChange={e => handleTypeChange(e.target.value)}
              >
                {PRODUCT_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </Field>

            <Field label="Style" required>
              <select
                className={inputCls}
                value={draft.style}
                onChange={e => setDraft(d => ({ ...d, style: e.target.value }))}
              >
                {styleOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Base Price (EGP)" required>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={draft.base_price}
                onChange={e => setDraft(d => ({ ...d, base_price: e.target.value }))}
                placeholder="299"
              />
            </Field>

            <Field label="Status">
              <label className="flex items-center gap-2 h-[38px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))}
                  className="accent-[#8B7568] w-4 h-4"
                />
                <span className="text-sm text-[#4A3F38]">Active (visible to customers)</span>
              </label>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              rows={3}
              className={textareaCls}
              value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="Short product description shown on the detail page…"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fabric">
              <input
                className={inputCls}
                value={draft.fabric}
                onChange={e => setDraft(d => ({ ...d, fabric: e.target.value }))}
                placeholder="e.g. 100% Egyptian Cotton"
              />
            </Field>

            <Field label="Care Notes">
              <input
                className={inputCls}
                value={draft.care_notes}
                onChange={e => setDraft(d => ({ ...d, care_notes: e.target.value }))}
                placeholder="e.g. Machine wash cold, gentle cycle"
              />
            </Field>
          </div>
        </div>

        {/* ── Variants card ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#4A3F38] uppercase tracking-wide">
              Variants <span className="text-[#b0a89f] normal-case font-normal">({variants.length})</span>
            </h2>
            <button
              type="button"
              onClick={addVariant}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#d8cfc5] text-[#4A3F38]
                         hover:bg-[#ECE3D9] transition-colors"
            >
              + Add Variant
            </button>
          </div>

          {variants.length === 0 ? (
            <p className="text-sm text-[#b0a89f] text-center py-4">
              No variants yet — click "Add Variant" to start.
            </p>
          ) : (
            <div className="space-y-4">
              {variants.map((v, idx) => (
                <VariantRow
                  key={v._key}
                  variant={v}
                  index={idx}
                  productSlug={draft.slug}
                  autoSKU={autoSKU}
                  onChange={patch => updateVariant(v._key, patch)}
                  onRemove={() => removeVariant(v._key)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Validation errors ────────────────────────────────────────── */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-600 mb-1">Please fix the following:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {errors.map((e, i) => (
                <li key={i} className="text-xs text-red-500">{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pb-10">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="px-5 py-2 rounded-lg text-sm text-[#4A3F38] border border-[#d8cfc5]
                       hover:bg-[#ECE3D9] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm bg-[#8B7568] text-white font-medium
                       hover:bg-[#7a6659] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── VariantRow ─────────────────────────────────────────────────────────────────

interface VariantRowProps {
  variant:     VariantDraft
  index:       number
  productSlug: string
  autoSKU:     (slug: string, color: string, size: string) => string
  onChange:    (patch: Partial<VariantDraft>) => void
  onRemove:    () => void
}

function VariantRow({ variant, index, productSlug, autoSKU, onChange, onRemove }: VariantRowProps) {
  const inputCls =
    'w-full border border-[#d8cfc5] rounded-lg px-2.5 py-1.5 text-xs text-[#4A3F38] ' +
    'placeholder:text-[#b0a89f] focus:outline-none focus:border-[#8B7568] bg-white transition-colors'

  function handleColorChange(colorName: string) {
    const sku = variant.id ? variant.sku : autoSKU(productSlug, colorName, variant.size)
    onChange({ color_name: colorName, sku })
  }

  function handleSizeChange(size: string) {
    const sku = variant.id ? variant.sku : autoSKU(productSlug, variant.color_name, size)
    onChange({ size, sku })
  }

  return (
    <div className="border border-[#F4EEE8] rounded-xl p-4 relative">
      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        title="Remove variant"
        className="absolute top-3 right-3 text-[#b0a89f] hover:text-red-400 transition-colors text-xs leading-none"
      >
        ✕
      </button>

      <p className="text-[11px] font-medium text-[#8B7568] uppercase tracking-wide mb-3">
        Variant {index + 1}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Color name */}
        <div>
          <label className="block text-[11px] text-[#b0a89f] mb-1">Color Name *</label>
          <input
            className={inputCls}
            value={variant.color_name}
            onChange={e => handleColorChange(e.target.value)}
            placeholder="Dusty Pink"
          />
        </div>

        {/* Color hex */}
        <div>
          <label className="block text-[11px] text-[#b0a89f] mb-1">Color Hex *</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={variant.color_hex}
              onChange={e => onChange({ color_hex: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-[#d8cfc5] p-0.5 bg-white"
            />
            <input
              className={inputCls}
              value={variant.color_hex}
              onChange={e => onChange({ color_hex: e.target.value })}
              placeholder="#EBCFD2"
              maxLength={7}
            />
          </div>
        </div>

        {/* Size */}
        <div>
          <label className="block text-[11px] text-[#b0a89f] mb-1">Size *</label>
          <select
            className={inputCls}
            value={variant.size}
            onChange={e => handleSizeChange(e.target.value)}
          >
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* SKU */}
        <div>
          <label className="block text-[11px] text-[#b0a89f] mb-1">SKU *</label>
          <input
            className={inputCls + ' font-mono'}
            value={variant.sku}
            onChange={e => onChange({ sku: e.target.value })}
            placeholder="auto-generated"
          />
        </div>

        {/* Stock */}
        <div>
          <label className="block text-[11px] text-[#b0a89f] mb-1">Stock Qty</label>
          <input
            type="number"
            min="0"
            className={inputCls}
            value={variant.stock_quantity}
            onChange={e => onChange({ stock_quantity: parseInt(e.target.value) || 0 })}
          />
        </div>

        {/* Price override */}
        <div>
          <label className="block text-[11px] text-[#b0a89f] mb-1">Price Override (EGP)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={variant.price_override ?? ''}
            onChange={e => onChange({ price_override: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="— same as base"
          />
        </div>
      </div>

      {/* Image uploader — full width below the grid */}
      <div className="mt-3">
        <label className="block text-[11px] text-[#b0a89f] mb-1">Product Image</label>
        <ImageUploader
          value={variant.image_url ?? ''}
          onChange={url => onChange({ image_url: url || null })}
        />
      </div>
    </div>
  )
}
