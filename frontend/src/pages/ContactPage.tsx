import { useEffect, useState } from 'react'
import { productsApi, type ContactInfo } from '../api/products'

export default function ContactPage() {
  const [contact, setContact] = useState<ContactInfo | null>(null)

  useEffect(() => {
    productsApi.storeContent().then(res => setContact(res.contact_info)).catch(() => {})
  }, [])

  const whatsappHref = contact
    ? `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`
    : undefined

  return (
    <div className="max-w-[600px] mx-auto px-5 py-14 font-body text-center">
      <p className="text-xs tracking-[0.3em] uppercase text-mocha mb-2">We're here to help</p>
      <h1 className="font-logo text-[32px] text-ink mb-4">Contact Us</h1>
      <p className="text-[14px] text-ink/60 leading-relaxed mb-10">
        Questions about an order, sizing, or anything else? Reach out — we usually reply within a day.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href={contact ? `mailto:${contact.email}` : undefined}
          className="btn-pill-solid px-8 py-3 text-[13px] w-full sm:w-auto"
        >
          Email {contact?.email ?? '…'}
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="border-[1.4px] border-mocha text-mocha rounded-full px-8 py-3 text-[13px]
                     font-semibold hover:bg-mocha/10 transition-colors w-full sm:w-auto"
        >
          WhatsApp us
        </a>
      </div>
    </div>
  )
}
