import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.register({
        email,
        password,
        full_name: fullName || undefined,
        phone: phone || undefined,
      })
      setAuth(res.user, res.access_token, res.refresh_token)
      navigate('/', { replace: true })
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

  const inputClass =
    'w-full border border-mocha/20 bg-cream px-4 py-3 text-sm text-mocha placeholder:text-mocha/30 focus:outline-none focus:border-mocha/50 transition-colors'

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-10">
          <span className="text-dusty-pink text-3xl select-none" aria-hidden>
            ≈
          </span>
          <h1 className="font-logo text-5xl tracking-brand text-mocha uppercase mt-1">
            sinay
          </h1>
          <p className="text-mocha/50 text-xs tracking-wide2 uppercase mt-2">
            create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-center text-xs text-red-400 bg-red-50 border border-red-100 px-4 py-2.5">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs tracking-wide2 uppercase text-mocha/60 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              placeholder="Maria"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wide2 uppercase text-mocha/60 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wide2 uppercase text-mocha/60 mb-1.5">
              Phone{' '}
              <span className="normal-case text-mocha/30 tracking-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="+20 10 0000 0000"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wide2 uppercase text-mocha/60 mb-1.5">
              Password{' '}
              <span className="normal-case text-mocha/30 tracking-normal">(min. 8 chars)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wide2 uppercase text-mocha/60 mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-dusty-pink text-mocha py-3 text-xs tracking-wide2 uppercase hover:bg-dusty-pink/75 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-8 text-xs text-mocha/50">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-mocha underline underline-offset-2 hover:text-mocha/70 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
