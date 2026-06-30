import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdminCoupon, CouponInput } from '../../api/admin'
import { adminApi } from '../../api/admin'

// ── Status badge ──────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

// ── Form modal ────────────────────────────────────────────────────────────────

interface ModalProps {
  coupon:   AdminCoupon | null  // null = create mode
  onClose:  () => void
  onSaved:  (c: AdminCoupon) => void
}

function CouponModal({ coupon, onClose, onSaved }: ModalProps) {
  const isEdit = coupon !== null

  const [code,     setCode]     = useState(coupon?.code          ?? '')
  const [type,     setType]     = useState<'percent' | 'fixed'>(coupon?.type ?? 'percent')
  const [value,    setValue]    = useState(coupon?.value?.toString() ?? '')
  const [active,   setActive]   = useState(coupon?.active ?? true)
  const [expiry,   setExpiry]   = useState(isoToDateInput(coupon?.expires_at ?? null))
  const [minOrder, setMinOrder] = useState(coupon?.min_order_value?.toString() ?? '')
  const [limit,    setLimit]    = useState(coupon?.usage_limit?.toString() ?? '')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const codeRef = useRef<HTMLInputElement>(null)
  useEffect(() => { codeRef.current?.focus() }, [])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const payload: CouponInput = {
      code:            code.trim().toUpperCase(),
      type,
      value:           parseFloat(value),
      active,
      expires_at:      expiry   ? new Date(expiry + 'T23:59:59').toISOString() : null,
      min_order_value: minOrder ? parseFloat(minOrder) : null,
      usage_limit:     limit    ? parseInt(limit, 10)  : null,
    }

    if (!payload.code) { setError('Code is required'); return }
    if (isNaN(payload.value) || payload.value <= 0) { setError('Value must be greater than 0'); return }
    if (type === 'percent' && payload.value > 100)  { setError('Percentage cannot exceed 100'); return }

    setSaving(true)
    try {
      const result = isEdit
        ? await adminApi.updateCoupon(coupon.id, payload)
        : await adminApi.createCoupon(payload)
      onSaved(result)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-[#4A3F38] mb-5">
          {isEdit ? 'Edit Coupon' : 'New Coupon'}
        </h2>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code + Active */}
          <div className="flex gap-3">
            <Field label="Code" className="flex-1">
              <input
                ref={codeRef}
                required
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="SUMMER20"
                className="input-field"
              />
            </Field>
            <Field label="Active" className="shrink-0 flex flex-col items-start">
              <div className="h-[38px] flex items-center">
                <button
                  type="button"
                  onClick={() => setActive(a => !a)}
                  className={`relative inline-flex w-10 h-5.5 rounded-full transition-colors ${
                    active ? 'bg-emerald-500' : 'bg-[#d8cfc5]'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    active ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </Field>
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select
                value={type}
                onChange={e => setType(e.target.value as 'percent' | 'fixed')}
                className="input-field"
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Flat (EGP)</option>
              </select>
            </Field>
            <Field label={type === 'percent' ? 'Discount %' : 'Discount EGP'}>
              <input
                required
                type="number"
                min={0.01}
                max={type === 'percent' ? 100 : undefined}
                step="0.01"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={type === 'percent' ? '20' : '50'}
                className="input-field"
              />
            </Field>
          </div>

          {/* Min Order + Usage Limit */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Order (EGP)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={minOrder}
                onChange={e => setMinOrder(e.target.value)}
                placeholder="Optional"
                className="input-field"
              />
            </Field>
            <Field label="Usage Limit">
              <input
                type="number"
                min={1}
                step={1}
                value={limit}
                onChange={e => setLimit(e.target.value)}
                placeholder="Unlimited"
                className="input-field"
              />
            </Field>
          </div>

          {/* Expiry */}
          <Field label="Expiry Date">
            <input
              type="date"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              className="input-field"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#8B7568] hover:text-[#4A3F38] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#8B7568] text-white text-sm font-medium rounded-lg
                         hover:bg-[#7a6659] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCouponsPage() {
  const [coupons,   setCoupons]   = useState<AdminCoupon[]>([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  const [modal,     setModal]     = useState<'create' | AdminCoupon | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    adminApi.listCoupons({ per_page: 100 })
      .then(res => { setCoupons(res.coupons ?? []); setTotal(res.total ?? 0) })
      .catch(() => setError('Failed to load coupons'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggle(id: string) {
    setToggling(id)
    try {
      const updated = await adminApi.toggleCoupon(id)
      setCoupons(cs => cs.map(c => c.id === id ? updated : c))
    } catch {
      alert('Failed to toggle coupon')
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this coupon? This cannot be undone.')) return
    setDeleting(id)
    try {
      await adminApi.deleteCoupon(id)
      setCoupons(cs => cs.filter(c => c.id !== id))
      setTotal(t => t - 1)
    } catch {
      alert('Failed to delete coupon')
    } finally {
      setDeleting(null)
    }
  }

  function handleSaved(updated: AdminCoupon) {
    setCoupons(prev => {
      const idx = prev.findIndex(c => c.id === updated.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      setTotal(t => t + 1)
      return [updated, ...prev]
    })
    setModal(null)
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#4A3F38]">
          Coupons
          <span className="ml-2 text-sm font-normal text-[#b0a89f]">{total}</span>
        </h1>
        <button
          onClick={() => setModal('create')}
          className="px-4 py-2 bg-[#8B7568] text-white text-sm font-medium rounded-lg
                     hover:bg-[#7a6659] transition-colors"
        >
          + New Code
        </button>
      </div>

      {error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : loading ? (
        <p className="text-[#8B7568] text-sm">Loading…</p>
      ) : coupons.length === 0 ? (
        <p className="text-[#8B7568] text-sm">No coupon codes yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
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
                  <td className="px-5 py-3 font-mono font-semibold text-[#4A3F38] tracking-wide">
                    {c.code}
                  </td>
                  <td className="px-4 py-3 text-[#4A3F38]">
                    {c.type === 'percent'
                      ? <span className="font-medium">{c.value}%</span>
                      : <span className="font-medium">EGP {c.value.toLocaleString()}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-[#8B7568] text-xs">
                    {c.times_used}
                    {c.usage_limit != null
                      ? <span className="text-[#b0a89f]"> / {c.usage_limit}</span>
                      : <span className="text-[#b0a89f]"> / ∞</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[#8B7568] text-xs">
                    {c.min_order_value != null
                      ? `EGP ${c.min_order_value.toLocaleString()}`
                      : <span className="text-[#b0a89f]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[#8B7568] text-xs whitespace-nowrap">
                    {c.expires_at ? fmtDate(c.expires_at) : <span className="text-[#b0a89f]">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setModal(c)}
                        className="text-xs text-[#8B7568] hover:text-[#4A3F38] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(c.id)}
                        disabled={toggling === c.id}
                        className="text-xs text-[#8B7568] hover:text-[#4A3F38] transition-colors disabled:opacity-40"
                      >
                        {c.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <CouponModal
          coupon={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// ── Small pieces ──────────────────────────────────────────────────────────────

function Field({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold text-[#8B7568] uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}
