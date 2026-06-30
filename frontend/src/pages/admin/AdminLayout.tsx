import { NavLink, Outlet, Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const links = [
  { to: '/admin/overview',   label: 'Overview'   },
  { to: '/admin/products',   label: 'Products'   },
  { to: '/admin/sets',       label: 'Sets'       },
  { to: '/admin/orders',     label: 'Orders'     },
  { to: '/admin/inventory',  label: 'Inventory'  },
  { to: '/admin/customers',  label: 'Customers'  },
  { to: '/admin/coupons',    label: 'Coupons'    },
  { to: '/admin/settings',   label: 'Settings'   },
]

export default function AdminLayout() {
  const user = useAuthStore(s => s.user)

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen flex bg-[#F4EEE8]">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-[#ECE3D9] border-r border-[#d8cfc5] flex flex-col">
        <div className="px-5 py-5 border-b border-[#d8cfc5] space-y-3">
          <span className="font-semibold text-[#4A3F38] tracking-wide text-sm uppercase block">
            Sinay Admin
          </span>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-[#8B7568] hover:text-[#4A3F38] transition-colors"
          >
            ← Back to site
          </Link>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#8B7568] text-white'
                    : 'text-[#4A3F38] hover:bg-[#d8cfc5]'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
