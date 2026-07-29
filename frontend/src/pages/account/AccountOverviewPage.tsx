import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ordersApi, type Order } from '../../api/account'
import { useAuthStore } from '../../store/authStore'
import { STATUS_CONFIG } from '../../lib/orderStatus'
import { SkeletonBlock } from '../../components/Skeleton'

const QUICK_LINKS = [
  { to: '/account/profile',         label: 'Personal Info',   hint: 'Name, email, phone'          },
  { to: '/account/password',        label: 'Change Password', hint: 'Update your login password'  },
  { to: '/account/orders',          label: 'Orders',          hint: 'Track and reorder past purchases' },
  { to: '/account/addresses',       label: 'Addresses',       hint: 'Manage delivery addresses'    },
  { to: '/account/saved-sets',      label: 'Saved Sets',      hint: 'Sets you bookmarked to buy later' },
  { to: '/account/recently-viewed', label: 'Recently Viewed', hint: 'Pieces you looked at lately'  },
]

export default function AccountOverviewPage() {
  const user = useAuthStore(s => s.user)
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ordersApi.list().then(setOrders).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const lastOrder = orders[0]
  const lastStatus = lastOrder ? STATUS_CONFIG[lastOrder.status] : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-logo text-[28px] text-ink">Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}</h1>
        <p className="text-[13.5px] text-mocha/60 mt-1">Here's a quick look at your account.</p>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-[#EDE7E0] p-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] tracking-[0.1em] uppercase text-mocha/50 mb-1.5">Total Orders</p>
          {loading ? <SkeletonBlock className="h-7 w-10" /> : <p className="font-logo text-2xl text-ink">{orders.length}</p>}
        </div>
        <div>
          <p className="text-[11px] tracking-[0.1em] uppercase text-mocha/50 mb-1.5">Last Order</p>
          {loading ? (
            <SkeletonBlock className="h-7 w-20" />
          ) : lastOrder && lastStatus ? (
            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${lastStatus.cls}`}>
              {lastStatus.label}
            </span>
          ) : (
            <p className="text-[13.5px] text-mocha/50">No orders yet</p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {QUICK_LINKS.map(({ to, label, hint }) => (
          <Link
            key={to}
            to={to}
            className="bg-white rounded-2xl border border-[#EDE7E0] p-5 hover:border-mocha/30 hover:-translate-y-0.5 transition-all duration-200"
          >
            <p className="text-[14px] font-semibold text-ink mb-1">{label}</p>
            <p className="text-[12.5px] text-mocha/55">{hint}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
