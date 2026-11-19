import { TOP_PATHS, BOTTOM_PATHS } from '../lib/garmentPaths'

// Coloured garment drawing used in place of a product photo until real
// photos are uploaded. Same look as the ready-made set cards.
export default function GarmentSilhouette({
  type, style, colorHex, className = 'h-[120px] mb-3.5',
}: { type: string; style: string; colorHex: string; className?: string }) {
  const isTop   = type === 'top'
  const path    = isTop
    ? TOP_PATHS[style] ?? TOP_PATHS['classic_short_sleeve']
    : BOTTOM_PATHS[style] ?? BOTTOM_PATHS['wide_leg']
  const viewBox = isTop ? '40 5 120 165' : '45 10 110 155'

  return (
    <div className={`rounded-xl bg-[#F9F5F0] flex items-center justify-center ${className}`}>
      <svg viewBox={viewBox} className="h-[85%] w-auto" aria-hidden="true">
        <path fill={colorHex} stroke="#8B7568" strokeWidth="2.4" d={path} />
      </svg>
    </div>
  )
}
