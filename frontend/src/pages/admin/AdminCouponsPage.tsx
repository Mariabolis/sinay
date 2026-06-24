import React, { useEffect, useState } from 'react'
import type { AdminCoupon } from '../../api/admin'
import { adminApi } from '../../api/admin'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [error, setError]     = useState('')

  // form
  const [code,      setCode]      = useState('')
  const [type,      setType]      = useState<'percent' | 'fixed'>('percent')
  const [value,     setValue]     = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [creating,  setCreating]  = useState(false)
  const [formErr,   setFormErr]   = useState('')

  useEffect(() => {
    adminApi.listCoupons()
      .then(setCoupons)
      .catch(() => setError('Failed to load coupons'))
  }, [])

  const handleCreate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormErr('')
    if (!code.trim() || !value) {
      setFormErr('Code and value are required')
      return
    }
    setCreating(true)
    try {
      const payload: Parameters<typeof adminApi.createCoupon>[0] = {
        code:  code.trim(),
        type,
        value: parseFloat(value),
      }
      if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString()
      const created = await adminApi.createCoupon(payload)
      setCoupons(cs => [created, ...cs])
      setCode(''); setValue(''); setExpiresAt('')
    } catch {
      setFormErr('Failed to create coupon — code may already exist')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id: string) => {
    try {
      const res = await adminApi.toggleCoupon(id) as { active: boolean }
      setCoupons(cs => cs.map(c => (c.id === id ? { ...c, active: res.active } : c)))
    } catch {
      alert('Failed to toggle coupon')
    }
  }

  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold text-[#4A3F38]">Coupons</h1>

      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className="bg-white rounded-xl shadow-sm p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-[#4A3F38] uppercase tracking-wide">
          New Coupon
        </h2>

        {formErr && <p className="text-sm text-red-500">{formErr}</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Code">
            <input
              required
              className="input-field"
              placeholder="SUMMER20"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
            />
          </Field>

          <Field label="Type">
            <select
              className="input-field"
              value={type}
              onChange={e => setType(e.target.value as 'percent' | 'fixed')}
            >
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed (EGP)</option>
            </select>
          </Field>

          <Field label={type === 'percent' ? 'Discount %' : 'Discount EGP'}>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              className="input-field"
              placeholder={type === 'percent' ? '20' : '50'}
              value={value}
              onChange={e => setValue(e.target.value)}
            />
          </Field>

          <Field label="Expires At (optional)">
            <input
              type="date"
              className="input-field"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="px-5 py-2 bg-[#8B7568] text-white text-sm font-medium rounded-lg
                     hover:bg-[#7a6659] disabled:opacity-50 transition-colors"
        >
          {creating ? 'Creating…' : 'Create Coupon'}
        </button>
      </form>

      {/* Coupon list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#ECE3D9] text-[#4A3F38]">
            <tr>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Discount</th>
              <th className="text-left px-4 py-3">Expires</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4EEE8]">
            {coupons.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[#8B7568] text-sm">
                  No coupons yet.
                </td>
              </tr>
            )}
            {coupons.map(c => (
              <tr key={c.id} className="hover:bg-[#faf8f5]">
                <td className="px-4 py-3 font-mono font-medium text-[#4A3F38]">{c.code}</td>
                <td className="px-4 py-3 text-[#4A3F38]">
                  {c.type === 'percent' ? `${c.value}%` : `EGP ${c.value}`}
                </td>
                <td className="px-4 py-3 text-[#8B7568]">
                  {c.expires_at
                    ? new Date(c.expires_at).toLocaleDateString('en-EG', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-[#ECE3D9] text-[#8B7568]'
                  }`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleToggle(c.id)}
                    className="text-xs text-[#8B7568] underline hover:text-[#4A3F38] transition-colors"
                  >
                    {c.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[#8B7568] font-medium uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}
