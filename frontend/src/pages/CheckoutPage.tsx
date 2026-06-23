import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { checkoutApi, type Address, type AddressInput } from '../api/checkout'

const GOVERNORATES = [
  'Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Red Sea', 'Beheira',
  'Fayoum', 'Gharbiya', 'Ismailia', 'Menofia', 'Minya', 'Qalyubia',
  'New Valley', 'Suez', 'Aswan', 'Assiut', 'Beni Suef', 'Port Said',
  'Damietta', 'Sharkia', 'South Sinai', 'Kafr El Sheikh', 'Matruh',
  'Luxor', 'Qena', 'North Sinai', 'Sohag',
]

const EMPTY_FORM: AddressInput = {
  full_name: '', phone: '', governorate: '', city: '',
  street: '', building: '', notes: '', save_address: true,
}

export default function CheckoutPage() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const cart      = useCartStore(s => s.cart)

  const [addresses,      setAddresses]      = useState<Address[]>([])
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null)
  const [showNewForm,    setShowNewForm]     = useState(false)
  const [form,           setForm]           = useState<AddressInput>(EMPTY_FORM)
  const [paymentMethod,  setPaymentMethod]  = useState<'card' | 'cod'>('card')
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  // Redirect guests to login
  useEffect(() => {
    if (!user) navigate('/login?redirect=/checkout')
  }, [user, navigate])

  // Redirect if cart is empty
  useEffect(() => {
    if (cart && cart.items.length === 0) navigate('/cart')
  }, [cart, navigate])

  // Load saved addresses
  useEffect(() => {
    if (!user) return
    checkoutApi.listAddresses()
      .then(list => {
        setAddresses(list)
        if (list.length > 0) {
          setSelectedAddrId(list.find(a => a.is_default)?.id ?? list[0].id)
        } else {
          setShowNewForm(true)
        }
      })
      .catch(() => setShowNewForm(true))
  }, [user])

  function setField(k: keyof AddressInput, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function isFormValid() {
    return form.full_name && form.phone && form.governorate && form.city && form.street
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!cart || cart.items.length === 0) return
    setError(null)
    setSubmitting(true)

    try {
      const addrPart = showNewForm || !selectedAddrId
        ? { address: form }
        : { address_id: selectedAddrId }

      const { order_id, paymob_iframe_url } = await checkoutApi.checkout({
        ...addrPart,
        payment_method: paymentMethod,
      })

      if (paymentMethod === 'cod') {
        navigate(`/order/${order_id}/confirmation?cod=true`)
      } else {
        sessionStorage.setItem('pending_order_id', order_id)
        window.location.href = paymob_iframe_url!
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Something went wrong, please try again.'
      setError(msg)
      setSubmitting(false)
    }
  }

  if (!user || !cart) return null

  const subtotal = cart.subtotal
  const discount = cart.discount
  const total    = cart.total

  return (
    <main className="max-w-[1080px] mx-auto px-6 py-12">
      <h1 className="font-logo text-ink mb-10" style={{ fontSize: 'clamp(26px,5vw,36px)' }}>
        Checkout
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">

          {/* ── address column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">
            <h2 className="font-body font-semibold text-[14px] tracking-[0.1em] uppercase text-mocha">
              Delivery address
            </h2>

            {/* Saved address cards */}
            {addresses.length > 0 && (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <label
                    key={addr.id}
                    className={`flex gap-3 p-4 rounded-[14px] border-[1.5px] cursor-pointer transition-colors ${
                      selectedAddrId === addr.id && !showNewForm
                        ? 'border-mocha bg-white'
                        : 'border-mocha/20 bg-white/60 hover:border-mocha/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddrId === addr.id && !showNewForm}
                      onChange={() => { setSelectedAddrId(addr.id); setShowNewForm(false) }}
                      className="mt-0.5 accent-mocha"
                    />
                    <div className="text-[13px] leading-relaxed text-ink">
                      <p className="font-semibold">{addr.full_name ?? ''}</p>
                      <p className="text-mocha/70">
                        {[addr.street, addr.building, addr.city, addr.governorate]
                          .filter(Boolean).join(', ')}
                      </p>
                      {addr.phone && <p className="text-mocha/60">{addr.phone}</p>}
                    </div>
                  </label>
                ))}

                {/* Toggle new form */}
                <button
                  type="button"
                  onClick={() => { setShowNewForm(v => !v); setSelectedAddrId(null) }}
                  className={`w-full py-3 rounded-[14px] border-[1.5px] border-dashed text-[13px] font-semibold transition-colors ${
                    showNewForm
                      ? 'border-mocha bg-white text-mocha'
                      : 'border-mocha/30 text-mocha/60 hover:border-mocha/60'
                  }`}
                >
                  + Use a different address
                </button>
              </div>
            )}

            {/* Inline address form */}
            {showNewForm && (
              <div className="bg-white rounded-[18px] p-6 shadow-[0_4px_16px_rgba(139,117,104,0.08)] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full name *">
                    <input value={form.full_name} onChange={e => setField('full_name', e.target.value)}
                      required placeholder="e.g. Sarah Ahmed" className={inputCls} />
                  </Field>
                  <Field label="Phone *">
                    <input value={form.phone} onChange={e => setField('phone', e.target.value)}
                      required placeholder="+20 10 0000 0000" className={inputCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Governorate *">
                    <select value={form.governorate} onChange={e => setField('governorate', e.target.value)}
                      required className={inputCls}>
                      <option value="">Select…</option>
                      {GOVERNORATES.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="City / District *">
                    <input value={form.city} onChange={e => setField('city', e.target.value)}
                      required placeholder="e.g. Zamalek" className={inputCls} />
                  </Field>
                </div>
                <Field label="Street *">
                  <input value={form.street} onChange={e => setField('street', e.target.value)}
                    required placeholder="Street name and number" className={inputCls} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Building / Apartment">
                    <input value={form.building ?? ''} onChange={e => setField('building', e.target.value)}
                      placeholder="Building, floor, apt" className={inputCls} />
                  </Field>
                  <Field label="Delivery notes">
                    <input value={form.notes ?? ''} onChange={e => setField('notes', e.target.value)}
                      placeholder="Ring bell 3×, etc." className={inputCls} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-[13px] text-mocha cursor-pointer">
                  <input type="checkbox" checked={form.save_address ?? true}
                    onChange={e => setField('save_address', e.target.checked)}
                    className="accent-mocha" />
                  Save this address for future orders
                </label>
              </div>
            )}
          </div>

          {/* ── order summary column ───────────────────────────────────────── */}
          <div className="lg:col-span-2 sticky top-6">
            <div className="bg-white rounded-[18px] p-6 shadow-[0_8px_24px_rgba(139,117,104,0.10)]">
              <h2 className="font-body font-semibold text-[13px] tracking-[0.12em] uppercase text-mocha mb-5">
                Order summary
              </h2>

              <ul className="space-y-3 mb-5 max-h-[260px] overflow-y-auto pr-1">
                {cart.items.map(item => (
                  <li key={item.id} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg shrink-0"
                      style={{ background: item.variant.color_hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-ink truncate">
                        {item.variant.product.name}
                      </p>
                      <p className="text-[11px] text-mocha/60">
                        {item.variant.color_name} · {item.variant.size}
                        {item.quantity > 1 && ` × ${item.quantity}`}
                      </p>
                    </div>
                    <p className="text-[13px] text-ink shrink-0">
                      EGP {(item.unit_price * item.quantity).toFixed(0)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="border-t border-mocha/10 pt-4 space-y-2 text-[13px]">
                <div className="flex justify-between text-mocha">
                  <span>Subtotal</span><span>EGP {subtotal.toFixed(0)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#4a7c4a]">
                    <span>Discount</span><span>− EGP {discount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-[15px] text-ink pt-2 border-t border-mocha/10">
                  <span>Total</span><span>EGP {total.toFixed(0)}</span>
                </div>
              </div>

              {/* ── payment method ── */}
              <div className="mt-5 space-y-2">
                <p className="text-[11.5px] font-semibold tracking-[0.06em] uppercase text-mocha">
                  Payment method
                </p>
                <label className={`flex items-center gap-3 p-3 rounded-[12px] border-[1.5px] cursor-pointer transition-colors ${
                  paymentMethod === 'card' ? 'border-mocha bg-white' : 'border-mocha/20 hover:border-mocha/40'
                }`}>
                  <input
                    type="radio" name="payment_method" value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="accent-mocha"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-ink">Pay online</p>
                    <p className="text-[11px] text-mocha/60">Credit / debit card via Paymob</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-[12px] border-[1.5px] cursor-pointer transition-colors ${
                  paymentMethod === 'cod' ? 'border-mocha bg-white' : 'border-mocha/20 hover:border-mocha/40'
                }`}>
                  <input
                    type="radio" name="payment_method" value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-mocha"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-ink">Cash on Delivery</p>
                    <p className="text-[11px] text-mocha/60">Pay in cash when your order arrives</p>
                  </div>
                </label>
              </div>

              {error && (
                <p className="mt-4 text-[12px] text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || (!selectedAddrId && (!showNewForm || !isFormValid()))}
                className="btn-pill-solid w-full mt-5 flex justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting
                  ? (paymentMethod === 'cod' ? 'Placing order…' : 'Redirecting to payment…')
                  : (paymentMethod === 'cod' ? `Place Order · EGP ${total.toFixed(0)}` : `Pay EGP ${total.toFixed(0)}`)
                }
              </button>

              {paymentMethod === 'card' && (
                <p className="text-center text-[11px] text-mocha/50 mt-3">
                  You'll be redirected to Paymob's secure payment page.
                </p>
              )}

              <div className="text-center mt-4">
                <Link to="/cart" className="text-[12px] text-mocha underline underline-offset-2">
                  ← Back to cart
                </Link>
              </div>
            </div>
          </div>

        </div>
      </form>
    </main>
  )
}

// ── small helpers ──────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-full border border-mocha/25 bg-cream px-4 py-2 text-[13px] text-ink focus:outline-none focus:border-mocha transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold tracking-[0.06em] text-mocha mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}
