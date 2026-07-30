import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { productsApi, setsApi, type Product, type ColorOption, type ProductStyleOption, type ReadySet } from '../api/products'
import { cartApi } from '../api/cart'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { useWishlistStore } from '../store/wishlistStore'
import { SkeletonGrid } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import InlineError from '../components/InlineError'
import ReadySetCard from '../components/ReadySetCard'

// ── static filter options ──────────────────────────────────────────────────────

const TYPE_OPTS = [
  { value: '',       label: 'All'     },
  { value: 'top',    label: 'Tops'    },
  { value: 'bottom', label: 'Bottoms' },
  { value: 'sets',   label: 'Sets'    },
]

const DEFAULT_TOP_STYLES: ProductStyleOption[] = [
  { key: 'classic_short_sleeve', label: 'Short-sleeve'  },
  { key: 'sleeveless',           label: 'Sleeveless'    },
  { key: 'relaxed_shirt',        label: 'Relaxed shirt' },
]

const DEFAULT_BOTTOM_STYLES: ProductStyleOption[] = [
  { key: 'shorts',   label: 'Shorts'   },
  { key: 'bermuda',  label: 'Bermuda'  },
  { key: 'wide_leg', label: 'Wide-leg' },
]

// ── product card ───────────────────────────────────────────────────────────────

function ProductCard({
  product, sizes, styleLabels,
}: { product: Product; sizes: string[]; styleLabels: Record<string, string> }) {
  const setCart = useCartStore(s => s.setCart)
  const authUser = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlistStore()
  const isWishlisted = wishlistIds.has(product.id)

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
      <div className="relative">
        <button
          onClick={() => (authUser ? toggleWishlist(product) : navigate('/login'))}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={isWishlisted}
          className="absolute top-1.5 right-1.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24"
            fill={isWishlisted ? '#EBCFD2' : 'none'}
            stroke="#8B7568" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
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
      </div>

      <Link to={`/product/${product.slug}`} className="hover:underline underline-offset-2">
        <h3 className="font-body font-semibold text-[14px] text-ink mb-0.5">{product.name}</h3>
      </Link>
      <p className="text-[11.5px] text-[#8a7c72] mb-2">
        {styleLabels[product.style] ?? product.style}
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
        {sizes.map(sz => {
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
  const authUser = useAuthStore(s => s.user)
  const { fetchWishlist, loaded: wishlistLoaded } = useWishlistStore()

  useEffect(() => {
    if (authUser && !wishlistLoaded) fetchWishlist()
  }, [authUser, wishlistLoaded, fetchWishlist])

  // Filter state — synced with URL params
  const activeType   = searchParams.get('type')  ?? ''
  const activeStyle  = searchParams.get('style') ?? ''
  const activeColor  = searchParams.get('color') ?? ''
  const activeSize   = searchParams.get('size')  ?? ''
  const activeSearch = searchParams.get('q')     ?? ''

  const [searchDraft, setSearchDraft] = useState(activeSearch)

  const isSetsView = activeType === 'sets'
  const isAllView  = activeType === ''

  const [products, setProducts] = useState<Product[]>([])
  const [sets, setSets]         = useState<ReadySet[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [colors, setColors]     = useState<ColorOption[]>([])
  const [sizes, setSizes]       = useState<string[]>(['S', 'M', 'L', 'XL'])

  const [topStyles,    setTopStyles]    = useState<ProductStyleOption[]>(DEFAULT_TOP_STYLES)
  const [bottomStyles, setBottomStyles] = useState<ProductStyleOption[]>(DEFAULT_BOTTOM_STYLES)
  const styleLabels = useMemo(
    () => Object.fromEntries([...topStyles, ...bottomStyles].map(s => [s.key, s.label])),
    [topStyles, bottomStyles],
  )

  // Available styles depend on selected type
  const styleOptions = useMemo(() => {
    if (activeType === 'top')    return topStyles.map(s => s.key)
    if (activeType === 'bottom') return bottomStyles.map(s => s.key)
    return [...topStyles, ...bottomStyles].map(s => s.key)
  }, [activeType, topStyles, bottomStyles])

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

  // Fetch available sizes once
  useEffect(() => {
    productsApi.sizeGuide().then(res => setSizes(res.sizes)).catch(() => {})
  }, [])

  // Fetch style options once
  useEffect(() => {
    productsApi.storeContent().then(res => {
      setTopStyles(res.product_styles.top)
      setBottomStyles(res.product_styles.bottom)
    }).catch(() => {})
  }, [])

  // Debounce the search box into the URL param so we don't fetch on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setParam('q', searchDraft.trim()), 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft])

  // Fetch products (or ready-made sets) on filter change
  const fetchProducts = useCallback(() => {
    setLoading(true)
    setLoadError(false)

    const q = activeSearch.trim().toLowerCase()
    const filterSets = (all: ReadySet[]) => all.filter(s =>
      (!activeSize || s.available_sizes.includes(activeSize)) &&
      (!q || s.name.toLowerCase().includes(q)),
    )

    if (isSetsView) {
      setsApi.list()
        .then(all => {
          const filtered = filterSets(all)
          setSets(filtered)
          setTotal(filtered.length)
        })
        .catch(() => {
          setSets([])
          setTotal(0)
          setLoadError(true)
        })
        .finally(() => setLoading(false))
      return
    }

    const productsReq = productsApi.list({
      type:   activeType  as 'top' | 'bottom' | undefined || undefined,
      style:  activeStyle || undefined,
      color:  activeColor || undefined,
      size:   activeSize  || undefined,
      search: activeSearch || undefined,
    })
    // The "All" tab also folds in ready-made sets alongside individual pieces.
    const setsReq = isAllView ? setsApi.list().catch(() => [] as ReadySet[]) : Promise.resolve([] as ReadySet[])

    Promise.all([productsReq, setsReq])
      .then(([res, allSets]) => {
        setProducts(res.products)
        const filtered = filterSets(allSets)
        setSets(filtered)
        setTotal(res.total + filtered.length)
      })
      .catch(() => {
        setProducts([])
        setSets([])
        setTotal(0)
        setLoadError(true)
      })
      .finally(() => setLoading(false))
  }, [isSetsView, isAllView, activeType, activeStyle, activeColor, activeSize, activeSearch])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

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
            {activeType === 'top' ? 'Tops' : activeType === 'bottom' ? 'Bottoms' : isSetsView ? 'Ready-made Sets' : 'All Pieces'}
          </h1>
          {total > 0 && !loading && (
            <p className="text-[13px] text-[#8a7c72] mt-1">{total} {isSetsView ? (total === 1 ? 'set' : 'sets') : 'pieces'}</p>
          )}
        </div>

        {/* ── search ───────────────────────────────────────────────────────── */}
        <div className="max-w-[360px] mx-auto mb-8 relative">
          <svg
            viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mocha/40 pointer-events-none"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M18 18 L13.5 13.5" />
          </svg>
          <input
            type="search"
            value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
            placeholder="Search pieces…"
            aria-label="Search products"
            className="w-full bg-white rounded-full pl-10 pr-4 py-2.5 text-[13px] text-ink
                       placeholder:text-mocha/40 border border-mocha/15 focus:outline-none
                       focus:border-mocha/40 transition-colors"
          />
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
          {!isSetsView && styleOptions.length > 0 && (
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
                  {styleLabels[s]}
                </button>
              ))}
            </div>
          )}

          {/* Color swatches */}
          {!isSetsView && colors.length > 0 && (
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
            {sizes.map(s => (
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

        {/* ── product / sets grid ──────────────────────────────────────────── */}
        {loading ? (
          <SkeletonGrid count={8} />
        ) : loadError ? (
          <InlineError message="We couldn't load the collection." onRetry={fetchProducts} />
        ) : isSetsView ? (
          sets.length === 0 ? (
            <EmptyState message="No sets match these filters." subtext="Try clearing a filter or searching for something else." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {sets.map(s => (
                <ReadySetCard key={s.id} set={s} />
              ))}
            </div>
          )
        ) : products.length === 0 && sets.length === 0 ? (
          <EmptyState message="No pieces match these filters." subtext="Try clearing a filter or searching for something else." />
        ) : (
          <div className="space-y-12">
            {products.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} sizes={sizes} styleLabels={styleLabels} />
                ))}
              </div>
            )}
            {isAllView && sets.length > 0 && (
              <div>
                <h2 className="font-logo text-ink mb-5" style={{ fontSize: 'clamp(20px, 3vw, 26px)' }}>
                  Ready-made Sets
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {sets.map(s => (
                    <ReadySetCard key={s.id} set={s} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
