import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi, type Product, type ProductVariant } from '../api/products'
import { cartApi } from '../api/cart'
import { useCartStore } from '../store/cartStore'
import { TOP_PATHS, BOTTOM_PATHS } from '../lib/garmentPaths'

// ── helpers ────────────────────────────────────────────────────────────────────

const SIZE_ORDER = ['S', 'M', 'L', 'XL']

function getPath(type: string, style: string) {
  if (type === 'top') return TOP_PATHS[style] ?? TOP_PATHS['classic_short_sleeve']
  return BOTTOM_PATHS[style] ?? BOTTOM_PATHS['wide_leg']
}

function uniqueColorsFor(product: Product) {
  const seen = new Set<string>()
  return product.variants.filter(v => {
    if (seen.has(v.color_hex)) return false
    seen.add(v.color_hex)
    return true
  })
}

function sizesForColor(product: Product, hex: string) {
  const inStock = new Set(
    product.variants.filter(v => v.color_hex === hex && v.stock_quantity > 0).map(v => v.size),
  )
  const all = new Set(product.variants.filter(v => v.color_hex === hex).map(v => v.size))
  return SIZE_ORDER.filter(s => all.has(s)).map(s => ({ size: s, inStock: inStock.has(s) }))
}

function findVariant(product: Product, hex: string, size: string): ProductVariant | null {
  return product.variants.find(v => v.color_hex === hex && v.size === size) ?? null
}

// ── product picker card ────────────────────────────────────────────────────────

interface PickerCardProps {
  product: Product
  selected: boolean
  activeHex: string
  activeSize: string | null
  onSelect: () => void
  onColorChange: (hex: string) => void
  onSizeChange: (size: string) => void
}

function PickerCard({
  product, selected, activeHex, activeSize,
  onSelect, onColorChange, onSizeChange,
}: PickerCardProps) {
  const colors = uniqueColorsFor(product)
  const sizes  = sizesForColor(product, activeHex)
  const price  = findVariant(product, activeHex, activeSize ?? '')?.price ?? product.base_price
  const svgPath = getPath(product.type, product.style)
  const viewBox = product.type === 'top' ? '40 5 120 160' : '40 10 75 160'

  return (
    <div
      onClick={onSelect}
      className={`relative bg-white rounded-2xl p-5 cursor-pointer transition-all duration-250 select-none ${
        selected
          ? 'ring-2 ring-ink shadow-[0_8px_28px_rgba(74,63,56,0.14)]'
          : 'ring-1 ring-mocha/12 shadow-sm hover:shadow-md hover:ring-mocha/30'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(.4,0,.2,1)' }}
    >
      {/* selected checkmark */}
      {selected && (
        <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-ink flex items-center justify-center">
          <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
            <path d="M2 6l3 3 5-5" />
          </svg>
        </span>
      )}

      {/* garment preview */}
      <div className="aspect-square flex items-center justify-center bg-[#F9F5F0] rounded-xl mb-4 overflow-hidden">
        <svg viewBox={viewBox} className="w-3/5" aria-hidden="true">
          <path fill={activeHex} stroke="#8B7568" strokeWidth="2" d={svgPath} />
        </svg>
      </div>

      {/* name + price */}
      <h3 className="font-body font-semibold text-[14px] text-ink leading-snug">{product.name}</h3>
      <p className="text-[13px] text-mocha mt-0.5 mb-3">EGP {price.toFixed(0)}</p>

      {/* color swatches */}
      <div
        className="flex gap-2 mb-3 flex-wrap"
        role="group"
        aria-label="colour"
        onClick={e => e.stopPropagation()}
      >
        {colors.map(v => (
          <button
            key={v.color_hex}
            aria-label={v.color_name}
            aria-pressed={activeHex === v.color_hex}
            onClick={() => { onSelect(); onColorChange(v.color_hex) }}
            style={{ background: v.color_hex }}
            className={`w-6 h-6 rounded-full border-2 transition-all duration-150 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px] ${
              activeHex === v.color_hex ? 'border-mocha scale-110' : 'border-transparent hover:border-mocha/30'
            }`}
          />
        ))}
      </div>

      {/* size pills — only shown when selected */}
      <div
        className="overflow-hidden"
        style={{
          maxHeight: selected ? '80px' : '0',
          transition: 'max-height 280ms cubic-bezier(.4,0,.2,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[10.5px] tracking-[0.12em] uppercase text-mocha/50 mb-2">Size</p>
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="size">
          {sizes.map(({ size, inStock }) => (
            <button
              key={size}
              disabled={!inStock}
              onClick={() => onSizeChange(activeSize === size ? '' : size)}
              aria-pressed={activeSize === size}
              className={`font-body font-semibold text-[11.5px] border-[1.4px] rounded-full px-[11px] py-1 transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px] ${
                !inStock
                  ? 'border-mocha/15 text-mocha/25 line-through cursor-not-allowed'
                  : activeSize === size
                  ? 'bg-ink text-cream border-ink cursor-pointer'
                  : 'bg-transparent text-mocha border-mocha hover:bg-mocha/10 cursor-pointer'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* view details link */}
      <Link
        to={`/product/${product.slug}`}
        onClick={e => e.stopPropagation()}
        className="mt-3 inline-flex items-center gap-1 text-[11px] text-mocha/45 hover:text-mocha transition-colors duration-200"
      >
        Full details
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-2.5 h-2.5">
          <path d="M2 6h8M6 2l4 4-4 4" />
        </svg>
      </Link>
    </div>
  )
}

// ── step heading ───────────────────────────────────────────────────────────────

function StepHeading({ step, title, done }: { step: string; title: string; done: boolean }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 transition-colors duration-300 ${
          done ? 'bg-ink text-cream' : 'bg-mocha/15 text-mocha'
        }`}
      >
        {done
          ? <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M2 6l3 3 5-5" /></svg>
          : step}
      </span>
      <h2 className="font-logo text-ink" style={{ fontSize: 'clamp(20px, 3vw, 26px)' }}>{title}</h2>
    </div>
  )
}

// ── main page ──────────────────────────────────────────────────────────────────

export default function BuildYourSetPage() {
  const setCart = useCartStore(s => s.setCart)

  const [tops,    setTops]    = useState<Product[]>([])
  const [bottoms, setBottoms] = useState<Product[]>([])

  // top selection
  const [topId,   setTopId]   = useState<string | null>(null)
  const [topHex,  setTopHex]  = useState('')
  const [topSize, setTopSize] = useState<string | null>(null)

  // bottom selection
  const [botId,   setBotId]   = useState<string | null>(null)
  const [botHex,  setBotHex]  = useState('')
  const [botSize, setBotSize] = useState<string | null>(null)

  // cart
  const [adding,   setAdding]   = useState(false)
  const [added,    setAdded]    = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      productsApi.list({ type: 'top',    per_page: 20 }),
      productsApi.list({ type: 'bottom', per_page: 20 }),
    ]).then(([tRes, bRes]) => {
      setTops(tRes.products)
      setBottoms(bRes.products)
    }).catch(() => {})
  }, [])

  // initialise hex to first color when product is selected
  function selectTop(product: Product) {
    if (topId === product.id) return
    const firstHex = uniqueColorsFor(product)[0]?.color_hex ?? ''
    setTopId(product.id)
    setTopHex(firstHex)
    setTopSize(null)
  }

  function selectBottom(product: Product) {
    if (botId === product.id) return
    const firstHex = uniqueColorsFor(product)[0]?.color_hex ?? ''
    setBotId(product.id)
    setBotHex(firstHex)
    setBotSize(null)
  }

  const topProduct = useMemo(() => tops.find(p => p.id === topId) ?? null, [tops, topId])
  const botProduct = useMemo(() => bottoms.find(p => p.id === botId) ?? null, [bottoms, botId])

  const topVariant = useMemo(
    () => topProduct && topSize ? findVariant(topProduct, topHex, topSize) : null,
    [topProduct, topHex, topSize],
  )
  const botVariant = useMemo(
    () => botProduct && botSize ? findVariant(botProduct, botHex, botSize) : null,
    [botProduct, botHex, botSize],
  )

  const topPrice = topVariant?.price ?? topProduct?.base_price ?? 0
  const botPrice = botVariant?.price ?? botProduct?.base_price ?? 0
  const total    = topPrice + botPrice

  const canAdd = !!topVariant && !!botVariant

  async function handleAddSet() {
    if (!topVariant || !botVariant || adding) return
    setAdding(true)
    setAddError(null)
    try {
      const cart = await cartApi.addSet(topVariant.id, botVariant.id)
      setCart(cart)
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    } catch {
      setAddError('Could not add to bag — please try again.')
    } finally {
      setAdding(false)
    }
  }

  const barLabel = () => {
    if (adding) return 'Adding…'
    if (added)  return 'Added to bag!'
    if (!topProduct)  return 'Select a top first'
    if (!topSize)     return 'Pick a top size'
    if (!botProduct)  return 'Select a bottom'
    if (!botSize)     return 'Pick a bottom size'
    return `Add Set to Bag · EGP ${total.toFixed(0)}`
  }

  return (
    <div className="bg-cream min-h-screen font-body pb-32">
      {/* ── page header ───────────────────────────────────────────────── */}
      <div className="max-w-[1080px] mx-auto px-5 pt-10 pb-8 text-center">
        <p className="text-[11px] tracking-[0.3em] uppercase text-mocha/60 mb-1">Mix & Match</p>
        <h1
          className="font-logo text-ink"
          style={{ fontSize: 'clamp(30px, 5vw, 44px)' }}
        >
          Build Your Own Set
        </h1>
        <p className="text-[14px] text-ink/55 mt-3 max-w-[400px] mx-auto leading-relaxed">
          Pick a top, pick a bottom — any color, any size. Make it yours.
        </p>
      </div>

      <div className="max-w-[1080px] mx-auto px-5 space-y-14">

        {/* ── Step 1: Tops ──────────────────────────────────────────────── */}
        <section>
          <StepHeading step="1" title="Choose your top" done={!!topVariant} />
          {tops.length === 0 ? (
            <p className="text-[13px] text-mocha/50 animate-pulse">Loading tops…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {tops.map(product => (
                <PickerCard
                  key={product.id}
                  product={product}
                  selected={topId === product.id}
                  activeHex={topId === product.id ? topHex : (uniqueColorsFor(product)[0]?.color_hex ?? '#EBCFD2')}
                  activeSize={topId === product.id ? topSize : null}
                  onSelect={() => selectTop(product)}
                  onColorChange={hex => { setTopHex(hex); setTopSize(null) }}
                  onSizeChange={sz => setTopSize(sz || null)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Step 2: Bottoms ───────────────────────────────────────────── */}
        <section>
          <StepHeading step="2" title="Choose your bottom" done={!!botVariant} />
          {bottoms.length === 0 ? (
            <p className="text-[13px] text-mocha/50 animate-pulse">Loading bottoms…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {bottoms.map(product => (
                <PickerCard
                  key={product.id}
                  product={product}
                  selected={botId === product.id}
                  activeHex={botId === product.id ? botHex : (uniqueColorsFor(product)[0]?.color_hex ?? '#EBCFD2')}
                  activeSize={botId === product.id ? botSize : null}
                  onSelect={() => selectBottom(product)}
                  onColorChange={hex => { setBotHex(hex); setBotSize(null) }}
                  onSizeChange={sz => setBotSize(sz || null)}
                />
              ))}
            </div>
          )}
        </section>

      </div>

      {/* ── Sticky set bar ────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 border-t border-mocha/12"
        style={{ background: 'rgba(244,238,232,0.92)', backdropFilter: 'blur(10px)' }}
      >
        <div className="max-w-[1080px] mx-auto px-5 py-3 flex items-center gap-4">

          {/* set summary */}
          <div className="flex-1 min-w-0 flex gap-4 sm:gap-8">
            {/* top */}
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.15em] uppercase text-mocha/50 leading-none mb-0.5">Top</p>
              {topProduct ? (
                <p className="text-[12px] font-semibold text-ink truncate">
                  {topProduct.name}
                  {topHex && <span className="inline-block w-2 h-2 rounded-full ml-1.5 align-middle border border-mocha/20" style={{ background: topHex }} />}
                  {topSize && <span className="text-mocha/60 font-normal"> · {topSize}</span>}
                </p>
              ) : (
                <p className="text-[12px] text-mocha/40 italic">Not selected</p>
              )}
            </div>

            <div className="w-px bg-mocha/15 self-stretch shrink-0" />

            {/* bottom */}
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.15em] uppercase text-mocha/50 leading-none mb-0.5">Bottom</p>
              {botProduct ? (
                <p className="text-[12px] font-semibold text-ink truncate">
                  {botProduct.name}
                  {botHex && <span className="inline-block w-2 h-2 rounded-full ml-1.5 align-middle border border-mocha/20" style={{ background: botHex }} />}
                  {botSize && <span className="text-mocha/60 font-normal"> · {botSize}</span>}
                </p>
              ) : (
                <p className="text-[12px] text-mocha/40 italic">Not selected</p>
              )}
            </div>
          </div>

          {/* price + button */}
          <div className="flex items-center gap-3 shrink-0">
            {(topProduct || botProduct) && (
              <p className="font-logo text-[18px] text-ink hidden sm:block">
                EGP {total.toFixed(0)}
              </p>
            )}
            <button
              onClick={handleAddSet}
              disabled={!canAdd || adding}
              className="btn-pill-solid disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {barLabel()}
            </button>
          </div>
        </div>

        {addError && (
          <p className="text-center text-[11px] text-red-500 pb-2">{addError}</p>
        )}
      </div>
    </div>
  )
}
