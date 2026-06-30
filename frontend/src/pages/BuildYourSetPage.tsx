import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi, type Product, type ProductVariant } from '../api/products'
import { cartApi } from '../api/cart'
import { useCartStore } from '../store/cartStore'
import { TOP_PATHS, BOTTOM_PATHS } from '../lib/garmentPaths'

// ── helpers ────────────────────────────────────────────────────────────────────

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

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

function productImageFor(product: Product, hex: string): string | null {
  return (
    product.variants.find(v => v.color_hex === hex && v.image_url)?.image_url ??
    product.variants.find(v => v.image_url)?.image_url ??
    null
  )
}

// ── Step heading ──────────────────────────────────────────────────────────────

function StepHeading({
  step, title, done, subtitle,
}: { step: string; title: string; done: boolean; subtitle?: string }) {
  return (
    <div className={`rounded-2xl px-5 py-4 mb-6 flex items-center gap-4 transition-colors duration-300 ${
      done
        ? 'bg-[#ECE3D9]/60'
        : 'bg-white shadow-[0_2px_12px_rgba(74,63,56,0.08)]'
    }`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-semibold text-[14px] transition-colors duration-300 ${
        done ? 'bg-ink text-cream' : 'bg-ink text-cream'
      }`}>
        {done
          ? (
            <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M2 6l3 3 5-5" />
            </svg>
          )
          : step}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-logo text-ink" style={{ fontSize: 'clamp(21px,3vw,27px)' }}>{title}</h2>
        {subtitle && !done && (
          <p className="text-[12px] text-mocha/70 mt-0.5 flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5 shrink-0">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Compact model card (for the horizontal scroll row) ────────────────────────

function ModelCard({
  product, selected, previewHex, onClick,
}: { product: Product; selected: boolean; previewHex: string; onClick: () => void }) {
  const img      = productImageFor(product, previewHex)
  const svgPath  = getPath(product.type, product.style)
  const viewBox  = product.type === 'top' ? '30 0 140 175' : '35 5 90 165'

  return (
    <button
      onClick={onClick}
      className={`flex-none w-[136px] rounded-2xl p-3 text-left transition-all duration-200 select-none
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-2 ${
        selected
          ? 'bg-white ring-2 ring-ink shadow-[0_6px_24px_rgba(74,63,56,0.13)]'
          : 'bg-white ring-1 ring-mocha/15 hover:ring-mocha/40 hover:shadow-sm'
      }`}
    >
      <div className="relative mb-2.5">
        {selected && (
          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-ink flex items-center justify-center z-10">
            <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
              <path d="M2 5l2.5 2.5L8 3" />
            </svg>
          </span>
        )}
        <div className="aspect-[3/4] rounded-xl bg-[#F9F5F0] overflow-hidden flex items-center justify-center">
          {img ? (
            <img src={img} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <svg viewBox={viewBox} className="w-4/5" aria-hidden="true">
              <path fill={previewHex || '#EBCFD2'} stroke="#8B7568" strokeWidth="2" d={svgPath} />
            </svg>
          )}
        </div>
      </div>
      <p className="text-[12.5px] font-semibold text-ink truncate leading-snug">{product.name}</p>
      <p className="text-[11px] text-mocha/65 mt-0.5">from EGP {product.base_price.toFixed(0)}</p>
    </button>
  )
}

// ── Detail picker (expanded panel for selected model) ─────────────────────────

function DetailPicker({
  product, activeHex, activeSize, onColorChange, onSizeChange,
}: {
  product: Product
  activeHex: string
  activeSize: string | null
  onColorChange: (hex: string) => void
  onSizeChange:  (size: string | null) => void
}) {
  const colors  = uniqueColorsFor(product)
  const sizes   = sizesForColor(product, activeHex)
  const svgPath = getPath(product.type, product.style)
  const viewBox = product.type === 'top' ? '30 0 140 175' : '35 5 90 165'
  const img     = productImageFor(product, activeHex)
  const price   = findVariant(product, activeHex, activeSize ?? '')?.price ?? product.base_price

  // pick a color name to show
  const colorName = colors.find(v => v.color_hex === activeHex)?.color_name ?? ''

  return (
    <div className="mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-0">
        {/* Left — garment preview */}
        <div className="sm:w-44 shrink-0 bg-[#F9F5F0] flex items-center justify-center p-5">
          <div className="w-full aspect-[3/4] flex items-center justify-center">
            {img ? (
              <img src={img} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <svg viewBox={viewBox} className="w-full h-full" aria-hidden="true">
                <path fill={activeHex} stroke="#8B7568" strokeWidth="2" d={svgPath} />
              </svg>
            )}
          </div>
        </div>

        {/* Right — selectors */}
        <div className="flex-1 p-5 sm:p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-body font-semibold text-[15px] text-ink">{product.name}</h3>
              <p className="font-logo text-[18px] text-ink mt-0.5">EGP {price.toFixed(0)}</p>
            </div>
            <Link
              to={`/product/${product.slug}`}
              className="text-[11px] text-mocha/50 hover:text-mocha underline-offset-2 hover:underline shrink-0 ml-4 transition-colors"
            >
              Full details
            </Link>
          </div>

          {/* Colours */}
          <p className="text-[10px] tracking-[0.15em] uppercase text-mocha/50 mb-2.5">
            Colour — <span className="normal-case not-italic tracking-normal text-mocha/80">{colorName}</span>
          </p>
          <div className="flex gap-2.5 flex-wrap mb-6" role="group" aria-label="colour">
            {colors.map(v => (
              <button
                key={v.color_hex}
                aria-label={v.color_name}
                aria-pressed={activeHex === v.color_hex}
                onClick={() => onColorChange(v.color_hex)}
                title={v.color_name}
                style={{ background: v.color_hex }}
                className={`w-8 h-8 rounded-full border-[2.5px] transition-all duration-150
                  hover:scale-110 focus-visible:outline focus-visible:outline-2
                  focus-visible:outline-mocha focus-visible:outline-offset-2 ${
                  activeHex === v.color_hex
                    ? 'border-ink scale-110 shadow-sm'
                    : 'border-transparent hover:border-mocha/30'
                }`}
              />
            ))}
          </div>

          {/* Sizes */}
          <p className="text-[10px] tracking-[0.15em] uppercase text-mocha/50 mb-2.5">Size</p>
          {sizes.length === 0 ? (
            <p className="text-[12px] text-mocha/40 italic">No sizes available for this colour</p>
          ) : (
            <div className="flex gap-2 flex-wrap" role="group" aria-label="size">
              {sizes.map(({ size, inStock }) => (
                <button
                  key={size}
                  disabled={!inStock}
                  onClick={() => onSizeChange(activeSize === size ? null : size)}
                  aria-pressed={activeSize === size}
                  className={`font-body font-semibold text-[12px] min-w-[44px] text-center
                    border-[1.5px] rounded-full px-3.5 py-1.5 transition-all duration-150
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha
                    focus-visible:outline-offset-2 ${
                    !inStock
                      ? 'border-mocha/15 text-mocha/25 line-through cursor-not-allowed'
                      : activeSize === size
                      ? 'bg-ink text-cream border-ink shadow-sm'
                      : 'bg-transparent text-mocha border-mocha hover:bg-mocha/10 cursor-pointer'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          {/* Hint if size not picked */}
          {activeSize ? (
            <p className="mt-4 text-[11.5px] text-emerald-600 flex items-center gap-1.5">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0"><path d="M2 6l3 3 5-5" /></svg>
              {activeSize} selected
            </p>
          ) : (
            <p className="mt-4 text-[11.5px] text-mocha/45">
              Select a size to continue
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Combined set SVG preview ───────────────────────────────────────────────────

function SetPreviewSvg({
  topProduct, topHex, botProduct, botHex,
}: {
  topProduct: Product | null; topHex: string
  botProduct: Product | null; botHex: string
}) {
  if (!topProduct && !botProduct) return null
  return (
    <svg viewBox="0 0 200 360" className="w-full h-full" aria-hidden="true">
      {topProduct && TOP_PATHS[topProduct.style] && (
        <path fill={topHex || '#EBCFD2'} stroke="#8B7568" strokeWidth="2" d={TOP_PATHS[topProduct.style]} />
      )}
      {botProduct && BOTTOM_PATHS[botProduct.style] && (
        <g transform="translate(0,180)">
          <path fill={botHex || '#EBCFD2'} stroke="#8B7568" strokeWidth="2" d={BOTTOM_PATHS[botProduct.style]} />
        </g>
      )}
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BuildYourSetPage() {
  const setCart = useCartStore(s => s.setCart)

  const [tops,    setTops]    = useState<Product[]>([])
  const [bottoms, setBottoms] = useState<Product[]>([])

  const [topId,   setTopId]   = useState<string | null>(null)
  const [topHex,  setTopHex]  = useState('')
  const [topSize, setTopSize] = useState<string | null>(null)

  const [botId,   setBotId]   = useState<string | null>(null)
  const [botHex,  setBotHex]  = useState('')
  const [botSize, setBotSize] = useState<string | null>(null)

  const [adding,   setAdding]   = useState(false)
  const [added,    setAdded]    = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const topDetailRef = useRef<HTMLDivElement>(null)
  const botDetailRef = useRef<HTMLDivElement>(null)

  // header is 88px — offset scroll so the panel isn't hidden under it
  function scrollToDetail(ref: React.RefObject<HTMLDivElement | null>) {
    if (!ref.current) return
    const top = ref.current.getBoundingClientRect().top + window.scrollY - 104
    window.scrollTo({ top, behavior: 'smooth' })
  }

  useEffect(() => {
    Promise.all([
      productsApi.list({ type: 'top',    per_page: 20 }),
      productsApi.list({ type: 'bottom', per_page: 20 }),
    ]).then(([tRes, bRes]) => {
      setTops(tRes.products)
      setBottoms(bRes.products)
    }).catch(() => {})
  }, [])

  // scroll to detail panel after React renders it
  useEffect(() => {
    if (!topId) return
    const id = setTimeout(() => scrollToDetail(topDetailRef), 60)
    return () => clearTimeout(id)
  }, [topId])

  useEffect(() => {
    if (!botId) return
    const id = setTimeout(() => scrollToDetail(botDetailRef), 60)
    return () => clearTimeout(id)
  }, [botId])

  function selectTop(product: Product) {
    if (topId === product.id) {
      scrollToDetail(topDetailRef)
      return
    }
    const firstHex = uniqueColorsFor(product)[0]?.color_hex ?? ''
    setTopId(product.id)
    setTopHex(firstHex)
    setTopSize(null)
  }

  function selectBottom(product: Product) {
    if (botId === product.id) {
      scrollToDetail(botDetailRef)
      return
    }
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
    <div className="bg-cream min-h-screen font-body pb-36">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="max-w-[1080px] mx-auto px-5 pt-10 pb-8 text-center">
        <p className="text-[11px] tracking-[0.3em] uppercase text-mocha/60 mb-1">Mix & Match</p>
        <h1 className="font-logo text-ink" style={{ fontSize: 'clamp(30px,5vw,44px)' }}>
          Build Your Own Set
        </h1>
        <p className="text-[14px] text-ink/55 mt-3 max-w-[400px] mx-auto leading-relaxed">
          Pick a top, pick a bottom — any colour, any size. Make it yours.
        </p>
      </div>

      <div className="max-w-[1080px] mx-auto px-5 space-y-14">

        {/* ── Step 1: Tops ──────────────────────────────────────────────── */}
        <section>
          <StepHeading
            step="1"
            title="Choose your top"
            done={!!topVariant}
            subtitle={tops.length > 0 ? `${tops.length} styles available — scroll to browse` : undefined}
          />

          {tops.length === 0 ? (
            <p className="text-[13px] text-mocha/50 animate-pulse">Loading styles…</p>
          ) : (
            <>
              {/* horizontal scrollable model row */}
              <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory">
                {tops.map(product => (
                  <div key={product.id} className="snap-start">
                    <ModelCard
                      product={product}
                      selected={topId === product.id}
                      previewHex={topId === product.id ? topHex : (uniqueColorsFor(product)[0]?.color_hex ?? '#EBCFD2')}
                      onClick={() => selectTop(product)}
                    />
                  </div>
                ))}
              </div>

              {/* expanded detail picker */}
              {topProduct && (
                <div ref={topDetailRef}>
                  <DetailPicker
                    product={topProduct}
                    activeHex={topHex}
                    activeSize={topSize}
                    onColorChange={hex => { setTopHex(hex); setTopSize(null) }}
                    onSizeChange={sz => setTopSize(sz)}
                  />
                </div>
              )}

              {!topProduct && (
                <div className="mt-4 rounded-2xl border-2 border-dashed border-mocha/20 p-8 text-center">
                  <p className="text-[13px] text-mocha/45">Select a style above to choose your colour and size</p>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Step 2: Bottoms ───────────────────────────────────────────── */}
        <section>
          <StepHeading
            step="2"
            title="Choose your bottom"
            done={!!botVariant}
            subtitle={bottoms.length > 0 ? `${bottoms.length} styles available — scroll to browse` : undefined}
          />

          {bottoms.length === 0 ? (
            <p className="text-[13px] text-mocha/50 animate-pulse">Loading styles…</p>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory">
                {bottoms.map(product => (
                  <div key={product.id} className="snap-start">
                    <ModelCard
                      product={product}
                      selected={botId === product.id}
                      previewHex={botId === product.id ? botHex : (uniqueColorsFor(product)[0]?.color_hex ?? '#EBCFD2')}
                      onClick={() => selectBottom(product)}
                    />
                  </div>
                ))}
              </div>

              {botProduct && (
                <div ref={botDetailRef}>
                  <DetailPicker
                    product={botProduct}
                    activeHex={botHex}
                    activeSize={botSize}
                    onColorChange={hex => { setBotHex(hex); setBotSize(null) }}
                    onSizeChange={sz => setBotSize(sz)}
                  />
                </div>
              )}

              {!botProduct && (
                <div className="mt-4 rounded-2xl border-2 border-dashed border-mocha/20 p-8 text-center">
                  <p className="text-[13px] text-mocha/45">Select a style above to choose your colour and size</p>
                </div>
              )}
            </>
          )}
        </section>

      </div>

      {/* ── Sticky set bar ────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 border-t border-mocha/12"
        style={{ background: 'rgba(244,238,232,0.94)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-[1080px] mx-auto px-5 py-3 flex items-center gap-4">

          {/* live set SVG preview */}
          {(topProduct || botProduct) && (
            <div className="w-10 h-14 shrink-0 hidden sm:block">
              <SetPreviewSvg
                topProduct={topProduct}
                topHex={topHex}
                botProduct={botProduct}
                botHex={botHex}
              />
            </div>
          )}

          {/* selection summary */}
          <div className="flex-1 min-w-0 flex gap-4 sm:gap-8">
            <SummarySlot
              label="Top"
              name={topProduct?.name ?? null}
              hex={topHex}
              size={topSize}
              done={!!topVariant}
            />
            <div className="w-px bg-mocha/15 self-stretch shrink-0" />
            <SummarySlot
              label="Bottom"
              name={botProduct?.name ?? null}
              hex={botHex}
              size={botSize}
              done={!!botVariant}
            />
          </div>

          {/* price + CTA */}
          <div className="flex items-center gap-3 shrink-0">
            {(topProduct || botProduct) && total > 0 && (
              <p className="font-logo text-[18px] text-ink hidden sm:block">
                EGP {total.toFixed(0)}
              </p>
            )}
            <button
              onClick={handleAddSet}
              disabled={!canAdd || adding}
              className={`btn-pill-solid disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors ${
                added ? '!bg-emerald-600' : ''
              }`}
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

// ── Summary slot in sticky bar ────────────────────────────────────────────────

function SummarySlot({
  label, name, hex, size, done,
}: { label: string; name: string | null; hex: string; size: string | null; done: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] tracking-[0.15em] uppercase text-mocha/50 leading-none mb-0.5 flex items-center gap-1">
        {label}
        {done && (
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-emerald-500">
            <path d="M2 5l2.5 2.5L8 3" />
          </svg>
        )}
      </p>
      {name ? (
        <p className="text-[12px] font-semibold text-ink truncate flex items-center gap-1.5">
          {name}
          {hex && (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border border-mocha/20"
              style={{ background: hex }}
            />
          )}
          {size && <span className="text-mocha/60 font-normal">· {size}</span>}
        </p>
      ) : (
        <p className="text-[12px] text-mocha/40 italic">Not selected</p>
      )}
    </div>
  )
}
