import { useState } from 'react'
import { type ReadySet } from '../api/products'
import { cartApi } from '../api/cart'
import { useCartStore } from '../store/cartStore'
import { TOP_PATHS, BOTTOM_PATHS } from '../lib/garmentPaths'

export default function ReadySetCard({ set }: { set: ReadySet }) {
  const setCart  = useCartStore(s => s.setCart)
  const [size,   setSize]   = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [added,  setAdded]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function handleAdd() {
    if (!size || adding) return
    setAdding(true)
    setError(null)
    try {
      const cart = await cartApi.addReadySet(set.id, size)
      setCart(cart)
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    } catch {
      setError('Could not add to bag — try again')
    } finally {
      setAdding(false)
    }
  }

  const topPath    = TOP_PATHS[set.top_variant.style]       ?? TOP_PATHS['classic_short_sleeve']
  const bottomPath = BOTTOM_PATHS[set.bottom_variant.style] ?? BOTTOM_PATHS['wide_leg']
  const topHex     = set.top_variant.color_hex
  const botHex     = set.bottom_variant.color_hex

  return (
    <div className="bg-white rounded-[18px] p-[18px] text-center transition duration-150 hover:-translate-y-1 flex flex-col">
      {/* silhouette — each piece in its own color */}
      <svg viewBox="0 0 200 260" className="w-full" style={{ maxHeight: 200 }} aria-hidden="true">
        <g transform="translate(40,5) scale(0.6)">
          <path fill={topHex} stroke="#8B7568" strokeWidth="2.4" d={topPath} />
        </g>
        <g transform="translate(42,118) scale(0.58)">
          <path fill={botHex} stroke="#8B7568" strokeWidth="2.4" d={bottomPath} />
        </g>
      </svg>

      <h4 className="font-body font-semibold text-[13.5px] text-ink mt-2.5 mb-0.5">{set.name}</h4>
      <p className="text-[11.5px] text-[#8a7c72] mb-1.5 leading-snug">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block border border-white/50 shadow-sm shrink-0"
                style={{ background: topHex }} />
          {set.top_variant.color_name}
        </span>
        {' · '}
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block border border-white/50 shadow-sm shrink-0"
                style={{ background: botHex }} />
          {set.bottom_variant.color_name}
        </span>
      </p>
      <p className="text-[13px] text-mocha mb-3">EGP {set.price}</p>

      {/* size picker */}
      {set.available_sizes.length > 0 && (
        <div className="flex justify-center gap-1.5 mb-3 flex-wrap" role="group" aria-label="size">
          {set.available_sizes.map(sz => (
            <button
              key={sz}
              onClick={() => setSize(size === sz ? null : sz)}
              aria-pressed={size === sz}
              className={`font-body text-[11px] font-semibold rounded-full px-[10px] py-1 border-[1.4px] transition-colors duration-100 cursor-pointer
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px] ${
                  size === sz
                    ? 'bg-mocha text-cream border-mocha'
                    : 'bg-transparent text-mocha border-mocha hover:bg-mocha/10'
                }`}
            >
              {sz}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-[11px] text-red-500 mb-2">{error}</p>}

      <button
        onClick={handleAdd}
        disabled={!size || adding}
        className="btn-pill-sm disabled:opacity-40 disabled:cursor-not-allowed mt-auto"
      >
        {adding ? 'Adding…' : added ? 'Added!' : size ? 'Add Set to Bag' : 'Select size'}
      </button>
    </div>
  )
}
