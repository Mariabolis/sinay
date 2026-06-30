import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { productsApi, type Product, type ColorOption } from '../api/products'
import { cartApi } from '../api/cart'
import { useCartStore } from '../store/cartStore'

// ── static filter options ──────────────────────────────────────────────────────

const TYPE_OPTS = [
  { value: '',       label: 'All'     },
  { value: 'top',    label: 'Tops'    },
  { value: 'bottom', label: 'Bottoms' },
]

const TOP_STYLES    = ['classic_short_sleeve', 'sleeveless', 'relaxed_shirt']
const BOTTOM_STYLES = ['shorts', 'bermuda', 'wide_leg']
const SIZES         = ['S', 'M', 'L', 'XL']

const STYLE_LABELS: Record<string, string> = {
  classic_short_sleeve: 'Short-sleeve',
  sleeveless:           'Sleeveless',
  relaxed_shirt:        'Relaxed shirt',
  shorts:               'Shorts',
  bermuda:              'Bermuda',
  wide_leg:             'Wide-leg',
}

// ── product card ───────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const setCart = useCartStore(s => s.setCart)

  const uniqueColors = useMemo(() => {
    const seen = new Set<string>()
    return product.variants.filter(v => {
      if (seen.has(v.color_hex)) return false
      seen.add(v.color_hex)
      return true
    })
  }, [product.variants])

  const [activeHex,  setActiveHex]  = useState(uniqueColors[0]?.color_hex ?? '')
  const [activeSize, setActiveSize] = useState<string | null>(null)
  const [adding,     setAdding]     = useState(false)
  const [added,      setAdded]      = useState(false)

  // When color changes, reset size (availability may differ per color)
  function handleColorChange(hex: string) {
    setActiveHex(hex)
    setActiveSize(null)
  }

  // Sizes that exist for the currently active color
  const sizesForColor = useMemo(
    () => product.variants.filter(v => v.color_hex === activeHex).map(v => v.size),
    [product.variants, activeHex],
  )

  // Sizes that exist AND have stock > 0
  const inStockForColor = useMemo(
    () => product.variants.filter(v => v.color_hex === activeHex && v.stock_quantity > 0).map(v => v.size),
    [product.variants, activeHex],
  )

  const activeVariant = activeSize
    ? product.variants.find(v => v.color_hex === activeHex && v.size === activeSize) ?? null
    : null

  async function handleAdd() {
    if (!activeVariant || adding) return
    setAdding(true)
    try {
      const cart = await cartApi.addItem(activeVariant.id)
      setCart(cart)
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    } catch (err) {
      console.error('[cart] addItem failed:', err)
    } finally {
      setAdding(false)
    }
  }

  // Pick the first image_url for the active colour (any size works)
  const activeImage = product.variants.find(
    v => v.color_hex === activeHex && v.image_url,
  )?.image_url ?? null

  return (
    <div className="bg-white rounded-[18px] p-[18px] text-center transition duration-150 hover:-translate-y-1 flex flex-col">
      {/* product preview — image if uploaded, colour swatch otherwise */}
      <Link to={`/product/${product.slug}`} className="block group" tabIndex={-1} aria-hidden>
        {activeImage ? (
          <img
            src={activeImage}
            alt={product.name}
            className="h-[120px] w-full object-cover rounded-xl mb-3.5 transition-opacity duration-200 group-hover:opacity-90"
          />
        ) : (
          <div
            className="h-[120px] rounded-xl mb-3.5 transition-colors duration-200 group-hover:brightness-95"
            style={{ background: activeHex }}
          />
        )}
      </Link>

      <Link to={`/product/${product.slug}`} className="hover:underline underline-offset-2">
        <h3 className="font-body font-semibold text-[14px] text-ink mb-0.5">{product.name}</h3>
      </Link>
      <p className="text-[11.5px] text-[#8a7c72] mb-2">
        {STYLE_LABELS[product.style] ?? product.style}
      </p>
      <p className="text-[13px] text-mocha mb-3">EGP {product.base_price.toFixed(0)}</p>

      {/* color pickers */}
      {uniqueColors.length > 1 && (
        <div className="flex justify-center gap-2 mb-3" role="group" aria-label="colour">
          {uniqueColors.map(v => (
            <button
              key={v.color_hex}
              aria-label={v.color_name}
              aria-pressed={activeHex === v.color_hex}
              onClick={() => handleColorChange(v.color_hex)}
              style={{ background: v.color_hex }}
              className={`w-5 h-5 rounded-full border-[1.5px] transition-transform duration-100 hover:scale-110 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px] ${
                activeHex === v.color_hex ? 'border-mocha' : 'border-transparent'
              }`}
            />
          ))}
        </div>
      )}

      {/* size pills */}
      <div className="flex justify-center gap-1.5 mb-3 flex-wrap" role="group" aria-label="size">
        {SIZES.map(sz => {
          const exists   = sizesForColor.includes(sz)
          const inStock  = inStockForColor.includes(sz)
          const selected = activeSize === sz
          return (
            <button
              key={sz}
              onClick={() => inStock && setActiveSize(selected ? null : sz)}
              disabled={!exists || !inStock}
              aria-pressed={selected}
              className={`font-body text-[11px] font-semibold rounded-full px-[10px] py-1 border-[1.4px] transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px] ${
                !exists
                  ? 'opacity-20 cursor-not-allowed border-mocha text-mocha'
                  : !inStock
                  ? 'line-through opacity-30 cursor-not-allowed border-mocha/40 text-mocha/40'
                  : selected
                  ? 'bg-mocha text-cream border-mocha cursor-pointer'
                  : 'bg-transparent text-mocha border-mocha hover:bg-mocha/10 cursor-pointer'
              }`}
            >
              {sz}
            </button>
          )
        })}
      </div>

      <button
        onClick={handleAdd}
        disabled={!activeVariant || adding || (activeVariant?.stock_quantity ?? 0) === 0}
        className="btn-pill-sm disabled:opacity-40 disabled:cursor-not-allowed mt-auto"
      >
        {adding ? 'Adding…' : added ? 'Added!' : activeSize ? 'Add to Bag' : 'Select size'}
      </button>
    </div>
  )
}

// ── shop page ──────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Filter state — synced with URL params
  const activeType  = searchParams.get('type')  ?? ''
  const activeStyle = searchParams.get('style') ?? ''
  const activeColor = searchParams.get('color') ?? ''
  const activeSize  = searchParams.get('size')  ?? ''

  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [colors, setColors]     = useState<ColorOption[]>([])

  // Available styles depend on selected type
  const styleOptions = useMemo(() => {
    if (activeType === 'top')    return TOP_STYLES
    if (activeType === 'bottom') return BOTTOM_STYLES
    return [...TOP_STYLES, ...BOTTOM_STYLES]
  }, [activeType])

  function setParam(key: string, value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      // reset style when type changes
      if (key === 'type') next.delete('style')
      return next
    })
  }

  // Fetch color options once
  useEffect(() => {
    productsApi.colors().then(setColors).catch(() => {})
  }, [])

  // Fetch products on filter change
  useEffect(() => {
    setLoading(true)
    productsApi
      .list({
        type:  activeType  as 'top' | 'bottom' | undefined || undefined,
        style: activeStyle || undefined,
        color: activeColor || undefined,
        size:  activeSize  || undefined,
      })
      .then(res => {
        setProducts(res.products)
        setTotal(res.total)
      })
      .catch(() => {
        setProducts([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [activeType, activeStyle, activeColor, activeSize])

  const pillBase =
    'font-body font-semibold text-[12px] rounded-full px-[14px] py-[7px] border-[1.4px] border-mocha cursor-pointer transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px]'
  const pillActive   = `${pillBase} bg-mocha text-cream`
  const pillInactive = `${pillBase} bg-transparent text-mocha hover:bg-mocha/10`

  return (
    <main className="min-h-screen px-6 pt-10 pb-20">
      <div className="max-w-[1080px] mx-auto">

        {/* page heading */}
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] uppercase text-mocha">the collection</p>
          <h1
            className="font-logo text-ink mt-2"
            style={{ fontSize: 'clamp(28px, 5vw, 40px)' }}
          >
            {activeType === 'top' ? 'Tops' : activeType === 'bottom' ? 'Bottoms' : 'All Pieces'}
          </h1>
          {total > 0 && !loading && (
            <p className="text-[13px] text-[#8a7c72] mt-1">{total} pieces</p>
          )}
        </div>

        {/* ── filter bar ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 mb-10">

          {/* Type */}
          <div className="flex gap-2 flex-wrap">
            {TYPE_OPTS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setParam('type', value)}
                className={activeType === value ? pillActive : pillInactive}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Style */}
          {styleOptions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setParam('style', '')}
                className={!activeStyle ? pillActive : pillInactive}
              >
                All styles
              </button>
              {styleOptions.map(s => (
                <button
                  key={s}
                  onClick={() => setParam('style', s)}
                  className={activeStyle === s ? pillActive : pillInactive}
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {/* Color swatches */}
          {colors.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] tracking-[0.18em] uppercase text-mocha">Colour</span>
              <button
                onClick={() => setParam('color', '')}
                className={`text-[12px] font-semibold font-body rounded-full px-3 py-1 border-[1.4px] border-mocha cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px] ${
                  !activeColor ? 'bg-mocha text-cream' : 'bg-transparent text-mocha hover:bg-mocha/10'
                }`}
              >
                All
              </button>
              {colors.map(c => (
                <button
                  key={c.color_hex}
                  aria-label={c.color_name}
                  aria-pressed={activeColor === c.color_hex}
                  onClick={() => setParam('color', activeColor === c.color_hex ? '' : c.color_hex)}
                  style={{ background: c.color_hex }}
                  className={`w-7 h-7 rounded-full border-[2px] cursor-pointer transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px] ${
                    activeColor === c.color_hex ? 'border-mocha' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Size */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] tracking-[0.18em] uppercase text-mocha">Size</span>
            <button
              onClick={() => setParam('size', '')}
              className={!activeSize ? pillActive : pillInactive}
            >
              All
            </button>
            {SIZES.map(s => (
              <button
                key={s}
                onClick={() => setParam('size', activeSize === s ? '' : s)}
                className={activeSize === s ? pillActive : pillInactive}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── product grid ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-20 text-mocha/50 text-[13px] tracking-wide">
            loading…
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <span className="font-logo text-4xl text-dusty-pink" aria-hidden>≈</span>
            <p className="text-[14px] text-[#8a7c72] mt-3">No pieces match these filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
