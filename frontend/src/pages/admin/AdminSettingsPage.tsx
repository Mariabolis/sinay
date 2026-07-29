import { useEffect, useMemo, useState } from 'react'
import type { ShippingZone } from '../../api/admin'
import { adminApi } from '../../api/admin'
import type {
  SizeGuideTopRow, SizeGuideBottomRow, ProductStyleOption, StoreColor, ShippingReturnsCopy,
} from '../../api/products'

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL']

const DEFAULT_CARE_ICON_LABELS = ['Hand wash cold', 'Gentle cycle', 'Do not tumble dry', 'Low heat iron']
const CARE_ICON_HINTS = ['Wash icon', 'Cycle icon', 'Dryer icon', 'Iron icon']

const DEFAULT_SHIPPING_RETURNS: ShippingReturnsCopy = {
  free_shipping: '',
  delivery:      '',
  express:       '',
  returns:       '',
}

// Grouped by region for a cleaner UI
const REGIONS: { label: string; govs: string[] }[] = [
  {
    label: 'Greater Cairo',
    govs:  ['Cairo', 'Giza', 'Qalyubia'],
  },
  {
    label: 'Alexandria & Delta',
    govs:  ['Alexandria', 'Beheira', 'Dakahlia', 'Damietta', 'Gharbiya', 'Kafr El Sheikh', 'Menofia', 'Sharkia'],
  },
  {
    label: 'Canal Zone',
    govs:  ['Ismailia', 'Port Said', 'Suez'],
  },
  {
    label: 'Middle Egypt',
    govs:  ['Beni Suef', 'Fayoum', 'Minya'],
  },
  {
    label: 'Upper Egypt',
    govs:  ['Assiut', 'Aswan', 'Luxor', 'Qena', 'Sohag'],
  },
  {
    label: 'Remote / Border',
    govs:  ['Matruh', 'New Valley', 'North Sinai', 'Red Sea', 'South Sinai'],
  },
]

export default function AdminSettingsPage() {
  const [zones, setZones] = useState<ShippingZone[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.listShipping()
      .then(setZones)
      .catch(() => setError('Failed to load shipping zones'))
  }, [])

  const handleSave = async (governorate: string, fee: number) => {
    const updated = await adminApi.updateShipping(governorate, fee)
    setZones(z => z.map(x => (x.governorate === governorate ? updated : x)))
  }

  const feeMap = Object.fromEntries(zones.map(z => [z.governorate, z.fee]))

  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="max-w-2xl space-y-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#4A3F38]">Shipping Fees</h1>
          <p className="text-sm text-[#8B7568] mt-1">
            Set the delivery fee for each Egyptian governorate. Changes take effect immediately.
          </p>
        </div>

        {REGIONS.map(region => (
          <div key={region.label} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-[#F4EEE8] border-b border-[#ECE3D9]">
              <h2 className="text-xs font-semibold tracking-widest uppercase text-[#8B7568]">
                {region.label}
              </h2>
            </div>
            <div className="divide-y divide-[#F4EEE8]">
              {region.govs.map(gov => (
                <ZoneRow
                  key={gov}
                  governorate={gov}
                  fee={feeMap[gov] ?? 75}
                  onSave={handleSave}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <SizeGuideSettings />
      <ProductStylesSettings />
      <StoreColorsSettings />
      <StorePoliciesSettings />
    </div>
  )
}

// ── Size guide editor ────────────────────────────────────────────────────────

function SizeGuideSettings() {
  const [sizes,    setSizes]    = useState<string[]>(DEFAULT_SIZES)
  const [tops,     setTops]     = useState<SizeGuideTopRow[]>([])
  const [bottoms,  setBottoms]  = useState<SizeGuideBottomRow[]>([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    adminApi.listSettings()
      .then(settings => {
        const sizesRaw    = settings.find(s => s.key === 'available_sizes')?.value
        const topsRaw     = settings.find(s => s.key === 'size_guide_tops')?.value
        const bottomsRaw  = settings.find(s => s.key === 'size_guide_bottoms')?.value
        if (sizesRaw)   setSizes(JSON.parse(sizesRaw))
        if (topsRaw)    setTops(JSON.parse(topsRaw))
        if (bottomsRaw) setBottoms(JSON.parse(bottomsRaw))
      })
      .catch(() => setLoadError('Failed to load size guide'))
  }, [])

  // Rows always mirror the current size list — a new size gets a blank row to
  // fill in, a removed size's row drops out (and is dropped for good next save).
  const topsMerged = useMemo(
    () => sizes.map(size => tops.find(r => r.size === size) ?? { size, chest: '', length: '', shoulder: '' }),
    [sizes, tops],
  )
  const bottomsMerged = useMemo(
    () => sizes.map(size => bottoms.find(r => r.size === size) ?? { size, waist: '', hip: '', inseam: '' }),
    [sizes, bottoms],
  )

  async function saveSizes(next: string[]) {
    await adminApi.updateSetting('available_sizes', JSON.stringify(next))
    setSizes(next)
  }

  if (loadError) return <p className="text-red-500 text-sm">{loadError}</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#4A3F38]">Size Guide</h1>
        <p className="text-sm text-[#8B7568] mt-1">
          Manage which sizes the store offers, and the measurements shown to shoppers in the
          product page's size guide modal, in centimeters.
        </p>
      </div>

      <AvailableSizesEditor sizes={sizes} onChange={saveSizes} />

      <SizeGuideTable
        title="Tops"
        rows={topsMerged}
        columns={[
          { key: 'chest',    label: 'Chest'    },
          { key: 'length',   label: 'Length'   },
          { key: 'shoulder', label: 'Shoulder' },
        ]}
        settingKey="size_guide_tops"
        onSaved={setTops}
      />

      <SizeGuideTable
        title="Bottoms"
        rows={bottomsMerged}
        columns={[
          { key: 'waist',  label: 'Waist'  },
          { key: 'hip',    label: 'Hip'    },
          { key: 'inseam', label: 'Inseam' },
        ]}
        settingKey="size_guide_bottoms"
        onSaved={setBottoms}
      />
    </div>
  )
}

// ── Available sizes editor ───────────────────────────────────────────────────

function AvailableSizesEditor({
  sizes, onChange,
}: { sizes: string[]; onChange: (next: string[]) => Promise<void> }) {
  const [draft,  setDraft]  = useState('')
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState('')

  async function addSize() {
    const value = draft.trim().toUpperCase()
    if (!value) return
    if (sizes.includes(value)) { setError(`"${value}" already exists`); return }
    setBusy(true)
    setError('')
    try {
      await onChange([...sizes, value])
      setDraft('')
    } catch {
      setError('Failed to add size')
    } finally {
      setBusy(false)
    }
  }

  async function removeSize(size: string) {
    setBusy(true)
    setError('')
    try {
      await onChange(sizes.filter(s => s !== size))
    } catch {
      setError('Failed to remove size')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
      <h2 className="text-xs font-semibold tracking-widest uppercase text-[#8B7568]">Available Sizes</h2>
      <div className="flex flex-wrap items-center gap-2">
        {sizes.map(size => (
          <span
            key={size}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4A3F38]
                       bg-[#F4EEE8] border border-[#ECE3D9] rounded-full pl-3 pr-1.5 py-1"
          >
            {size}
            <button
              onClick={() => removeSize(size)}
              disabled={busy}
              aria-label={`Remove ${size}`}
              className="w-4 h-4 flex items-center justify-center rounded-full text-[#8B7568]
                         hover:bg-[#d8cfc5] hover:text-[#4A3F38] disabled:opacity-40 transition-colors"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize() } }}
          placeholder="e.g. 2XL"
          disabled={busy}
          className="w-20 text-sm border-b border-[#d8cfc5] bg-transparent text-[#4A3F38]
                     focus:border-[#8B7568] focus:outline-none transition-colors py-1"
        />
        <button
          onClick={addSize}
          disabled={busy || !draft.trim()}
          className="text-xs px-3 py-1 rounded-lg bg-[#8B7568] text-white
                     hover:bg-[#7a6659] disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SizeGuideTableProps<T extends { size: string }> {
  title:      string
  rows:       T[]
  columns:    { key: keyof T; label: string }[]
  settingKey: string
  onSaved:    (rows: T[]) => void
}

function SizeGuideTable<T extends { size: string }>({
  title, rows, columns, settingKey, onSaved,
}: SizeGuideTableProps<T>) {
  const [draft,  setDraft]  = useState<T[]>(rows)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => { setDraft(rows) }, [rows])

  const dirty = JSON.stringify(draft) !== JSON.stringify(rows)

  function setCell(size: string, key: keyof T, value: string) {
    setDraft(d => d.map(row => (row.size === size ? { ...row, [key]: value } : row)))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      await adminApi.updateSetting(settingKey, JSON.stringify(draft))
      onSaved(draft)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-[#F4EEE8] border-b border-[#ECE3D9] flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[#8B7568]">{title}</h2>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-[#B3564B]">{error}</span>}
          {saved ? (
            <span className="text-xs text-emerald-600">✓ Saved</span>
          ) : (
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="text-xs px-3 py-1 rounded-lg bg-[#8B7568] text-white shrink-0
                         hover:bg-[#7a6659] disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              {saving ? '…' : 'Save'}
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="border-b border-[#F4EEE8] text-[#8B7568] text-xs">
              <th className="text-left px-5 py-2">Size</th>
              {columns.map(col => (
                <th key={String(col.key)} className="text-left px-4 py-2">{col.label} (cm)</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4EEE8]">
            {draft.map(row => (
              <tr key={row.size}>
                <td className="px-5 py-2 font-semibold text-[#4A3F38]">{row.size}</td>
                {columns.map(col => (
                  <td key={String(col.key)} className="px-4 py-2">
                    <input
                      type="text"
                      value={String(row[col.key] ?? '')}
                      onChange={e => setCell(row.size, col.key, e.target.value)}
                      className="w-20 border-b border-[#d8cfc5] bg-transparent text-[#4A3F38]
                                 focus:border-[#8B7568] focus:outline-none transition-colors py-0.5 text-sm"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Product styles editor ────────────────────────────────────────────────────

function ProductStylesSettings() {
  const [top,          setTop]          = useState<ProductStyleOption[]>([])
  const [bottom,        setBottom]       = useState<ProductStyleOption[]>([])
  const [savedTop,      setSavedTop]     = useState<ProductStyleOption[]>([])
  const [savedBottom,   setSavedBottom]  = useState<ProductStyleOption[]>([])
  const [loadError, setLoadError] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    adminApi.listSettings()
      .then(settings => {
        const raw = settings.find(s => s.key === 'product_styles')?.value
        if (!raw) return
        const parsed = JSON.parse(raw)
        setTop(parsed.top ?? []); setSavedTop(parsed.top ?? [])
        setBottom(parsed.bottom ?? []); setSavedBottom(parsed.bottom ?? [])
      })
      .catch(() => setLoadError('Failed to load product styles'))
  }, [])

  const dirty = JSON.stringify({ top, bottom }) !== JSON.stringify({ top: savedTop, bottom: savedBottom })

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      await adminApi.updateSetting('product_styles', JSON.stringify({ top, bottom }))
      setSavedTop(top)
      setSavedBottom(bottom)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaveError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) return <p className="text-red-500 text-sm">{loadError}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#4A3F38]">Product Styles</h1>
          <p className="text-sm text-[#8B7568] mt-1">
            Style options shown when creating a product and filtering the shop.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveError && <span className="text-xs text-[#B3564B]">{saveError}</span>}
          {saved ? (
            <span className="text-xs text-emerald-600 shrink-0">✓ Saved</span>
          ) : (
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="text-xs px-3 py-1 rounded-lg bg-[#8B7568] text-white shrink-0
                         hover:bg-[#7a6659] disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              {saving ? '…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <StyleGroup title="Tops" rows={top} onChange={setTop} />
      <StyleGroup title="Bottoms" rows={bottom} onChange={setBottom} />
    </div>
  )
}

function StyleGroup({
  title, rows, onChange,
}: { title: string; rows: ProductStyleOption[]; onChange: (rows: ProductStyleOption[]) => void }) {
  const [newKey,   setNewKey]   = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [addError, setAddError] = useState('')

  function updateLabel(key: string, label: string) {
    onChange(rows.map(r => (r.key === key ? { ...r, label } : r)))
  }

  function remove(key: string) {
    onChange(rows.filter(r => r.key !== key))
  }

  function add() {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_')
    const label = newLabel.trim()
    if (!key || !label) return
    if (rows.some(r => r.key === key)) { setAddError(`"${key}" already exists`); return }
    setAddError('')
    onChange([...rows, { key, label }])
    setNewKey('')
    setNewLabel('')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-[#F4EEE8] border-b border-[#ECE3D9]">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[#8B7568]">{title}</h2>
      </div>
      <div className="divide-y divide-[#F4EEE8]">
        {rows.map(row => (
          <div key={row.key} className="flex items-center gap-3 px-5 py-2.5">
            <span className="text-xs font-mono text-[#b0a89f] w-40 truncate" title={row.key}>{row.key}</span>
            <input
              type="text"
              value={row.label}
              onChange={e => updateLabel(row.key, e.target.value)}
              className="flex-1 border-b border-[#d8cfc5] bg-transparent text-sm text-[#4A3F38]
                         focus:border-[#8B7568] focus:outline-none transition-colors py-1"
            />
            <button
              onClick={() => remove(row.key)}
              aria-label={`Remove ${row.label}`}
              className="w-5 h-5 flex items-center justify-center rounded-full text-[#8B7568]
                         hover:bg-[#d8cfc5] hover:text-[#4A3F38] transition-colors shrink-0"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-[#FAF7F4]">
        <input
          type="text"
          placeholder="key e.g. cropped"
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          className="w-32 text-xs border-b border-[#d8cfc5] bg-transparent
                     focus:border-[#8B7568] focus:outline-none py-1"
        />
        <input
          type="text"
          placeholder="Label e.g. Cropped"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          className="flex-1 min-w-[120px] text-xs border-b border-[#d8cfc5] bg-transparent
                     focus:border-[#8B7568] focus:outline-none py-1"
        />
        <button
          onClick={add}
          disabled={!newKey.trim() || !newLabel.trim()}
          className="text-xs px-3 py-1 rounded-lg bg-[#8B7568] text-white
                     hover:bg-[#7a6659] disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          Add
        </button>
        {addError && <p className="w-full text-xs text-[#B3564B]">{addError}</p>}
      </div>
    </div>
  )
}

// ── Brand colors editor ──────────────────────────────────────────────────────

function StoreColorsSettings() {
  const [colors,      setColors]      = useState<StoreColor[]>([])
  const [savedColors, setSavedColors] = useState<StoreColor[]>([])
  const [loadError, setLoadError] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [saveError, setSaveError] = useState('')
  const [newHex,  setNewHex]  = useState('#EBCFD2')
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState('')

  useEffect(() => {
    adminApi.listSettings()
      .then(settings => {
        const raw = settings.find(s => s.key === 'store_colors')?.value
        if (!raw) return
        const parsed = JSON.parse(raw)
        setColors(parsed)
        setSavedColors(parsed)
      })
      .catch(() => setLoadError('Failed to load brand colors'))
  }, [])

  const dirty = JSON.stringify(colors) !== JSON.stringify(savedColors)

  function updateName(hex: string, name: string) {
    setColors(cs => cs.map(c => (c.hex === hex ? { ...c, name } : c)))
  }

  function remove(hex: string) {
    setColors(cs => cs.filter(c => c.hex !== hex))
  }

  function add() {
    const name = newName.trim()
    if (!name) return
    if (colors.some(c => c.hex.toLowerCase() === newHex.toLowerCase())) {
      setAddError('That color already exists')
      return
    }
    setAddError('')
    setColors(cs => [...cs, { hex: newHex, name }])
    setNewName('')
  }

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      await adminApi.updateSetting('store_colors', JSON.stringify(colors))
      setSavedColors(colors)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaveError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) return <p className="text-red-500 text-sm">{loadError}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#4A3F38]">Brand Colors</h1>
          <p className="text-sm text-[#8B7568] mt-1">
            The color palette used in the homepage "Build your own" set builder.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveError && <span className="text-xs text-[#B3564B]">{saveError}</span>}
          {saved ? (
            <span className="text-xs text-emerald-600 shrink-0">✓ Saved</span>
          ) : (
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="text-xs px-3 py-1 rounded-lg bg-[#8B7568] text-white shrink-0
                         hover:bg-[#7a6659] disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              {saving ? '…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-[#F4EEE8]">
          {colors.map(c => (
            <div key={c.hex} className="flex items-center gap-3 px-5 py-2.5">
              <input
                type="color"
                value={c.hex}
                readOnly
                className="w-8 h-8 rounded cursor-default border border-[#d8cfc5] p-0.5 bg-white shrink-0"
              />
              <span className="text-xs font-mono text-[#b0a89f] w-20 shrink-0">{c.hex}</span>
              <input
                type="text"
                value={c.name}
                onChange={e => updateName(c.hex, e.target.value)}
                className="flex-1 border-b border-[#d8cfc5] bg-transparent text-sm text-[#4A3F38]
                           focus:border-[#8B7568] focus:outline-none transition-colors py-1"
              />
              <button
                onClick={() => remove(c.hex)}
                aria-label={`Remove ${c.name}`}
                className="w-5 h-5 flex items-center justify-center rounded-full text-[#8B7568]
                           hover:bg-[#d8cfc5] hover:text-[#4A3F38] transition-colors shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-[#FAF7F4]">
          <input
            type="color"
            value={newHex}
            onChange={e => setNewHex(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-[#d8cfc5] p-0.5 bg-white shrink-0"
          />
          <input
            type="text"
            placeholder="Color name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 min-w-[100px] text-xs border-b border-[#d8cfc5] bg-transparent
                       focus:border-[#8B7568] focus:outline-none py-1"
          />
          <button
            onClick={add}
            disabled={!newName.trim()}
            className="text-xs px-3 py-1 rounded-lg bg-[#8B7568] text-white
                       hover:bg-[#7a6659] disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            Add
          </button>
          {addError && <p className="w-full text-xs text-[#B3564B]">{addError}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Store policies editor ────────────────────────────────────────────────────

function StorePoliciesSettings() {
  const [careLabels,      setCareLabels]      = useState<string[]>(DEFAULT_CARE_ICON_LABELS)
  const [savedCareLabels, setSavedCareLabels] = useState<string[]>(DEFAULT_CARE_ICON_LABELS)
  const [copy,      setCopy]      = useState<ShippingReturnsCopy>(DEFAULT_SHIPPING_RETURNS)
  const [savedCopy, setSavedCopy] = useState<ShippingReturnsCopy>(DEFAULT_SHIPPING_RETURNS)
  const [loadError, setLoadError] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    adminApi.listSettings()
      .then(settings => {
        const careRaw = settings.find(s => s.key === 'care_icon_labels')?.value
        const copyRaw = settings.find(s => s.key === 'shipping_returns_copy')?.value
        if (careRaw) { const parsed = JSON.parse(careRaw); setCareLabels(parsed); setSavedCareLabels(parsed) }
        if (copyRaw) { const parsed = JSON.parse(copyRaw); setCopy(parsed); setSavedCopy(parsed) }
      })
      .catch(() => setLoadError('Failed to load store policies'))
  }, [])

  const dirty = JSON.stringify({ careLabels, copy }) !== JSON.stringify({ careLabels: savedCareLabels, copy: savedCopy })

  function setCareLabel(i: number, value: string) {
    setCareLabels(ls => ls.map((l, idx) => (idx === i ? value : l)))
  }

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      await Promise.all([
        adminApi.updateSetting('care_icon_labels', JSON.stringify(careLabels)),
        adminApi.updateSetting('shipping_returns_copy', JSON.stringify(copy)),
      ])
      setSavedCareLabels(careLabels)
      setSavedCopy(copy)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaveError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) return <p className="text-red-500 text-sm">{loadError}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#4A3F38]">Store Policies</h1>
          <p className="text-sm text-[#8B7568] mt-1">
            Shipping, returns, and care-instruction copy shown on every product page.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveError && <span className="text-xs text-[#B3564B]">{saveError}</span>}
          {saved ? (
            <span className="text-xs text-emerald-600 shrink-0">✓ Saved</span>
          ) : (
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="text-xs px-3 py-1 rounded-lg bg-[#8B7568] text-white shrink-0
                         hover:bg-[#7a6659] disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              {saving ? '…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[#8B7568]">Shipping & Returns</h2>
        <PolicyField label="Free shipping line" value={copy.free_shipping} onChange={v => setCopy(c => ({ ...c, free_shipping: v }))} />
        <PolicyField label="Delivery line" value={copy.delivery} onChange={v => setCopy(c => ({ ...c, delivery: v }))} />
        <PolicyField label="Express delivery line" value={copy.express} onChange={v => setCopy(c => ({ ...c, express: v }))} />
        <PolicyField label="Returns line" value={copy.returns} onChange={v => setCopy(c => ({ ...c, returns: v }))} multiline />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[#8B7568]">Care Instructions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {careLabels.map((label, i) => (
            <div key={i}>
              <label className="block text-[11px] text-[#b0a89f] mb-1">{CARE_ICON_HINTS[i] ?? `Icon ${i + 1}`}</label>
              <input
                type="text"
                value={label}
                onChange={e => setCareLabel(i, e.target.value)}
                className="w-full border-b border-[#d8cfc5] bg-transparent text-sm text-[#4A3F38]
                           focus:border-[#8B7568] focus:outline-none transition-colors py-1"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PolicyField({
  label, value, onChange, multiline,
}: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] text-[#b0a89f] mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          className="w-full border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38]
                     focus:outline-none focus:border-[#8B7568] bg-white transition-colors resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-[#d8cfc5] rounded-lg px-3 py-2 text-sm text-[#4A3F38]
                     focus:outline-none focus:border-[#8B7568] bg-white transition-colors"
        />
      )}
    </div>
  )
}

// ── ZoneRow ───────────────────────────────────────────────────────────────────

interface ZoneRowProps {
  governorate: string
  fee:         number
  onSave:      (gov: string, fee: number) => Promise<void>
}

function ZoneRow({ governorate, fee: initialFee, onSave }: ZoneRowProps) {
  const [value,  setValue]  = useState(String(initialFee))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  const dirty = value !== String(initialFee) && value !== ''

  const save = async () => {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) { setError('Enter a valid fee'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(governorate, num)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-4 px-5 py-3 flex-wrap">
      <span className="flex-1 text-sm text-[#4A3F38]">{governorate}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[#8B7568]">EGP</span>
        <input
          type="number"
          min={0}
          step={5}
          className="w-20 text-right text-[#4A3F38] bg-transparent border-b border-[#d8cfc5]
                     focus:border-[#8B7568] focus:outline-none transition-colors py-0.5 text-sm"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
      </div>
      {error && <span className="text-xs text-[#B3564B] w-full text-right">{error}</span>}
      <div className="w-16 text-right">
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
  )
}
