import { useState, type FormEvent } from 'react'
import { AxiosError } from 'axios'
import { profileApi } from '../../api/account'

const inputCls =
  'w-full border border-[#DDD5CC] rounded-xl px-4 py-2.5 text-[14px] text-ink ' +
  'placeholder:text-mocha/35 focus:outline-none focus:border-mocha/50 bg-white transition-colors'

export default function AccountPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [toast,  setToast]  = useState(false)

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const valid = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    setError('')
    try {
      await profileApi.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
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
        <h1 className="font-logo text-[24px] text-ink">Change Password</h1>
        <p className="text-[13px] text-mocha/55 mt-1">Choose a new password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#EDE7E0] p-6 space-y-4 max-w-[420px]">
        {error && (
          <p className="text-[12.5px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <label className="block text-xs font-medium text-mocha/60 mb-1.5">Current Password</label>
          <input
            type="password"
            className={inputCls}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-mocha/60 mb-1.5">New Password</label>
          <input
            type="password"
            className={inputCls}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-mocha/60 mb-1.5">Confirm New Password</label>
          <input
            type="password"
            className={inputCls}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
          {mismatch && <p className="text-[11.5px] text-red-500 mt-1.5">Passwords don't match.</p>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!valid || saving}
            className="px-5 py-2.5 rounded-xl bg-mocha text-cream text-sm font-medium hover:bg-mocha/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Updating…' : 'Update Password'}
          </button>
          {toast && <span className="text-[12.5px] text-emerald-600 font-medium">✓ Updated</span>}
        </div>
      </form>
    </div>
  )
}
