import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'

export default function CustomerLayout() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handler = () => {
      const scrollable = document.body.scrollHeight - window.innerHeight
      setProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0)
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* Scroll-progress bar — top of viewport, fixed */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 h-[3px] bg-sage z-50 pointer-events-none
                   transition-[width] duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
      <Header />
      <Outlet />
    </div>
  )
}
