import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { authApi } from '../api/auth'
import sinayLogoBeige from '../assets/logo/Sinay-Logo-B.png'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setError(
        err instanceof AxiosError
          ? (err.response?.data?.error ?? 'Something went wrong')
          : 'Something went wrong',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mx-auto">
            <img src={sinayLogoBeige} alt="SINAY" className="h-24 w-auto object-contain" />
          </div>
          <p className="text-mocha/45 text-xs tracking-[0.2em] uppercase mt-2">
            set a new password
          </p>
        </div>

        {!token ? (
          <p className="text-center text-sm text-red-400">
            This link is missing its reset token. Please request a new one.
          </p>
        ) : done ? (
          <p className="text-center text-sm text-mocha/70">
            Password updated — taking you to sign in…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-center text-xs text-red-400 bg-red-50 border border-red-100 px-4 py-2.5">
                {error}
              </p>
            )}

            <div>
              <label className="block text-xs tracking-wide2 uppercase text-mocha/60 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full border border-mocha/20 bg-cream px-4 py-3 text-sm text-mocha placeholder:text-mocha/30 focus:outline-none focus:border-mocha/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-dusty-pink text-mocha py-3 text-xs tracking-wide2 uppercase hover:bg-dusty-pink/75 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Update Password'}
            </button>
          </form>
        )}

        <p className="text-center mt-8 text-xs text-mocha/50">
          <Link to="/login" className="text-mocha underline underline-offset-2 hover:text-mocha/70 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
