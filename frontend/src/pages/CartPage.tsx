import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cartApi, type CartItem } from '../api/cart'
import { useCartStore } from '../store/cartStore'
import { TOP_PATHS, BOTTOM_PATHS } from '../lib/garmentPaths'

export default function CartPage() {
  const { cart, loading, fetchCart, setCart } = useCartStore()
  const [couponInput,    setCouponInput]    = useState('')
  const [couponError,    setCouponError]    = useState<string | null>(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  // Partition items: grouped sets vs standalone pieces
  const { setGroups, singleItems } = useMemo(() => {
    if (!cart) return { setGroups: [] as CartItem[][], singleItems: [] as CartItem[] }

    const setMap = new Map<string, CartItem[]>()
    const singles: CartItem[] = []

    for (const item of cart.items) {
      if (item.set_id) {
        const group = setMap.get(item.set_id) ?? []
        group.push(item)
        setMap.set(item.set_id, group)
      } else {
        singles.push(item)
      }
    }
    return { setGroups: Array.from(setMap.values()), singleItems: singles }
  }, [cart])

  async function handleRemove(itemId: string) {
    try { setCart(await cartApi.removeItem(itemId)) } catch {}
  }

  async function handleQty(itemId: string, qty: number) {
    if (qty < 1) { await handleRemove(itemId); return }
    try { setCart(await cartApi.updateItem(itemId, qty)) } catch {}
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return
    setApplyingCoupon(true)
    setCouponError(null)
    try {
      setCart(await cartApi.applyCoupon(couponInput.trim()))
      setCouponInput('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Invalid coupon'
      setCouponError(msg)
    } finally {
      setApplyingCoupon(false)
    }
  }

  async function handleRemoveCoupon() {
    try { setCart(await cartApi.removeCoupon()) } catch {}
  }

  if (loading && !cart) {
    return (
      <div className="py-32 text-center text-mocha/60 tracking-wide text-sm">
        Loading your bag…
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="py-32 text-center px-6">
        <p className="font-logo text-ink mb-6" style={{ fontSize: 'clamp(26px,5vw,36px)' }}>
          Your bag is empty
        </p>
        <Link to="/shop" className="btn-pill-solid">Shop the collection</Link>
      </div>
    )
  }

  return (
    <main className="max-w-[1080px] mx-auto px-6 py-12">
      <h1 className="font-logo text-ink mb-10" style={{ fontSize: 'clamp(26px,5vw,36px)' }}>
        Your bag
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

        {/* ── item list ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {setGroups.map(group => (
            <SetGroupCard
              key={group[0].set_id!}
              group={group}
              onRemove={handleRemove}
            />
          ))}
          {singleItems.map(item => (
            <SingleItemCard
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onQtyChange={handleQty}
            />
          ))}
        </div>

        {/* ── order summary ─────────────────────────────────────────────────── */}
        <div className="sticky top-6">
          <div className="bg-white rounded-[18px] p-6 shadow-[0_8px_24px_rgba(139,117,104,0.10)]">
            <h2 className="font-body font-semibold text-[13px] tracking-[0.12em] uppercase text-mocha mb-5">
              Order summary
            </h2>

            {/* Coupon */}
            {cart.coupon_code ? (
              <div className="flex items-center justify-between mb-4 bg-cream-deep rounded-xl px-3 py-2">
                <span className="text-[13px] text-ink">
                  Coupon&nbsp;<strong>{cart.coupon_code}</strong>
                </span>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-mocha text-xs underline underline-offset-2 hover:text-ink transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mb-1">
                <input
                  type="text"
                  value={couponInput}
                  onChange={e => { setCouponInput(e.target.value); setCouponError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                  placeholder="Coupon code"
                  className="flex-1 rounded-full border border-mocha/30 px-3 py-1.5 text-[13px] text-ink bg-cream focus:outline-none focus:border-mocha"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={applyingCoupon || !couponInput.trim()}
                  className="btn-pill-sm disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            )}
            {couponError && (
              <p className="text-[11.5px] text-red-500 mb-3 pl-1">{couponError}</p>
            )}

            {/* Line items */}
            <div className="space-y-2.5 text-[13px] border-t border-mocha/10 pt-4 mt-4">
              <div className="flex justify-between text-mocha">
                <span>Subtotal</span>
                <span>EGP {cart.subtotal.toFixed(0)}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-[#4a7c4a]">
                  <span>Discount</span>
                  <span>− EGP {cart.discount.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-[15px] pt-2.5 border-t border-mocha/10 text-ink">
                <span>Total</span>
                <span>EGP {cart.total.toFixed(0)}</span>
              </div>
            </div>

            <Link to="/checkout" className="btn-pill-solid w-full mt-5 flex justify-center">
              Proceed to checkout
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

// ── set group card ─────────────────────────────────────────────────────────────

function SetGroupCard({
  group,
  onRemove,
}: {
  group: CartItem[]
  onRemove: (id: string) => void
}) {
  const top    = group.find(i => i.variant.product.type === 'top')
  const bottom = group.find(i => i.variant.product.type === 'bottom')
  const color  = top?.variant.color_hex ?? bottom?.variant.color_hex ?? '#EBCFD2'
  const total  = group.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  return (
    <div className="bg-white rounded-[18px] p-5 shadow-[0_4px_16px_rgba(139,117,104,0.08)] flex gap-5 items-start">
      {/* Combined garment preview */}
      <div className="w-[72px] shrink-0">
        <svg viewBox="0 0 200 360" className="w-full" aria-hidden="true">
          {top && TOP_PATHS[top.variant.product.style] && (
            <path
              fill={color}
              stroke="#8B7568"
              strokeWidth="2.5"
              d={TOP_PATHS[top.variant.product.style]}
            />
          )}
          {bottom && BOTTOM_PATHS[bottom.variant.product.style] && (
            <g transform="translate(0,180)">
              <path
                fill={color}
                stroke="#8B7568"
                strokeWidth="2.5"
                d={BOTTOM_PATHS[bottom.variant.product.style]}
              />
            </g>
          )}
        </svg>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] tracking-[0.15em] uppercase text-mocha mb-1">Matched set</p>
        <p className="font-body font-semibold text-[13.5px] text-ink leading-snug">
          {top?.variant.product.name}
          {top && bottom && <span className="text-mocha/50"> + </span>}
          {bottom?.variant.product.name}
        </p>
        <p className="text-[11.5px] text-[#8a7c72] mt-1">
          {top?.variant.color_name}
          {top && bottom && (
            <> · Top&nbsp;{top.variant.size}&nbsp;/&nbsp;Bottom&nbsp;{bottom.variant.size}</>
          )}
        </p>
        <p className="font-logo text-[18px] text-ink mt-2">EGP {total.toFixed(0)}</p>
      </div>

      <button
        onClick={() => onRemove(group[0].id)}
        aria-label="Remove set"
        className="text-[11.5px] text-mocha/50 hover:text-mocha transition-colors shrink-0 mt-0.5"
      >
        Remove
      </button>
    </div>
  )
}

// ── single item card ───────────────────────────────────────────────────────────

function SingleItemCard({
  item,
  onRemove,
  onQtyChange,
}: {
  item: CartItem
  onRemove: (id: string) => void
  onQtyChange: (id: string, qty: number) => void
}) {
  return (
    <div className="bg-white rounded-[18px] p-5 shadow-[0_4px_16px_rgba(139,117,104,0.08)] flex gap-5 items-start">
      {/* Color swatch */}
      <div
        className="w-[64px] h-[80px] rounded-xl shrink-0"
        style={{ background: item.variant.color_hex }}
      />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-body font-semibold text-[13.5px] text-ink">
          {item.variant.product.name}
        </p>
        <p className="text-[11.5px] text-[#8a7c72] mt-0.5">
          {item.variant.color_name} · {item.variant.size}
        </p>
        <p className="font-logo text-[18px] text-ink mt-2">
          EGP {(item.unit_price * item.quantity).toFixed(0)}
        </p>

        {/* Quantity controls */}
        <div className="flex items-center gap-2.5 mt-3">
          <button
            onClick={() => onQtyChange(item.id, item.quantity - 1)}
            aria-label="Decrease quantity"
            className="w-7 h-7 rounded-full border border-mocha/40 flex items-center justify-center text-mocha text-lg leading-none hover:bg-mocha/10 transition-colors cursor-pointer"
          >
            −
          </button>
          <span className="text-[13px] font-semibold w-5 text-center">{item.quantity}</span>
          <button
            onClick={() => onQtyChange(item.id, item.quantity + 1)}
            aria-label="Increase quantity"
            className="w-7 h-7 rounded-full border border-mocha/40 flex items-center justify-center text-mocha text-lg leading-none hover:bg-mocha/10 transition-colors cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={() => onRemove(item.id)}
        aria-label="Remove item"
        className="text-[11.5px] text-mocha/50 hover:text-mocha transition-colors shrink-0 mt-0.5"
      >
        Remove
      </button>
    </div>
  )
}
