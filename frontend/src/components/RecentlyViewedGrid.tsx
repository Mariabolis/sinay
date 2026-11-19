import { Link } from 'react-router-dom'
import type { RecentlyViewedItem } from '../lib/recentlyViewed'
import GarmentSilhouette from './GarmentSilhouette'

export default function RecentlyViewedGrid({ items }: { items: RecentlyViewedItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {items.map(item => (
        <Link
          key={item.id}
          to={`/product/${item.slug}`}
          className="bg-white rounded-[16px] p-3.5 text-center hover:-translate-y-0.5 transition-transform duration-200"
        >
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="h-[90px] w-full object-cover rounded-xl mb-2.5" />
          ) : item.type && item.style ? (
            <GarmentSilhouette type={item.type} style={item.style} colorHex={item.color_hex} className="h-[90px] mb-2.5" />
          ) : (
            <div className="h-[90px] rounded-xl mb-2.5" style={{ background: item.color_hex }} />
          )}
          <p className="text-[12.5px] font-medium text-ink truncate">{item.name}</p>
          <p className="text-[12px] text-mocha mt-0.5">EGP {item.price.toFixed(0)}</p>
        </Link>
      ))}
    </div>
  )
}
