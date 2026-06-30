import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi, type Product } from '../../api/products'
import { cartApi } from '../../api/cart'
import { useCartStore } from '../../store/cartStore'
import { TOP_PATHS, BOTTOM_PATHS } from '../../lib/garmentPaths'
import { useReveal } from '../../lib/useReveal'

// ── types matching the database style values ───────────────────────────────────

type TopStyle    = 'classic_short_sleeve' | 'sleeveless' | 'relaxed_shirt'
type BottomStyle = 'shorts' | 'bermuda' | 'wide_leg'
const SIZES = ['S', 'M', 'L', 'XL'] as const
type Size = (typeof SIZES)[number]

const TOP_STYLES: { key: TopStyle; label: string }[] = [
  { key: 'classic_short_sleeve', label: 'Short-sleeve'  },
  { key: 'sleeveless',           label: 'Sleeveless'    },
  { key: 'relaxed_shirt',        label: 'Relaxed shirt' },
]

const BOTTOM_STYLES: { key: BottomStyle; label: string }[] = [
  { key: 'shorts',   label: 'Shorts'   },
  { key: 'bermuda',  label: 'Bermuda'  },
  { key: 'wide_leg', label: 'Wide-leg' },
]

const SWATCHES = [
  { hex: '#EBCFD2', label: 'Dusty Pink' },
  { hex: '#B9C0AE', label: 'Sage'       },
  { hex: '#C9D8E8', label: 'Sky Blue'   },
  { hex: '#8B7568', label: 'Mocha'      },
] as const

// ── main component ─────────────────────────────────────────────────────────────

export default function BuilderTeaser() {
  const [topStyle,    setTopStyle]    = useState<TopStyle>('classic_short_sleeve')
  const [bottomStyle, setBottomStyle] = useState<BottomStyle>('wide_leg')
  const [topColor,    setTopColor]    = useState('#EBCFD2')
  const [bottomColor, setBottomColor] = useState('#C9D8E8')
  const [topSize,     setTopSize]     = useState<Size>('S')
  const [bottomSize,  setBottomSize]  = useState<Size>('S')

  const [tops,    setTops]    = useState<Product[]>([])
  const [bottoms, setBottoms] = useState<Product[]>([])
  const [adding,  setAdding]  = useState(false)
  const [added,   setAdded]   = useState(false)

  const setCart = useCartStore(s => s.setCart)

  const [sectionRef, sectionVisible] = useReveal<HTMLElement>(0.08)
  const [barRef,     barVisible]     = useReveal<HTMLDivElement>(0.1)

  useEffect(() => {
    Promise.all([
      productsApi.list({ type: 'top',    per_page: 10 }),
      productsApi.list({ type: 'bottom', per_page: 10 }),
    ])
      .then(([tRes, bRes]) => {
        setTops(tRes.products)
        setBottoms(bRes.products)
      })
      .catch(() => {})
  }, [])

  const topProduct    = tops.find(p => p.style === topStyle)
  const bottomProduct = bottoms.find(p => p.style === bottomStyle)

  const topVariant = topProduct?.variants.find(
    v => v.color_hex === topColor && v.size === topSize,
  ) ?? null
  const bottomVariant = bottomProduct?.variants.find(
    v => v.color_hex === bottomColor && v.size === bottomSize,
  ) ?? null

  const topPrice    = topVariant?.price    ?? topProduct?.base_price    ?? 450
  const bottomPrice = bottomVariant?.price ?? bottomProduct?.base_price ?? 420
  const totalPrice  = topPrice + bottomPrice

  const canAddToCart = topVariant !== null && bottomVariant !== null

  async function handleAddSet() {
    if (!topVariant || !bottomVariant || adding) return
    setAdding(true)
    try {
      const cart = await cartApi.addSet(topVariant.id, bottomVariant.id)
      setCart(cart)
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    } catch (err) {
      console.error('[cart] addSet failed:', err)
    } finally {
      setAdding(false)
    }
  }

  return (
    <section ref={sectionRef} className="py-[72px] px-6" id="builder">
      <div className="max-w-[1080px] mx-auto">

        <div className={`text-center mb-11 reveal ${sectionVisible ? 'is-visible' : ''}`}>
          <p className="text-xs tracking-[0.3em] uppercase text-mocha">
            Prefer to mix it yourself?
          </p>
          <h2
            className="font-logo text-ink mt-2"
            style={{ fontSize: 'clamp(30px, 5vw, 42px)' }}
          >
            Build your own
          </h2>
        </div>

        <div className={`stagger-grid grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center ${sectionVisible ? 'is-visible' : ''}`}>
          <PiecePanel
            label="01 — Choose a top"
            svgPath={TOP_PATHS[topStyle] ?? ''}
            color={topColor}
            size={topSize}
            styles={TOP_STYLES}
            selectedStyle={topStyle}
            onStyleChange={k => setTopStyle(k as TopStyle)}
            onColorChange={setTopColor}
            onSizeChange={setTopSize}
            garmentLabel="top"
            productSlug={topProduct?.slug}
          />
          <PiecePanel
            label="02 — Choose a bottom"
            svgPath={BOTTOM_PATHS[bottomStyle] ?? ''}
            color={bottomColor}
            size={bottomSize}
            styles={BOTTOM_STYLES}
            selectedStyle={bottomStyle}
            onStyleChange={k => setBottomStyle(k as BottomStyle)}
            onColorChange={setBottomColor}
            onSizeChange={setBottomSize}
            garmentLabel="bottom"
            productSlug={bottomProduct?.slug}
          />
        </div>

        {/* set summary bar */}
        <div
          ref={barRef}
          className={`mt-12 flex items-center justify-between gap-4 flex-wrap bg-white rounded-[18px] px-[26px] py-[18px] shadow-[0_8px_24px_rgba(139,117,104,0.12)] reveal ${barVisible ? 'is-visible' : ''}`}
        >
          <div>
            <p className="text-xs tracking-[0.1em] uppercase text-mocha">Your set</p>
            <p className="font-logo text-2xl text-ink">EGP {totalPrice.toFixed(0)}</p>
            {!canAddToCart && tops.length > 0 && (
              <p className="text-[11px] text-[#8a7c72] mt-0.5">Select a size to continue</p>
            )}
          </div>
          <button
            onClick={handleAddSet}
            disabled={!canAddToCart || adding}
            className="btn-pill-solid disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding…' : added ? 'Added to bag!' : 'Add Set to Bag'}
          </button>
        </div>

      </div>
    </section>
  )
}

// ── piece panel ────────────────────────────────────────────────────────────────

interface PiecePanelProps {
  label: string
  svgPath: string
  color: string
  size: Size
  styles: { key: string; label: string }[]
  selectedStyle: string
  onStyleChange: (key: string) => void
  onColorChange: (hex: string) => void
  onSizeChange: (s: Size) => void
  garmentLabel: string
  productSlug?: string
}

function PiecePanel({
  label,
  svgPath,
  color,
  size,
  styles,
  selectedStyle,
  onStyleChange,
  onColorChange,
  onSizeChange,
  garmentLabel,
  productSlug,
}: PiecePanelProps) {
  // Each time color or svgPath changes, remount the animated container
  // so the CSS pulse+breathe sequence restarts from the beginning.
  const [animKey, setAnimKey] = useState(0)
  const prevColor = useRef(color)
  const prevPath  = useRef(svgPath)

  useEffect(() => {
    if (color !== prevColor.current || svgPath !== prevPath.current) {
      prevColor.current = color
      prevPath.current  = svgPath
      setAnimKey(k => k + 1)
    }
  }, [color, svgPath])

  return (
    <div className="text-center">
      <h3 className="font-body font-semibold text-[15px] tracking-[0.08em] uppercase text-mocha mb-[18px]">
        {label}
      </h3>

      <div className="relative bg-white rounded-3xl p-[22px] mb-5 shadow-[0_10px_30px_rgba(139,117,104,0.10)] group">
        {/* key remount restarts the garment-anim CSS sequence (pulse → breathe) */}
        <div key={animKey} className="garment-anim">
          <svg
            viewBox="0 0 200 180"
            className="w-full block mx-auto"
            style={{ maxHeight: 220 }}
            aria-hidden="true"
          >
            <path fill={color} stroke="#8B7568" strokeWidth="2.2" d={svgPath} />
          </svg>
        </div>
        {productSlug && (
          <Link
            to={`/product/${productSlug}`}
            className="absolute bottom-3 right-3 text-[11px] font-semibold tracking-[0.06em] text-mocha/50 hover:text-mocha transition-colors duration-200 flex items-center gap-1"
            aria-label={`View ${garmentLabel} details`}
          >
            View details
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-2.5 h-2.5">
              <path d="M2 6h8M6 2l4 4-4 4" />
            </svg>
          </Link>
        )}
      </div>

      <div className="flex justify-center gap-2 mb-4 flex-wrap" role="group" aria-label={`${garmentLabel} style`}>
        {styles.map(({ key, label: styleLabel }) => (
          <button
            key={key}
            onClick={() => onStyleChange(key)}
            aria-pressed={selectedStyle === key}
            className={`font-body font-semibold text-[11.5px] tracking-[0.01em] border-[1.4px] border-mocha rounded-full px-[13px] py-[7px] transition-colors duration-150 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px] ${
              selectedStyle === key
                ? 'bg-mocha text-cream'
                : 'bg-transparent text-mocha hover:bg-mocha/10'
            }`}
          >
            {styleLabel}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-3 mb-3.5" role="group" aria-label={`${garmentLabel} colour`}>
        {SWATCHES.map(s => (
          <button
            key={s.hex}
            onClick={() => onColorChange(s.hex)}
            aria-label={`${s.label} ${garmentLabel}`}
            aria-pressed={color === s.hex}
            style={{ background: s.hex }}
            className={`w-[30px] h-[30px] rounded-full border-2 transition-transform duration-150 hover:scale-110 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[3px] ${
              color === s.hex ? 'border-mocha' : 'border-transparent'
            }`}
          />
        ))}
      </div>

      <div className="flex justify-center gap-2" role="group" aria-label={`${garmentLabel} size`}>
        {SIZES.map(sz => (
          <button
            key={sz}
            onClick={() => onSizeChange(sz)}
            aria-pressed={size === sz}
            className={`font-body font-semibold text-xs border-[1.4px] border-mocha rounded-full px-[13px] py-1.5 transition-colors duration-150 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px] ${
              size === sz
                ? 'bg-mocha text-cream'
                : 'bg-transparent text-mocha hover:bg-mocha/10'
            }`}
          >
            {sz}
          </button>
        ))}
      </div>
    </div>
  )
}
