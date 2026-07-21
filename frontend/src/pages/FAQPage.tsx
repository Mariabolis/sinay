import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi, type ShippingReturnsCopy } from '../api/products'

export default function FAQPage() {
  const [copy, setCopy] = useState<ShippingReturnsCopy | null>(null)

  useEffect(() => {
    productsApi.storeContent().then(res => setCopy(res.shipping_returns_copy)).catch(() => {})
  }, [])

  const faqs: { q: string; a: React.ReactNode }[] = [
    {
      q: 'How does Mix & Match work?',
      a: 'Pick a top and a bottom independently — different styles, different colors, whatever combination you like — and check out as one outfit. Try it on the Build Your Own page.',
    },
    {
      q: 'What sizes do you offer?',
      a: (
        <>
          Sizes vary by piece — check the <Link to="/size-guide" className="underline underline-offset-2 hover:text-mocha">size guide</Link> for measurements before you order.
        </>
      ),
    },
    {
      q: 'What payment methods do you accept?',
      a: 'Card payment (via Paymob) and Cash on Delivery.',
    },
    {
      q: 'Do I need an account to order?',
      a: 'Yes — registration is required before checkout, though you can browse the shop and build your cart without one.',
    },
    {
      q: 'What is your shipping policy?',
      a: copy?.free_shipping && copy?.delivery
        ? `${copy.free_shipping} ${copy.delivery} ${copy.express}`
        : 'See our Shipping & Returns page for details.',
    },
    {
      q: 'What is your return policy?',
      a: copy?.returns ?? 'See our Shipping & Returns page for details.',
    },
  ]

  return (
    <div className="max-w-[680px] mx-auto px-5 py-14 font-body">
      <div className="text-center mb-10">
        <p className="text-xs tracking-[0.3em] uppercase text-mocha mb-2">Good to know</p>
        <h1 className="font-logo text-[32px] text-ink">Frequently Asked Questions</h1>
      </div>

      <div>
        {faqs.map((item, i) => (
          <FAQItem key={i} question={item.q} answer={item.a} />
        ))}
      </div>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-mocha/15 last:border-b">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha/30 rounded"
        aria-expanded={open}
      >
        <span className="font-body font-semibold text-[14px] text-ink">{question}</span>
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
          maxHeight: open ? '300px' : '0',
          transition: 'max-height 320ms cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div className="pb-5 text-[13.5px] text-ink/70 leading-relaxed font-body">
          {answer}
        </div>
      </div>
    </div>
  )
}
