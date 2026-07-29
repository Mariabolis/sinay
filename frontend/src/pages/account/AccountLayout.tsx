import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const LINKS = [
  { to: '/account',                 label: 'Overview',        end: true },
  { to: '/account/profile',         label: 'Personal Info'            },
  { to: '/account/password',        label: 'Change Password'          },
  { to: '/account/orders',          label: 'Orders'                   },
  { to: '/account/addresses',       label: 'Addresses'                },
  { to: '/account/saved-sets',      label: 'Saved Sets'               },
  { to: '/account/recently-viewed', label: 'Recently Viewed'          },
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AccountLayout() {
  const user = useAuthStore(s => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors whitespace-nowrap ${
      isActive ? 'bg-mocha text-cream' : 'text-ink hover:bg-[#F4EEE8]'
    }`

  return (
    <div className="max-w-[1080px] mx-auto px-5 py-10 font-body">
      <div className="flex flex-col md:flex-row gap-8">

        {/* ── Sidebar (desktop) / horizontal tabs (mobile) ─────────────────── */}
        <aside className="md:w-56 shrink-0">
          <div className="flex items-center gap-3 mb-6 px-1">
            <div className="w-10 h-10 rounded-full bg-dusty-pink text-ink flex items-center justify-center font-semibold text-[13px] shrink-0">
              {initials(user.full_name || user.email)}
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-ink truncate">{user.full_name || 'My Account'}</p>
              <p className="text-[11.5px] text-mocha/50 truncate">{user.email}</p>
            </div>
          </div>

          <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-1 px-1">
            {LINKS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={navClass}>
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* ── Page content ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
