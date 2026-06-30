import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import sinayLogo from '../assets/logo/Sinay-Logo.png'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

const NAV_LINKS = [
  { label: 'Shop',            href: '/shop'     },
  { label: 'Ready-made Sets', href: '/#sets'    },
  { label: 'Build Your Own',  href: '/#builder' },
]

export default function Header() {
  const { user, logout } = useAuthStore()
  const itemCount = useCartStore(s => s.cart?.item_count ?? 0)

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef   = useRef<HTMLDivElement>(null)

  // Add shadow once scrolled past 12px
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close mobile menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Close mobile menu on Escape
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [menuOpen])

  // Close menu on route change
  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      ref={menuRef}
      className={`sticky top-0 z-40 bg-[#ECE3D9] border-b border-mocha/10 transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_4px_20px_rgba(74,63,56,0.12)]' : 'shadow-none'
      }`}
    >
      {/* ── main bar ──────────────────────────────────────────────────────── */}
      <div className="max-w-[1080px] mx-auto px-6 grid grid-cols-[1fr_auto_1fr] items-center h-[88px] gap-4">

        {/* ── Left: desktop nav / mobile hamburger ── */}
        <div className="flex items-center">
          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-[13.5px] tracking-[0.04em] text-ink border-b border-transparent pb-1
                           transition-[border-color] duration-300 hover:border-mocha
                           focus-visible:outline-2 focus-visible:outline-mocha focus-visible:rounded-sm"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-0 rounded-lg
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen(v => !v)}
          >
            <div className="relative w-5 h-4">
              <span
                className={`absolute left-0 top-0 block w-full h-0.5 bg-mocha rounded-full
                            transition-transform duration-300 origin-center
                            ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`}
              />
              <span
                className={`absolute left-0 top-[7px] block w-full h-0.5 bg-mocha rounded-full
                            transition-all duration-300
                            ${menuOpen ? 'opacity-0 scale-x-0' : ''}`}
              />
              <span
                className={`absolute left-0 bottom-0 block w-full h-0.5 bg-mocha rounded-full
                            transition-transform duration-300 origin-center
                            ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}
              />
            </div>
          </button>
        </div>

        {/* ── Center: logo ── */}
        <Link to="/" className="flex justify-center focus-visible:outline-2 focus-visible:outline-mocha focus-visible:rounded-sm" onClick={closeMenu}>
          <img src={sinayLogo} alt="SINAY — soft, comfy & yours" className="h-[72px] w-auto object-contain" />
        </Link>

        {/* ── Right: icon actions ── */}
        <div className="flex items-center gap-3 justify-end">
          {/* Account icon */}
          <NavLink
            to={user ? (user.role === 'admin' ? '/admin' : '/') : '/login'}
            aria-label={user ? (user.role === 'admin' ? 'Admin dashboard' : 'My account') : 'Log in'}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-300
                       hover:bg-mocha/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha"
          >
            {user ? (
              /* filled person when logged in */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B7568" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="7" r="4"/>
                <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            ) : (
              /* outlined person when logged out */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B7568" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="7" r="4"/>
                <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            )}
          </NavLink>

          {/* Sign-out (desktop only, when logged in) */}
          {user && (
            <button
              onClick={logout}
              aria-label="Sign out"
              className="hidden md:flex w-9 h-9 items-center justify-center rounded-full transition-colors duration-300
                         hover:bg-mocha/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8B7568" strokeWidth="1.6" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          )}

          {/* Cart icon with badge */}
          <Link
            to="/cart"
            aria-label={`Cart${itemCount > 0 ? `, ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}`}
            className="relative w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-300
                       hover:bg-mocha/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B7568" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {itemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full
                           bg-[#EBCFD2] text-ink font-semibold text-[10px] flex items-center justify-center"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ── Mobile slide-down menu ─────────────────────────────────────────── */}
      <div
        id="mobile-menu"
        role="region"
        aria-label="Mobile navigation"
        className={`md:hidden absolute top-full left-0 right-0 bg-[#ECE3D9] border-b border-mocha/10
                    shadow-lg overflow-hidden transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]
                    ${menuOpen ? 'max-h-[320px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
      >
        <nav className="max-w-[1080px] mx-auto px-6 py-6 flex flex-col gap-5">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              tabIndex={menuOpen ? 0 : -1}
              onClick={closeMenu}
              className="text-[15px] tracking-[0.03em] text-ink hover:text-mocha transition-colors duration-200"
            >
              {label}
            </a>
          ))}
          <div className="border-t border-mocha/15 pt-4 flex flex-col gap-3">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    tabIndex={menuOpen ? 0 : -1}
                    onClick={closeMenu}
                    className="text-[13px] text-mocha font-semibold tracking-[0.04em]"
                  >
                    Admin dashboard
                  </Link>
                )}
                <button
                  onClick={() => { logout(); closeMenu() }}
                  tabIndex={menuOpen ? 0 : -1}
                  className="text-left text-[13px] text-mocha/70 hover:text-mocha transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                tabIndex={menuOpen ? 0 : -1}
                onClick={closeMenu}
                className="text-[13px] font-semibold text-mocha"
              >
                Log in / Register
              </NavLink>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
