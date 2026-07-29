import { useAuthStore } from '../../store/authStore'
import { getRecentlyViewed } from '../../lib/recentlyViewed'
import RecentlyViewedGrid from '../../components/RecentlyViewedGrid'
import EmptyState from '../../components/EmptyState'

export default function AccountRecentlyViewedPage() {
  const user = useAuthStore(s => s.user)
  const items = getRecentlyViewed(user?.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-logo text-[24px] text-ink">Recently Viewed</h1>
        <p className="text-[13px] text-mocha/55 mt-1">The last pieces you looked at.</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE7E0]">
          <EmptyState
            message="Nothing here yet"
            subtext="Pieces you look at will show up here."
            ctaLabel="Browse the shop"
            ctaTo="/shop"
          />
        </div>
      ) : (
        <RecentlyViewedGrid items={items} />
      )}
    </div>
  )
}
