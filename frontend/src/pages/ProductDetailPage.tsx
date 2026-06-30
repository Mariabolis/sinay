import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { productsApi, type Product, type ProductVariant } from '../api/products'
import { cartApi } from '../api/cart'
import { useCartStore } from '../store/cartStore'
import { TOP_PATHS, BOTTOM_PATHS } from '../lib/garmentPaths'

// ── care icon SVGs ─────────────────────────────────────────────────────────────

const CARE_ICONS = [
  {
    label: 'Hand wash cold',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M10 26c0-3 1-5 2-7l2-4" />
        <path d="M22 26c0-3-1-5-2-7l-2-4" />
        <path d="M8 15c0-6 4-10 8-10s8 4 8 10" />
        <path d="M12 11c0 2 1.5 3 4 3s4-1 4-3" />
      </svg>
    ),
  },
  {
    label: 'Gentle cycle',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="16" cy="16" r="10" />
        <circle cx="16" cy="16" r="6" />
        <path d="M16 6a10 10 0 0 1 7 3" />
        <path d="M10 22a10 10 0 0 1-3-7" />
      </svg>
    ),
  },
  {
    label: 'Do not tumble dry',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="5" y="7" width="22" height="18" rx="3" />
        <circle cx="16" cy="16" r="5" />
        <line x1="5" y1="7" x2="27" y2="25" />
      </svg>
    ),
  },
  {
    label: 'Low heat iron',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M6 20 Q16 12 26 14 L26 22 Q22 24 16 24 L8 24 Z" />
        <line x1="12" y1="24" x2="12" y2="27" />
        <circle cx="20" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

// ── size guide data ────────────────────────────────────────────────────────────

const SIZE_GUIDE_TOPS = [
  { size: 'S',  chest: '84–88',  length: '62',  shoulder: '37' },
  { size: 'M',  chest: '88–92',  length: '64',  shoulder: '39' },
  { size: 'L',  chest: '92–96',  length: '66',  shoulder: '41' },
  { size: 'XL', chest: '96–102', length: '68',  shoulder: '43' },
]

const SIZE_GUIDE_BOTTOMS = [
  { size: 'S',  waist: '64–68',  hip: '90–94',  inseam: '28' },
  { size: 'M',  waist: '68–72',  hip: '94–98',  inseam: '29' },
  { size: 'L',  waist: '72–76',  hip: '98–104', inseam: '30' },
  { size: 'XL', waist: '76–82',  hip: '104–110',inseam: '31' },
]

// ── helpers ────────────────────────────────────────────────────────────────────

function getGarmentPath(type: string, style: string): string {
  if (type === 'top') return TOP_PATHS[style] ?? TOP_PATHS['classic_short_sleeve']
  return BOTTOM_PATHS[style] ?? BOTTOM_PATHS['wide_leg']
}

function uniqueColors(variants: ProductVariant[]) {
  const seen = new Set<string>()
  return variants.filter(v => {
    if (seen.has(v.color_hex)) return false
    seen.add(v.color_hex)
    return true
  })
}

// ── Garment placeholder (used when no real images exist for a color) ───────────

function GarmentPlaceholder({
  type, style, colorHex, label, small = false,
}: { type: string; style: string; colorHex: string; label?: string; small?: boolean }) {
  const path = getGarmentPath(type, style)
  const viewBox = type === 'top' ? '40 5 120 160' : '40 10 75 160'
  return (
    <div
      className={`flex flex-col items-center justify-center bg-[#F9F5F0] rounded-xl overflow-hidden select-none ${
        small ? 'w-full h-full' : 'w-full h-full'
      }`}
      aria-label={label ?? type}
    >
      <svg viewBox={viewBox} className={small ? 'w-10 h-10' : 'w-3/5 max-w-[180px]'} aria-hidden="true">
        <path fill={colorHex} stroke="#8B7568" strokeWidth="2" d={path} />
      </svg>
      {label && !small && (
        <span className="mt-2 text-[10px] tracking-[0.12em] uppercase text-mocha/50">{label}</span>
      )}
    </div>
  )
}

// ── Size guide modal ──────────────────────────────────────────────────────────

function SizeGuideModal({ type, onClose }: { type: string; onClose: () => void }) {
  const isTop = type === 'top'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-cream w-full sm:max-w-[520px] rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl"
        style={{ animation: 'fadeUp 240ms cubic-bezier(.4,0,.2,1) both' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-logo text-xl text-ink tracking-wide">Size guide — {isTop ? 'Tops' : 'Bottoms'}</h2>
          <button
            onClick={onClose}
            aria-label="Close size guide"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mocha/10 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4">
              <path d="M4 4 L16 16 M16 4 L4 16" />
            </svg>
          </button>
        </div>

        <p className="text-[12px] text-mocha/60 mb-4">All measurements in centimeters. Measure your body, not your garment.</p>

        {isTop ? (
          <table className="w-full text-[13px] font-body border-collapse">
            <thead>
              <tr className="border-b border-mocha/15">
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Size</th>
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Chest</th>
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Length</th>
                <th className="text-left py-2      text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Shoulder</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_GUIDE_TOPS.map(row => (
                <tr key={row.size} className="border-b border-mocha/8 hover:bg-mocha/5 transition-colors">
                  <td className="py-3 pr-4 font-semibold text-ink">{row.size}</td>
                  <td className="py-3 pr-4 text-ink/70">{row.chest} cm</td>
                  <td className="py-3 pr-4 text-ink/70">{row.length} cm</td>
                  <td className="py-3      text-ink/70">{row.shoulder} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-[13px] font-body border-collapse">
            <thead>
              <tr className="border-b border-mocha/15">
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Size</th>
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Waist</th>
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Hip</th>
                <th className="text-left py-2      text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Inseam</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_GUIDE_BOTTOMS.map(row => (
                <tr key={row.size} className="border-b border-mocha/8 hover:bg-mocha/5 transition-colors">
                  <td className="py-3 pr-4 font-semibold text-ink">{row.size}</td>
                  <td className="py-3 pr-4 text-ink/70">{row.waist} cm</td>
                  <td className="py-3 pr-4 text-ink/70">{row.hip} cm</td>
                  <td className="py-3      text-ink/70">{row.inseam} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="mt-4 text-[11px] text-mocha/50 leading-relaxed">
          Between sizes? We recommend sizing up for a relaxed, lounge-friendly fit.
        </p>
      </div>
    </div>
  )
}

// ── Accordion ─────────────────────────────────────────────────────────────────

function AccordionPanel({
  title, children, open, onToggle,
}: { title: string; children: React.ReactNode; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-t border-mocha/15 last:border-b">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha/30 rounded"
        aria-expanded={open}
      >
        <span className="font-body font-semibold text-[13.5px] tracking-[0.04em] text-ink">{title}</span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className={`w-4 h-4 text-mocha shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          style={{ transitionTimingFunction: 'cubic-bezier(.4,0,.2,1)' }}
        >
          <path d="M3 6 L8 11 L13 6" />
        </svg>
      </button>
      <div
        className="overflow-hidden"
        style={{
          maxHeight: open ? '500px' : '0',
          transition: 'max-height 320ms cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div className="pb-5 text-[13px] text-ink/70 leading-relaxed font-body">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Complete the Set card ──────────────────────────────────────────────────────

function RelatedCard({ product }: { product: Product }) {
  const firstColor = product.variants[0]
  const colorHex   = firstColor?.color_hex ?? '#EBCFD2'
  const colorName  = firstColor?.color_name ?? ''
  const price      = firstColor?.price ?? product.base_price
  const imageUrl   = product.variants.find(v => v.image_url)?.image_url ?? null

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-[0_4px_18px_rgba(139,117,104,0.10)] hover:shadow-[0_8px_28px_rgba(139,117,104,0.17)] transition-shadow duration-300"
    >
      <div className="aspect-[3/4] flex items-center justify-center bg-[#F9F5F0] overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <GarmentPlaceholder type={product.type} style={product.style} colorHex={colorHex} />
        )}
      </div>
      <div className="p-4">
        <h4 className="font-body font-semibold text-[13px] text-ink leading-snug">{product.name}</h4>
        <p className="text-[11.5px] text-mocha/70 mt-0.5 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block border border-mocha/20" style={{ background: colorHex }} />
          {colorName}
        </p>
        <p className="mt-2 text-[13px] font-semibold text-ink">EGP {price.toFixed(0)}</p>
      </div>
    </Link>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ANGLE_LABELS = ['Front', 'Back', 'Detail', 'Styled']

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const setCart  = useCartStore(s => s.setCart)

  const [product,    setProduct]    = useState<Product | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [related,    setRelated]    = useState<Product[]>([])

  // selections
  const [activeHex,  setActiveHex]  = useState('')
  const [activeSize, setActiveSize] = useState<string | null>(null)
  const [quantity,   setQuantity]   = useState(1)
  const [mainImgIdx, setMainImgIdx] = useState(0)

  // UI state
  const [openPanel,  setOpenPanel]  = useState<string>('description')
  const [sizeGuide,  setSizeGuide]  = useState(false)
  const [adding,     setAdding]     = useState(false)
  const [added,      setAdded]      = useState(false)
  const [addError,   setAddError]   = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    productsApi.get(slug)
      .then(p => {
        setProduct(p)
        const first = uniqueColors(p.variants)[0]
        setActiveHex(first?.color_hex ?? '')
        setActiveSize(null)
        setMainImgIdx(0)
      })
      .catch(() => navigate('/shop', { replace: true }))
      .finally(() => setLoading(false))
  }, [slug, navigate])

  // fetch related products once product type is known
  useEffect(() => {
    if (!product) return
    const oppositeType = product.type === 'top' ? 'bottom' : 'top'
    productsApi.list({ type: oppositeType, per_page: 3 })
      .then(res => setRelated(res.products))
      .catch(() => {})
  }, [product])

  // Reset gallery index when color changes
  function handleColorChange(hex: string) {
    setActiveHex(hex)
    setActiveSize(null)
    setMainImgIdx(0)
  }

  // ── derived ────────────────────────────────────────────────────────────────

  const colors = useMemo(
    () => (product ? uniqueColors(product.variants) : []),
    [product],
  )

  const activeColorName = useMemo(
    () => colors.find(v => v.color_hex === activeHex)?.color_name ?? '',
    [colors, activeHex],
  )

  // All sizes for selected color, preserving canonical order
  const SIZE_ORDER = ['S', 'M', 'L', 'XL']
  const variantsForColor = useMemo(
    () => product?.variants.filter(v => v.color_hex === activeHex) ?? [],
    [product, activeHex],
  )
  const sizesForColor = useMemo(() => {
    const sizeSet = new Set(variantsForColor.map(v => v.size))
    return SIZE_ORDER.filter(s => sizeSet.has(s))
  }, [variantsForColor])

  const activeVariant = useMemo(
    () => variantsForColor.find(v => v.size === activeSize) ?? null,
    [variantsForColor, activeSize],
  )

  const isOutOfStock = (size: string) => {
    const v = variantsForColor.find(vv => vv.size === size)
    return !v || v.stock_quantity === 0
  }

  const price = activeVariant?.price ?? product?.base_price ?? 0

  // Gallery: variant image_url values for the active colour take priority;
  // fall back to the product_images table, then to SVG placeholders.
  const galleryImages = useMemo((): string[] => {
    if (!product) return []

    // 1. image_url stored on each variant (deduplicated — all sizes share the same photo)
    const variantUrls = [...new Set(
      product.variants
        .filter(v => v.color_hex === activeHex && v.image_url)
        .map(v => v.image_url as string),
    )]
    if (variantUrls.length > 0) return variantUrls

    // 2. product_images table rows
    return product.images
      .filter(img => img.variant_id === null || img.variant_id === activeVariant?.id)
      .map(img => img.url)
  }, [product, activeHex, activeVariant])

  const hasRealImages = galleryImages.length > 0

  // ── add to bag ────────────────────────────────────────────────────────────

  async function handleAddToBag() {
    if (!activeVariant || adding) return
    setAdding(true)
    setAddError(null)
    try {
      const cart = await cartApi.addItem(activeVariant.id, quantity)
      setCart(cart)
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    } catch {
      setAddError('Could not add to bag — please try again.')
    } finally {
      setAdding(false)
    }
  }

  const canAdd = !!activeVariant && activeVariant.stock_quantity > 0

  // ── loading / 404 ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="font-logo text-2xl text-mocha/40 animate-pulse">~</div>
      </div>
    )
  }
  if (!product) return null

  return (
    <>
      {/* Size guide modal */}
      {sizeGuide && (
        <SizeGuideModal type={product.type} onClose={() => setSizeGuide(false)} />
      )}

      <div className="bg-cream min-h-screen font-body">
        {/* ── Breadcrumb ────────────────────────────────────────────────── */}
        <nav className="max-w-[1120px] mx-auto px-5 pt-5 pb-1">
          <ol className="flex items-center gap-2 text-[11.5px] text-mocha/50 tracking-wide">
            <li><Link to="/shop" className="hover:text-mocha transition-colors">Shop</Link></li>
            <li aria-hidden>/</li>
            <li>
              <Link
                to={`/shop/${product.type}s`}
                className="hover:text-mocha transition-colors capitalize"
              >
                {product.type}s
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-ink/60">{product.name}</li>
          </ol>
        </nav>

        {/* ── Main 2-col layout ─────────────────────────────────────────── */}
        <div className="max-w-[1120px] mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-10 xl:gap-16 pb-28 sm:pb-10">

          {/* ── Gallery ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {/* Main image */}
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-[#F9F5F0] relative">
              {hasRealImages ? (
                <img
                  key={galleryImages[mainImgIdx]}
                  src={galleryImages[mainImgIdx]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
              ) : (
                <GarmentPlaceholder type={product.type} style={product.style} colorHex={activeHex} label="Front view" />
              )}
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-2">
              {hasRealImages
                ? galleryImages.slice(0, 4).map((url, i) => (
                    <button
                      key={url}
                      onClick={() => setMainImgIdx(i)}
                      className={`aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha/50 ${
                        mainImgIdx === i ? 'border-mocha' : 'border-transparent hover:border-mocha/30'
                      }`}
                    >
                      <img src={url} alt={`${product.name} view ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))
                : ANGLE_LABELS.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => setMainImgIdx(i)}
                      className={`aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha/50 ${
                        mainImgIdx === i ? 'border-mocha' : 'border-transparent hover:border-mocha/30'
                      }`}
                      aria-label={label}
                    >
                      <div className="w-full h-full">
                        <GarmentPlaceholder type={product.type} style={product.style} colorHex={activeHex} small />
                      </div>
                    </button>
                  ))
              }
            </div>
          </div>

          {/* ── Product info ─────────────────────────────────────────────── */}
          <div>
            {/* Name + style pill */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <h1
                className="font-logo text-ink leading-tight"
                style={{ fontSize: 'clamp(26px, 4vw, 34px)' }}
              >
                {product.name}
              </h1>
              <span className="shrink-0 mt-1 text-[10px] tracking-[0.18em] uppercase bg-mocha/10 text-mocha rounded-full px-3 py-1">
                {product.style.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Price */}
            <p className="font-logo text-2xl text-ink mt-2 mb-6">
              EGP {price.toFixed(0)}
            </p>

            {/* ── Color swatches ────────────────────────────────────────── */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-mocha/70">
                  Colour
                </span>
                <span className="text-[12px] text-ink/60">{activeColorName}</span>
              </div>
              <div className="flex gap-2.5 flex-wrap" role="group" aria-label="Select colour">
                {colors.map(v => (
                  <button
                    key={v.color_hex}
                    onClick={() => handleColorChange(v.color_hex)}
                    aria-label={v.color_name}
                    aria-pressed={activeHex === v.color_hex}
                    style={{ background: v.color_hex }}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-mocha ${
                      activeHex === v.color_hex
                        ? 'border-mocha scale-110 shadow-md'
                        : 'border-transparent hover:border-mocha/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* ── Size pills ────────────────────────────────────────────── */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-mocha/70">
                  Size
                </span>
                <button
                  onClick={() => setSizeGuide(true)}
                  className="text-[11.5px] text-mocha underline underline-offset-2 hover:text-ink transition-colors"
                >
                  Size guide
                </button>
              </div>

              <div className="flex gap-2 flex-wrap" role="group" aria-label="Select size">
                {sizesForColor.map(sz => {
                  const oos = isOutOfStock(sz)
                  return (
                    <button
                      key={sz}
                      onClick={() => !oos && setActiveSize(sz === activeSize ? null : sz)}
                      aria-pressed={activeSize === sz}
                      disabled={oos}
                      className={`relative font-body font-semibold text-[12.5px] border-[1.4px] rounded-full px-[15px] py-[7px] transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha focus-visible:outline-offset-[2px] ${
                        oos
                          ? 'border-mocha/20 text-mocha/30 line-through cursor-not-allowed bg-transparent'
                          : activeSize === sz
                          ? 'bg-ink text-cream border-ink cursor-pointer'
                          : 'bg-transparent text-mocha border-mocha hover:bg-mocha/10 cursor-pointer'
                      }`}
                    >
                      {sz}
                    </button>
                  )
                })}
              </div>

              {/* Out-of-stock note */}
              {sizesForColor.some(isOutOfStock) && (
                <p className="mt-2 text-[11px] text-mocha/50">
                  Crossed out sizes are out of stock — back soon.
                </p>
              )}
            </div>

            {/* ── Quantity stepper ─────────────────────────────────────── */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-mocha/70">
                Qty
              </span>
              <div className="flex items-center border border-mocha/25 rounded-full overflow-hidden">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="w-9 h-9 flex items-center justify-center text-mocha hover:bg-mocha/8 transition-colors disabled:opacity-30"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5">
                    <path d="M3 8h10" />
                  </svg>
                </button>
                <span className="w-8 text-center font-semibold text-[13px] text-ink select-none">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(9, q + 1))}
                  disabled={quantity >= 9}
                  aria-label="Increase quantity"
                  className="w-9 h-9 flex items-center justify-center text-mocha hover:bg-mocha/8 transition-colors disabled:opacity-30"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Add to Bag ───────────────────────────────────────────── */}
            <div className="mb-2">
              <button
                onClick={handleAddToBag}
                disabled={!canAdd || adding}
                className="w-full btn-pill-solid py-[14px] text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '14px' }}
              >
                {adding
                  ? 'Adding…'
                  : added
                  ? 'Added to bag!'
                  : !activeSize
                  ? 'Select a size'
                  : `Add to Bag · EGP ${(price * quantity).toFixed(0)}`}
              </button>
              {addError && <p className="mt-2 text-[12px] text-red-500 text-center">{addError}</p>}
            </div>

            {/* Builder nudge */}
            <p className="text-[12px] text-mocha/50 text-center mb-8">
              Want to pair it?{' '}
              <Link to="/build-your-set" className="underline underline-offset-2 hover:text-mocha transition-colors">
                Build your own set
              </Link>
            </p>

            {/* ── Accordion ────────────────────────────────────────────── */}
            <div>
              <AccordionPanel
                title="Description"
                open={openPanel === 'description'}
                onToggle={() => setOpenPanel(p => p === 'description' ? '' : 'description')}
              >
                <p>{product.description || 'Lightweight, breathable, and made for all-day comfort.'}</p>
              </AccordionPanel>

              <AccordionPanel
                title="Fabric & Care"
                open={openPanel === 'fabric'}
                onToggle={() => setOpenPanel(p => p === 'fabric' ? '' : 'fabric')}
              >
                {product.fabric && (
                  <p className="mb-4">
                    <span className="font-semibold text-ink/80">Fabric: </span>{product.fabric}
                  </p>
                )}
                {product.care_notes && (
                  <p className="mb-5">{product.care_notes}</p>
                )}
                <div className="grid grid-cols-4 gap-3">
                  {CARE_ICONS.map(({ label, icon }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                      <div className="text-mocha/60">{icon}</div>
                      <span className="text-[10px] leading-tight text-mocha/50">{label}</span>
                    </div>
                  ))}
                </div>
              </AccordionPanel>

              <AccordionPanel
                title="Shipping & Returns"
                open={openPanel === 'shipping'}
                onToggle={() => setOpenPanel(p => p === 'shipping' ? '' : 'shipping')}
              >
                <ul className="space-y-2">
                  <li>Free standard shipping on orders over EGP 900.</li>
                  <li>Delivered within 3–5 business days across Egypt.</li>
                  <li>Express delivery available at checkout (Cairo & Giza).</li>
                  <li className="pt-1 border-t border-mocha/10 mt-3">
                    Returns accepted within 14 days, unworn and in original packaging.
                    Contact us via WhatsApp or email to initiate a return.
                  </li>
                </ul>
              </AccordionPanel>
            </div>
          </div>
        </div>

        {/* ── Complete the Set ─────────────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="border-t border-mocha/10 bg-[#F9F5F0]">
            <div className="max-w-[1120px] mx-auto px-5 py-14">
              <div className="mb-8 text-center">
                <p className="text-[11px] tracking-[0.3em] uppercase text-mocha/60 mb-1">
                  Pair it with
                </p>
                <h2 className="font-logo text-ink" style={{ fontSize: 'clamp(24px, 4vw, 32px)' }}>
                  Complete the set
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 max-w-[700px] mx-auto">
                {related.map(p => <RelatedCard key={p.id} product={p} />)}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ── Sticky mobile Add to Bag bar ──────────────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-cream/90 border-t border-mocha/15 px-4 py-3 flex items-center gap-3"
           style={{ backdropFilter: 'blur(8px)' }}>
        <div className="flex-1">
          <p className="font-body font-semibold text-[13px] text-ink leading-none">{product.name}</p>
          <p className="text-[12px] text-mocha mt-0.5">EGP {(price * quantity).toFixed(0)}</p>
        </div>
        <button
          onClick={handleAddToBag}
          disabled={!canAdd || adding}
          className="btn-pill-solid disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-[13px] shrink-0"
        >
          {adding ? 'Adding…' : added ? 'Added!' : !activeSize ? 'Select size' : 'Add to Bag'}
        </button>
      </div>
    </>
  )
}
