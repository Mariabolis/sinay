import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

export default function Header() {
  const { user, logout } = useAuthStore()
  const itemCount = useCartStore(s => s.cart?.item_count ?? 0)

  return (
    <header className="px-6 py-[22px]">
      <div className="max-w-[1080px] mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="leading-none">
          <span className="font-logo text-[26px] tracking-[0.18em] text-mocha block">
            SINAY
          </span>
          <span className="font-body text-[11px] tracking-[0.32em] uppercase text-[#C98FA0] block mt-0.5">
            sleepwear
          </span>
        </Link>

        {/* Centre links — hidden on small screens */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
          {[
            { label: 'Shop',            href: '/shop'     },
            { label: 'Ready-made Sets', href: '/#sets'    },
            { label: 'Build Your Own',  href: '/#builder' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-[14px] tracking-[0.04em] text-ink border-b border-transparent pb-1 transition-colors duration-200 hover:border-mocha focus-visible:outline-2 focus-visible:outline-mocha"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden md:block text-[13px] text-mocha/70 mr-1">
                {user.full_name || user.email}
              </span>
              {user.role === 'admin' && (
                <Link to="/admin" className="btn-pill-ghost">
                  Admin
                </Link>
              )}
              <button onClick={logout} className="btn-pill-ghost">
                Sign out
              </button>
            </>
          ) : (
            <NavLink to="/login" className="btn-pill-ghost">
              Log in
            </NavLink>
          )}
          <Link to="/cart" className="btn-pill-solid">
            Cart ({itemCount})
          </Link>
        </div>
      </div>
    </header>
  )
}
