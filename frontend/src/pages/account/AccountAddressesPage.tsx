import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { addressesApi, type Address, type AddressInput } from '../../api/account'
import { GOVERNORATES } from '../../lib/governorates'
import { SkeletonBlock } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import InlineError from '../../components/InlineError'

const inputCls =
  'w-full border border-[#DDD5CC] rounded-xl px-4 py-2.5 text-[14px] text-ink ' +
  'placeholder:text-mocha/35 focus:outline-none focus:border-mocha/50 bg-white transition-colors'

const EMPTY: AddressInput = {
  label: '', full_name: '', phone: '', governorate: '',
  city: '', street: '', building: '', notes: '', is_default: false,
}

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState<Address | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    addressesApi.list().then(setAddresses).catch(() => setLoadError(true)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    await addressesApi.delete(id)
    setAddresses(prev => prev.filter(a => a.id !== id))
  }

  async function handleSetDefault(addr: Address) {
    const updated = await addressesApi.update(addr.id, {
      label:       addr.label ?? undefined,
      full_name:   addr.full_name ?? '',
      phone:       addr.phone ?? '',
      governorate: addr.governorate ?? '',
      city:        addr.city ?? '',
      street:      addr.street ?? '',
      building:    addr.building ?? undefined,
      notes:       addr.notes ?? undefined,
      is_default:  true,
    })
    setAddresses(prev => prev.map(a => (a.id === updated.id ? updated : { ...a, is_default: false })))
  }

  function handleSaved(addr: Address) {
    setAddresses(prev => {
      const exists = prev.some(a => a.id === addr.id)
      const next = exists ? prev.map(a => (a.id === addr.id ? addr : a)) : [...prev, addr]
      return addr.is_default ? next.map(a => (a.id === addr.id ? a : { ...a, is_default: false })) : next
    })
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-logo text-[24px] text-ink">Saved Addresses</h1>
          <p className="text-[13px] text-mocha/55 mt-1">Manage where your orders get delivered.</p>
        </div>
        {!showForm && !editing && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-semibold text-mocha hover:underline underline-offset-2"
          >
            + Add New
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          <SkeletonBlock className="h-24 w-full rounded-2xl" />
          <SkeletonBlock className="h-24 w-full rounded-2xl" />
        </div>
      )}

      {!loading && loadError && (
        <InlineError message="We couldn't load your addresses." onRetry={load} />
      )}

      <div className="space-y-3">
        {!loading && !loadError && addresses.map(addr => editing?.id === addr.id ? (
          <AddressForm key={addr.id} initial={addr} onSaved={handleSaved} onCancel={() => setEditing(null)} />
        ) : (
          <div
            key={addr.id}
            className="bg-white rounded-2xl border border-[#EDE7E0] px-5 py-4 flex items-start justify-between gap-3"
          >
            <div className="text-[13px] text-ink leading-relaxed">
              <div className="flex items-center gap-2 mb-1">
                {addr.label && (
                  <p className="text-xs font-semibold text-mocha/60 uppercase tracking-wide">{addr.label}</p>
                )}
                {addr.is_default && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Default</span>
                )}
              </div>
              <p>{addr.full_name}</p>
              <p className="text-mocha/60">{addr.phone}</p>
              <p className="text-mocha/60">
                {[addr.street, addr.building, addr.city, addr.governorate].filter(Boolean).join(', ')}
              </p>
              {addr.notes && <p className="text-mocha/45 text-xs mt-1">{addr.notes}</p>}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setEditing(addr)} className="text-xs text-mocha/60 hover:text-mocha transition-colors">Edit</button>
                <button onClick={() => handleDelete(addr.id)} className="text-xs text-mocha/35 hover:text-red-400 transition-colors">Remove</button>
              </div>
              {!addr.is_default && (
                <button onClick={() => handleSetDefault(addr)} className="text-[11px] text-mocha/50 hover:text-mocha underline underline-offset-2 transition-colors">
                  Set as default
                </button>
              )}
            </div>
          </div>
        ))}

        {!loading && !loadError && addresses.length === 0 && !showForm && (
          <EmptyState message="No saved addresses yet" subtext="Add one to speed up checkout next time." />
        )}
      </div>

      {showForm && (
        <AddressForm onSaved={handleSaved} onCancel={() => setShowForm(false)} />
      )}
    </div>
  )
}

// ── AddressForm ───────────────────────────────────────────────────────────────

function AddressForm({
  initial, onSaved, onCancel,
}: { initial?: Address; onSaved: (a: Address) => void; onCancel: () => void }) {
  const [form, setForm] = useState<AddressInput>(
    initial
      ? {
          label: initial.label ?? '', full_name: initial.full_name ?? '', phone: initial.phone ?? '',
          governorate: initial.governorate ?? '', city: initial.city ?? '', street: initial.street ?? '',
          building: initial.building ?? '', notes: initial.notes ?? '', is_default: initial.is_default,
        }
      : EMPTY,
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(field: keyof AddressInput, val: string | boolean) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = initial ? await addressesApi.update(initial.id, form) : await addressesApi.create(form)
      onSaved(saved)
    } catch {
      setError('Could not save address — please check all required fields.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#EDE7E0] p-6 space-y-3">
      <p className="text-[13px] font-semibold text-ink mb-2">{initial ? 'Edit Address' : 'New Address'}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-mocha/50 mb-1">Label (optional)</label>
          <input className={inputCls} value={form.label} onChange={e => set('label', e.target.value)} placeholder="Home, Work…" />
        </div>
        <div>
          <label className="block text-xs text-mocha/50 mb-1">Full Name *</label>
          <input className={inputCls} value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-mocha/50 mb-1">Phone *</label>
          <input type="tel" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-mocha/50 mb-1">Governorate *</label>
          <select className={inputCls} value={form.governorate} onChange={e => set('governorate', e.target.value)} required>
            <option value="">Select…</option>
            {GOVERNORATES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-mocha/50 mb-1">City *</label>
          <input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-mocha/50 mb-1">Street *</label>
          <input className={inputCls} value={form.street} onChange={e => set('street', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-mocha/50 mb-1">Building / Apt</label>
          <input className={inputCls} value={form.building} onChange={e => set('building', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-mocha/50 mb-1">Delivery Notes</label>
          <input className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Ring bell twice" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="is_default"
            checked={form.is_default}
            onChange={e => set('is_default', e.target.checked)}
            className="accent-mocha"
          />
          <label htmlFor="is_default" className="text-xs text-mocha/70">Set as default address</label>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-mocha text-cream text-sm font-medium hover:bg-mocha/90 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Address'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-[#DDD5CC] text-sm text-ink hover:bg-[#F4EEE8] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
