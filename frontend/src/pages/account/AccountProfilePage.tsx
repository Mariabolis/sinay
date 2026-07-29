import { useState, type FormEvent } from 'react'
import { AxiosError } from 'axios'
import { profileApi } from '../../api/account'
import { useAuthStore } from '../../store/authStore'

const inputCls =
  'w-full border border-[#DDD5CC] rounded-xl px-4 py-2.5 text-[14px] text-ink ' +
  'placeholder:text-mocha/35 focus:outline-none focus:border-mocha/50 bg-white transition-colors'

export default function AccountProfilePage() {
  const { user, accessToken, refreshToken, setAuth } = useAuthStore()

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [email,    setEmail]    = useState(user?.email ?? '')
  const [phone,    setPhone]    = useState('')
  const [currentPassword, setCurrentPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [toast,  setToast]  = useState(false)

  const emailChanged = email.trim() !== (user?.email ?? '')
  const dirty = fullName !== (user?.full_name ?? '') || phone !== '' || emailChanged

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!dirty || saving) return
    setSaving(true)
    setError('')
    try {
      const updated = await profileApi.update({
        full_name: fullName.trim() || undefined,
        phone:     phone.trim()    || undefined,
        email:            emailChanged ? email.trim() : undefined,
        current_password: emailChanged ? currentPassword : undefined,
      })
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, full_name: updated.full_name, email: updated.email }, accessToken, refreshToken)
      }
      setCurrentPassword('')
      setPhone('')
      setToast(true)
      setTimeout(() => setToast(false), 2500)
    } catch (err) {
      setError(
        err instanceof AxiosError
          ? (err.response?.data?.error ?? 'Something went wrong')
          : 'Something went wrong',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-logo text-[24px] text-ink">Personal Info</h1>
        <p className="text-[13px] text-mocha/55 mt-1">Update your name, email, and phone number.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#EDE7E0] p-6 space-y-4 max-w-[480px]">
        {error && (
          <p className="text-[12.5px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <label className="block text-xs font-medium text-mocha/60 mb-1.5">Full Name</label>
          <input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
        </div>

        <div>
          <label className="block text-xs font-medium text-mocha/60 mb-1.5">Email</label>
          <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        {emailChanged && (
          <div>
            <label className="block text-xs font-medium text-mocha/60 mb-1.5">
              Current Password <span className="text-mocha/40">(required to change email)</span>
            </label>
            <input
              type="password"
              className={inputCls}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-mocha/60 mb-1.5">Phone</label>
          <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+20 1xx xxx xxxx" />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!dirty || saving || (emailChanged && !currentPassword)}
            className="px-5 py-2.5 rounded-xl bg-mocha text-cream text-sm font-medium hover:bg-mocha/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {toast && <span className="text-[12.5px] text-emerald-600 font-medium">✓ Saved</span>}
        </div>
      </form>
    </div>
  )
}
