import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { loadGoogleIdentityScript } from '../lib/googleIdentity'

interface GoogleSignInButtonProps {
  redirectTo?: string
  onError?: (message: string) => void
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export default function GoogleSignInButton({ redirectTo = '/', onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const setAuth = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false

    async function handleCredential(response: { credential: string }) {
      try {
        const res = await authApi.google(response.credential)
        setAuth(res.user, res.access_token, res.refresh_token)
        navigate(redirectTo, { replace: true })
      } catch {
        onError?.('Could not sign in with Google. Please try again.')
      }
    }

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredential,
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          width: 320,
        })
        setReady(true)
      })
      .catch(() => onError?.('Could not load Google Sign-In.'))

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectTo])

  if (!CLIENT_ID) return null

  return (
    <div className={`flex justify-center transition-opacity duration-200 ${ready ? 'opacity-100' : 'opacity-0 h-11'}`}>
      <div ref={containerRef} />
    </div>
  )
}
