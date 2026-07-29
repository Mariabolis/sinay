import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdminCoupon, AdminProduct, CouponInput, DiscountCategory } from '../../api/admin'
import { adminApi } from '../../api/admin'
import InlineError from '../../components/InlineError'
import { SkeletonRows } from '../../components/Skeleton'

const STATUS_BADGE: Record<string, string> = {
  'Active':   'bg-emerald-50 text-emerald-700',
  'Expired':  'bg-red-50     text-red-500',
  'Used Up':  'bg-amber-50   text-amber-700',
  'Disabled': 'bg-[#ECE3D9]  text-[#8B7568]',
}
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_BADGE[status] ?? STATUS_BADGE['Disabled']}`}>
      {status}
    </span>
  )
}

const CATEGORIES: { id: DiscountCategory; title: string; desc: string; icon: string }[] = [
  { id: 'product',  title: 'Amount off products', desc: 'Discount specific products',      icon: '🏷️' },
  { id: 'bxgy',     title: 'Buy X get Y',          desc: 'Buy X items, get Y free',         icon: '🎁' },
  { id: 'order',    title: 'Amount off order',     desc: 'Discount the total order amount', icon: '💰' },
  { id: 'shipping', title: 'Free shipping',        desc: 'Offer free shipping on an order', icon: '🚚' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function isoToDateInput(iso: string | null): string { return iso ? iso.slice(0, 10) : '' }

function discountLabel(c: AdminCoupon): string {
  switch (c.discount_category) {
    case 'order':    return c.type === 'percent' ? `${c.value}%` : `EGP ${c.value.toLocaleString()}`
    case 'product':  return c.type === 'percent' ? `${c.value}% off products` : `EGP ${c.value.toLocaleString()} off products`
    case 'bxgy': {
      const pct = c.get_discount_percent ?? 100
      return pct === 100 ? `Buy ${c.buy_quantity ?? 1} get ${c.get_quantity ?? 1} free` : `Buy ${c.buy_quantity ?? 1} get ${c.get_quantity ?? 1} at ${pct}% off`
    }
    case 'shipping': return 'Free shipping'
  }
}

function ProductSelect({ label, selected, onChange }: { label: string; selected: string[]; onChange: (ids: string[]) => void }) {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { adminApi.listProducts({ per_page: 100 }).then(r => setProducts(r.products)) }, [])
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
  const selectedNames = products.filter(p => selected.includes(p.id)).map(p => p.name)
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  return (
    <div ref={ref} className="relative">
      <span className="block text-[11px] font-semibold text-[#8B7568] uppercase tracking-wide mb-1">{label}</span>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="input-field text-left flex items-center justify-between w-full">
        <span className={selected.length === 0 ? 'text-[#b0a89f]' : 'text-[#4A3F38]'}>
          {selected.length === 0 ? 'Any product' : `${selected.length} product${selected.length > 1 ? 's' : ''} selected`}
        </span>
        <svg className="w-4 h-4 text-[#8B7568] shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-[#d8cfc5] rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-[#F4EEE8]">
            <input autoFocus type="text" placeholder="Search products…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-sm outline-none text-[#4A3F38] placeholder:text-[#b0a89f]" />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0
              ? <p className="px-3 py-3 text-sm text-[#b0a89f] text-center">No products found</p>
              : filtered.map(p => (
                <label key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#FAF7F4] cursor-pointer">
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="accent-[#8B7568]" />
                  <span className="text-[13px] text-[#4A3F38] flex-1">{p.name}</span>
                  <span className="text-[11px] text-[#b0a89f]">EGP {p.base_price}</span>
                </label>
              ))}
          </div>
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-[#F4EEE8] flex justify-between items-center">
              <span className="text-[11px] text-[#8B7568] truncate max-w-[70%]">
                {selectedNames.slice(0, 2).join(', ')}{selectedNames.length > 2 ? ` +${selectedNames.length - 2}` : ''}
              </span>
              <button type="button" onClick={() => onChange([])} className="text-[11px] text-red-400 hover:text-red-600 shrink-0">Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CouponModal({ coupon, onClose, onSaved }: { coupon: AdminCoupon | null; onClose: () => void; onSaved: (c: AdminCoupon) => void }) {
  const isEdit = coupon !== null
  const [category, setCategory] = useState<DiscountCategory>(coupon?.discount_category ?? 'order')
  const [code,     setCode]     = useState(coupon?.code ?? '')
  const [type,     setType]     = useState<'percent' | 'fixed'>(coupon?.type ?? 'percent')
  const [value,    setValue]    = useState(coupon?.value?.toString() ?? '')
  const [active,   setActive]   = useState(coupon?.active ?? true)
  const [expiry,   setExpiry]   = useState(isoToDateInput(coupon?.expires_at ?? null))
  const [minOrder, setMinOrder] = useState(coupon?.min_order_value?.toString() ?? '')
  const [limit,    setLimit]    = useState(coupon?.usage_limit?.toString() ?? '')
  const [appliesTo, setAppliesTo] = useState<string[]>(coupon?.applies_to_products ?? [])
  const [buyQty,   setBuyQty]   = useState(coupon?.buy_quantity?.toString() ?? '1')
  const [buyProds, setBuyProds] = useState<string[]>(coupon?.buy_product_ids ?? [])
  const [getQty,   setGetQty]   = useState(coupon?.get_quantity?.toString() ?? '1')
  const [getProds, setGetProds] = useState<string[]>(coupon?.get_product_ids ?? [])
  const [getPct,   setGetPct]   = useState(coupon?.get_discount_percent?.toString() ?? '100')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const codeRef = useRef<HTMLInputElement>(null)
  useEffect(() => { codeRef.current?.focus() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const payload: CouponInput = {
      code: code.trim().toUpperCase(), discount_category: category,
      active, expires_at: expiry ? new Date(expiry + 'T23:59:59').toISOString() : null,
      usage_limit: limit ? parseInt(limit, 10) : null,
    }
    if (category === 'order' || category === 'product') {
      payload.type = type; payload.value = parseFloat(value)
      if (isNaN(payload.value!) || payload.value! <= 0) { setError('Value must be > 0'); return }
      if (type === 'percent' && payload.value! > 100) { setError('Percentage cannot exceed 100'); return }
      payload.min_order_value = minOrder ? parseFloat(minOrder) : null
      if (category === 'product') payload.applies_to_products = appliesTo
    }
    if (category === 'bxgy') {
      payload.buy_quantity = parseInt(buyQty, 10); payload.buy_product_ids = buyProds
      payload.get_quantity = parseInt(getQty, 10); payload.get_product_ids = getProds
      payload.get_discount_percent = parseFloat(getPct)
    }
    if (category === 'shipping') { payload.min_order_value = minOrder ? parseFloat(minOrder) : null }
    if (!payload.code) { setError('Code is required'); return }
    setSaving(true)
    try {
      const result = isEdit ? await adminApi.updateCoupon(coupon.id, payload) : await adminApi.createCoupon(payload)
      onSaved(result)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Failed to save coupon')
    } finally { setSaving(false) }
  }

  const F = ({ children, label, className = '' }: { children: React.ReactNode; label: string; className?: string }) => (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold text-[#8B7568] uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-2xl px-6 pt-5 pb-3 border-b border-[#F4EEE8]">
          <h2 className="text-base font-semibold text-[#4A3F38]">{isEdit ? 'Edit Coupon' : 'New Coupon'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && <p className="text-sm text-red-500">{error}</p>}

          {!isEdit ? (
            <div>
              <p className="text-[11px] font-semibold text-[#8B7568] uppercase tracking-wide mb-2">Discount type</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${category === cat.id ? 'border-[#8B7568] bg-[#FAF7F4] ring-1 ring-[#8B7568]' : 'border-[#d8cfc5] hover:border-[#8B7568]/50'}`}>
                    <span className="text-xl block mb-1">{cat.icon}</span>
                    <span className="block text-[12.5px] font-semibold text-[#4A3F38] leading-tight">{cat.title}</span>
                    <span className="block text-[11px] text-[#8B7568] mt-0.5">{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#F4EEE8] rounded-lg">
              <span className="text-base">{CATEGORIES.find(c => c.id === category)?.icon}</span>
              <span className="text-[13px] font-medium text-[#4A3F38]">{CATEGORIES.find(c => c.id === category)?.title}</span>
            </div>
          )}

          <div className="flex gap-3">
            <F label="Code" className="flex-1">
              <input ref={codeRef} required value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="SUMMER20" className="input-field font-mono tracking-widest" />
            </F>
            <F label="Active" className="shrink-0">
              <div className="h-[38px] flex items-center">
                <button type="button" onClick={() => setActive(a => !a)}
                  className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-[#d8cfc5]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </F>
          </div>

          {(category === 'order' || category === 'product') && (<>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Type">
                <select value={type} onChange={e => setType(e.target.value as 'percent' | 'fixed')} className="input-field">
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Flat (EGP)</option>
                </select>
              </F>
              <F label={type === 'percent' ? 'Discount %' : 'Discount EGP'}>
                <input required type="number" min={0.01} max={type === 'percent' ? 100 : undefined}
                  step="0.01" value={value} onChange={e => setValue(e.target.value)}
                  placeholder={type === 'percent' ? '20' : '50'} className="input-field" />
              </F>
            </div>
            {category === 'product' && (
              <ProductSelect label="Apply to — empty = all products" selected={appliesTo} onChange={setAppliesTo} />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Min Order (EGP)">
                <input type="number" min={0} step="0.01" value={minOrder} onChange={e => setMinOrder(e.target.value)} placeholder="Optional" className="input-field" />
              </F>
              <F label="Usage Limit">
                <input type="number" min={1} step={1} value={limit} onChange={e => setLimit(e.target.value)} placeholder="Unlimited" className="input-field" />
              </F>
            </div>
            <F label="Expiry Date">
              <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="input-field" />
            </F>
          </>)}

          {category === 'bxgy' && (<>
            <div className="bg-[#F4EEE8] rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-semibold text-[#8B7568] uppercase tracking-wide">Customer buys</p>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-[#4A3F38] shrink-0">Minimum quantity</span>
                <input type="number" min={1} value={buyQty} onChange={e => setBuyQty(e.target.value)} className="input-field w-20" />
              </div>
              <ProductSelect label="From these products (empty = any)" selected={buyProds} onChange={setBuyProds} />
            </div>
            <div className="bg-[#F4EEE8] rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-semibold text-[#8B7568] uppercase tracking-wide">Customer gets</p>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-[#4A3F38] shrink-0">Quantity</span>
                <input type="number" min={1} value={getQty} onChange={e => setGetQty(e.target.value)} className="input-field w-20" />
              </div>
              <ProductSelect label="Of these products (empty = cheapest in cart)" selected={getProds} onChange={setGetProds} />
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-[#4A3F38] shrink-0">Discount % (100 = free)</span>
                <input type="number" min={1} max={100} value={getPct} onChange={e => setGetPct(e.target.value)} className="input-field w-20" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Expiry Date">
                <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="input-field" />
              </F>
              <F label="Usage Limit">
                <input type="number" min={1} step={1} value={limit} onChange={e => setLimit(e.target.value)} placeholder="Unlimited" className="input-field" />
              </F>
            </div>
          </>)}

          {category === 'shipping' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Min Order (EGP)">
                <input type="number" min={0} step="0.01" value={minOrder} onChange={e => setMinOrder(e.target.value)} placeholder="Optional" className="input-field" />
              </F>
              <F label="Expiry Date">
                <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="input-field" />
              </F>
              <F label="Usage Limit">
                <input type="number" min={1} step={1} value={limit} onChange={e => setLimit(e.target.value)} placeholder="Unlimited" className="input-field" />
              </F>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1 border-t border-[#F4EEE8]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#8B7568] hover:text-[#4A3F38] transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-[#8B7568] text-white text-sm font-medium rounded-lg hover:bg-[#7a6659] disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminCouponsPage() {
  const [coupons,  setCoupons]  = useState<AdminCoupon[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [modal,    setModal]    = useState<'create' | AdminCoupon | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [listErr,  setListErr]  = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    adminApi.listCoupons({ per_page: 100 })
      .then(res => { setCoupons(res.coupons ?? []); setTotal(res.total ?? 0) })
      .catch(() => setError('Failed to load coupons'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  async function handleToggle(id: string) {
    setToggling(id)
    setListErr('')
    try { const u = await adminApi.toggleCoupon(id); setCoupons(cs => cs.map(c => c.id === id ? u : c)) }
    catch { setListErr('Failed to toggle coupon.') } finally { setToggling(null) }
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete this coupon? This cannot be undone.')) return
    setDeleting(id)
    setListErr('')
    try { await adminApi.deleteCoupon(id); setCoupons(cs => cs.filter(c => c.id !== id)); setTotal(t => t - 1) }
    catch { setListErr('Failed to delete coupon.') } finally { setDeleting(null) }
  }
  function handleSaved(updated: AdminCoupon) {
    setCoupons(prev => {
      const idx = prev.findIndex(c => c.id === updated.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next }
      setTotal(t => t + 1)
      return [updated, ...prev]
    })
    setModal(null)
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#4A3F38]">
          Coupons <span className="ml-1 text-sm font-normal text-[#b0a89f]">{total}</span>
        </h1>
        <button onClick={() => setModal('create')}
          className="px-4 py-2 bg-[#8B7568] text-white text-sm font-medium rounded-lg hover:bg-[#7a6659] transition-colors">
          + New Code
        </button>
      </div>

      {listErr && (
        <p className="text-sm text-[#B3564B] bg-[#B3564B]/8 rounded-lg px-4 py-2.5">{listErr}</p>
      )}

      {error ? <InlineError message={error} onRetry={load} />
      : loading ? <SkeletonRows count={5} rowClassName="h-12" />
      : coupons.length === 0 ? <p className="text-[#8B7568] text-sm">No coupon codes yet.</p>
      : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="border-b border-[#F4EEE8] text-[#8B7568] text-xs font-medium">
                <th className="text-left px-5 py-3">Code</th>
                <th className="text-left px-4 py-3">Discount</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Uses</th>
                <th className="text-right px-4 py-3">Min Order</th>
                <th className="text-right px-4 py-3">Expires</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-[#FAF7F4] transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono font-semibold text-[#4A3F38] tracking-wide">{c.code}</span>
                    <span className="ml-2 text-sm">{CATEGORIES.find(x => x.id === c.discount_category)?.icon}</span>
                  </td>
                  <td className="px-4 py-3 text-[#4A3F38] font-medium text-[13px]">{discountLabel(c)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-right text-[#8B7568] text-xs">
                    {c.times_used}{c.usage_limit != null ? <span className="text-[#b0a89f]"> / {c.usage_limit}</span> : <span className="text-[#b0a89f]"> / ∞</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[#8B7568] text-xs">
                    {c.min_order_value != null ? `EGP ${c.min_order_value.toLocaleString()}` : <span className="text-[#b0a89f]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[#8B7568] text-xs whitespace-nowrap">
                    {c.expires_at ? fmtDate(c.expires_at) : <span className="text-[#b0a89f]">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setModal(c)} className="text-xs text-[#8B7568] hover:text-[#4A3F38] transition-colors">Edit</button>
                      <button onClick={() => handleToggle(c.id)} disabled={toggling === c.id}
                        className="text-xs text-[#8B7568] hover:text-[#4A3F38] transition-colors disabled:opacity-40">
                        {c.active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <CouponModal coupon={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
