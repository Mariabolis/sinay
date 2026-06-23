import { useEffect, useState } from 'react'
import { productsApi, type Product } from '../../api/products'
import { cartApi } from '../../api/cart'
import { useCartStore } from '../../store/cartStore'
import { TOP_PATHS, BOTTOM_PATHS } from '../../lib/garmentPaths'

// ── set definitions ────────────────────────────────────────────────────────────
// Each entry maps to real DB style values so we can look up variant IDs.

const SIZES = ['S', 'M', 'L', 'XL'] as const
type Size = (typeof SIZES)[number]

interface SetDef {
  topStyle:    string
  bottomStyle: string
  colorHex:    string
  colorName:   string
  stroke:      string
  name:        string
  styleCombo:  string
  bundlePrice: number
  retailPrice: number
}

const SET_DEFS: SetDef[] = [
  {
    topStyle:    'classic_short_sleeve',
    bottomStyle: 'wide_leg',
    colorHex:    '#EBCFD2',
    colorName:   'Dusty Pink',
    stroke:      '#8B7568',
    name:        'Dusty Pink Morning Set',
    styleCombo:  'Short-sleeve top + Wide-leg pants',
    bundlePrice: 790,
    retailPrice: 870,
  },
  {
    topStyle:    'relaxed_shirt',
    bottomStyle: 'bermuda',
    colorHex:    '#B9C0AE',
    colorName:   'Sage',
    stroke:      '#8B7568',
    name:        'Sage Slow-morning Set',
    styleCombo:  'Relaxed shirt + Bermuda shorts',
    bundlePrice: 760,
    retailPrice: 860,
  },
  {
    topStyle:    'sleeveless',
    bottomStyle: 'shorts',
    colorHex:    '#C9D8E8',
    colorName:   'Sky Blue',
    stroke:      '#8B7568',
    name:        'Sky Blue Cloud Set',
    styleCombo:  'Sleeveless top + Shorts',
    bundlePrice: 730,
    retailPrice: 780,
  },
  {
    topStyle:    'classic_short_sleeve',
    bottomStyle: 'wide_leg',
    colorHex:    '#8B7568',
    colorName:   'Mocha',
    stroke:      '#6b574d',
    name:        'Mocha Night-in Set',
    styleCombo:  'Short-sleeve top + Wide-leg pants',
    bundlePrice: 790,
    retailPrice: 870,
  },
]

// ── component ─────────────────────────────────────────────────────────────────

export default function SetsGrid() {
  const [tops,    setTops]    = useState<Product[]>([])
  const [bottoms, setBottoms] = useState<Product[]>([])

  useEffect(() => {
    Promise.all([
      productsApi.list({ type: 'top',    per_page: 10 }),
      productsApi.list({ type: 'bottom', per_page: 10 }),
    ])
      .then(([t, b]) => { setTops(t.products); setBottoms(b.products) })
      .catch(() => {})
  }, [])

  return (
    <section className="px-6 pt-16 pb-5" id="sets">
      <div className="max-w-[1080px] mx-auto">

        <div className="text-center mb-9">
          <p className="text-xs tracking-[0.3em] uppercase text-mocha">No mixing needed</p>
          <h2 className="font-logo text-ink mt-2" style={{ fontSize: 'clamp(30px, 5vw, 42px)' }}>
            Ready-made sets
          </h2>
          <p className="text-[14px] text-[#6b5d54] mt-2">
            Matching top + bottom, picked for you — one click to add.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-[18px]">
          {SET_DEFS.map(def => (
            <SetCard
              key={def.name}
              def={def}
              tops={tops}
              bottoms={bottoms}
            />
          ))}
        </div>

      </div>
    </section>
  )
}

// ── set card ──────────────────────────────────────────────────────────────────

function SetCard({
  def,
  tops,
  bottoms,
}: {
  def: SetDef
  tops: Product[]
  bottoms: Product[]
}) {
  const setCart = useCartStore(s => s.setCart)
  const [size,   setSize]   = useState<Size | null>(null)
  const [adding, setAdding] = useState(false)
  const [added,  setAdded]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const topProduct    = tops.find(p => p.style === def.topStyle)
  const bottomProduct = bottoms.find(p => p.style === def.bottomStyle)

  // Sizes where both top and bottom exist in this color
  const availableSizes = SIZES.filter(sz =>
    topProduct?.variants.some(v => v.color_hex === def.colorHex && v.size === sz) &&
    bottomProduct?.variants.some(v => v.color_hex === def.colorHex && v.size === sz),
  )

  const topVariant = size
    ? topProduct?.variants.find(v => v.color_hex === def.colorHex && v.size === size) ?? null
    : null
  const bottomVariant = size
    ? bottomProduct?.variants.find(v => v.color_hex === def.colorHex && v.size === size) ?? null
    : null

  async function handleAdd() {
    if (!topVariant || !bottomVariant || adding) return
    setAdding(true)
    setError(null)
    try {
      const cart = await cartApi.addSet(topVariant.id, bottomVariant.id)
      setCart(cart)
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    } catch (err) {
      console.error('[cart] addSet failed:', err)
      setError('Could not add to bag — try again')
    } finally {
      setAdding(false)
    }
  }

  const topPath    = TOP_PATHS[def.topStyle]
  const bottomPath = BOTTOM_PATHS[def.bottomStyle]

  return (
    <div className="bg-white rounded-[18px] p-[18px] text-center transition duration-150 hover:-translate-y-1 flex flex-col">
      {/* combined silhouette using actual style paths */}
      <svg viewBox="0 0 200 260" className="w-full" style={{ maxHeight: 200 }} aria-hidden="true">
        <g transform="translate(40,5) scale(0.6)">
          <path fill={def.colorHex} stroke={def.stroke} strokeWidth="2.4" d={topPath} />
        </g>
        <g transform="translate(42,118) scale(0.58)">
          <path fill={def.colorHex} stroke={def.stroke} strokeWidth="2.4" d={bottomPath} />
        </g>
      </svg>

      <h4 className="font-body font-semibold text-[13.5px] text-ink mt-2.5 mb-0.5">{def.name}</h4>
      <p className="text-[11.5px] text-[#8a7c72] mb-2">{def.styleCombo}</p>
      <p className="text-[13px] text-mocha mb-3">
        EGP {def.bundlePrice}{' '}
        <span className="line-through text-[#b3a89f] ml-1.5 text-xs">EGP {def.retailPrice}</span>
      </p>

      {/* size picker — only shown once products are loaded */}
      {availableSizes.length > 0 && (
        <div className="flex justify-center gap-1.5 mb-3 flex-wrap" role="group" aria-label="size">
          {availableSizes.map(sz => (
            <button
              key={sz}
              onClick={() => setSize(size === sz ? null : sz)}
              aria-pressed={size === sz}
              className={`font-body text-[11px] font-semibold rounded-full px-[10px] py-1 border-[1.4px] transition-colors duration-100 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px] ${
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
        disabled={!topVariant || !bottomVariant || adding}
        className="btn-pill-sm disabled:opacity-40 disabled:cursor-not-allowed mt-auto"
      >
        {adding ? 'Adding…' : added ? 'Added!' : size ? 'Add Set to Bag' : 'Select size'}
      </button>
    </div>
  )
}
