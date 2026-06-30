import { useEffect, useState } from 'react'
import { addressesApi, profileApi, type Address, type AddressInput } from '../api/account'
import { useAuthStore } from '../store/authStore'

const inputCls =
  'w-full border border-[#DDD5CC] rounded-xl px-4 py-2.5 text-[14px] text-ink ' +
  'placeholder:text-mocha/35 focus:outline-none focus:border-mocha/50 bg-white transition-colors'

export default function AccountPage() {
  return (
    <div className="max-w-[680px] mx-auto px-5 py-10 font-body space-y-10">
      <h1 className="font-logo text-[28px] text-ink">My Account</h1>
      <ProfileSection />
      <AddressesSection />
    </div>
  )
}

// ── Profile ───────────────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [phone,    setPhone]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

  const dirty = fullName !== (user?.full_name ?? '') || phone !== ''

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!dirty) return
    setSaving(true)
    setError('')
    try {
      const updated = await profileApi.update({
        full_name: fullName.trim() || undefined,
        phone:     phone.trim()    || undefined,
      })
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, full_name: updated.full_name }, accessToken, refreshToken)
      }
      setPhone('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Could not save — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2 className="text-[13px] font-semibold text-mocha/60 uppercase tracking-[0.08em] mb-4">
        Profile
      </h2>
      <div className="bg-white rounded-2xl border border-[#EDE7E0] p-6">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Email — read-only */}
          <div>
            <label className="block text-xs text-mocha/50 mb-1">Email</label>
            <input
              readOnly
              value={user?.email ?? ''}
              className={inputCls + ' opacity-60 cursor-not-allowed'}
            />
          </div>

          <div>
            <label className="block text-xs text-mocha/50 mb-1">Full Name</label>
            <input
              className={inputCls}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-xs text-mocha/50 mb-1">New Phone Number</label>
            <input
              type="tel"
              className={inputCls}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Enter to update"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={!dirty || saving}
              className="px-5 py-2.5 rounded-xl bg-mocha text-cream text-sm font-medium
                         hover:bg-mocha/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saved && <span className="text-sm text-emerald-600">✓ Saved</span>}
          </div>
        </form>
      </div>
    </section>
  )
}

// ── Addresses ─────────────────────────────────────────────────────────────────

function AddressesSection() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)

  useEffect(() => {
    addressesApi.list()
      .then(setAddresses)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    await addressesApi.delete(id)
    setAddresses(prev => prev.filter(a => a.id !== id))
  }

  function handleCreated(addr: Address) {
    setAddresses(prev => [...prev, addr])
    setShowForm(false)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold text-mocha/60 uppercase tracking-[0.08em]">
          Saved Addresses
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-semibold text-mocha hover:underline underline-offset-2"
          >
            + Add New
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-mocha/50">Loading…</p>}

      <div className="space-y-3">
        {addresses.map(addr => (
          <div
            key={addr.id}
            className="bg-white rounded-2xl border border-[#EDE7E0] px-5 py-4 flex items-start justify-between gap-3"
          >
            <div className="text-[13px] text-ink leading-relaxed">
              {addr.label && (
                <p className="text-xs font-semibold text-mocha/60 uppercase tracking-wide mb-1">
                  {addr.label}
                </p>
              )}
              <p>{addr.full_name}</p>
              <p className="text-mocha/60">{addr.phone}</p>
              <p className="text-mocha/60">
                {[addr.street, addr.building, addr.city, addr.governorate]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {addr.notes && <p className="text-mocha/45 text-xs mt-1">{addr.notes}</p>}
            </div>
            <button
              onClick={() => handleDelete(addr.id)}
              className="text-xs text-mocha/35 hover:text-red-400 shrink-0 transition-colors mt-0.5"
              title="Remove address"
            >
              ✕
            </button>
          </div>
        ))}

        {!loading && addresses.length === 0 && !showForm && (
          <p className="text-sm text-mocha/40 text-center py-6">
            No saved addresses yet.
          </p>
        )}
      </div>

      {showForm && (
        <AddressForm
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}
    </section>
  )
}

// ── AddressForm ───────────────────────────────────────────────────────────────

function AddressForm({ onCreated, onCancel }: { onCreated: (a: Address) => void; onCancel: () => void }) {
  const empty: AddressInput = {
    label: '', full_name: '', phone: '', governorate: '',
    city: '', street: '', building: '', notes: '', is_default: false,
  }
  const [form,   setForm]   = useState<AddressInput>(empty)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(field: keyof AddressInput, val: string | boolean) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const created = await addressesApi.create(form)
      onCreated(created)
    } catch {
      setError('Could not save address — please check all required fields.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-[#EDE7E0] p-6 mt-3 space-y-3"
    >
      <p className="text-[13px] font-semibold text-ink mb-2">New Address</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
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
          <input className={inputCls} value={form.governorate} onChange={e => set('governorate', e.target.value)} required />
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
        <div className="col-span-2">
          <label className="block text-xs text-mocha/50 mb-1">Delivery Notes</label>
          <input className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Ring bell twice" />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-mocha text-cream text-sm font-medium
                     hover:bg-mocha/90 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Address'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-[#DDD5CC] text-sm text-ink
                     hover:bg-[#F4EEE8] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
