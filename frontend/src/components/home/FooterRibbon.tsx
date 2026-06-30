import { Link } from 'react-router-dom'
import sinayLogoWhite from '../../assets/logo/Sinay-Logo-W.png'

const PHRASES = [
  'soft, comfy & yours',
  '•',
  'made to feel like you',
  '•',
  'for slow mornings & easy nights',
  '•',
  'mix & match your way',
  '•',
]

// Duplicate for seamless 50% marquee loop
const TRACK = [...PHRASES, ...PHRASES]

export default function FooterRibbon() {
  return (
    <>
      {/* ── Tagline marquee ribbon ────────────────────────────────────────── */}
      <div className="bg-sage overflow-hidden py-[18px]" aria-hidden="true">
        <div className="marquee-track">
          {TRACK.map((phrase, i) => (
            <span
              key={i}
              className={`mx-5 text-[13px] tracking-[0.08em] font-semibold text-ink/80 ${
                phrase === '•' ? 'opacity-50' : ''
              }`}
            >
              {phrase}
            </span>
          ))}
        </div>
      </div>

      {/* ── Full footer ──────────────────────────────────────────────────── */}
      <footer className="bg-ink text-cream/70 font-body">
        <div className="max-w-[1080px] mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="sm:col-span-2 md:col-span-1">
            <img src={sinayLogoWhite} alt="SINAY" className="h-[64px] w-auto object-contain mb-4" />
            <p className="text-[13px] leading-relaxed text-cream/55 mb-5">
              Korean-inspired loungewear made in Egypt — for slow mornings and easy nights.
            </p>
            <svg viewBox="0 0 160 18" className="w-32 h-4 opacity-30" aria-hidden="true">
              <path
                d="M0,9 Q10,3 20,9 T40,9 T60,9 T80,9 T100,9 T120,9 T140,9 T160,9"
                fill="none" stroke="#F4EEE8" strokeWidth="1.4"
              />
            </svg>
          </div>

          {/* Shop column */}
          <div>
            <h3 className="text-[11px] tracking-[0.2em] uppercase text-cream/40 mb-4 font-semibold">
              Shop
            </h3>
            <ul className="space-y-3">
              {[
                { label: 'Shop All',        to: '/shop'          },
                { label: 'Ready-made Sets', to: '/#sets'         },
                { label: 'Build Your Own',  to: '/build-your-set' },
                { label: 'Tops',            to: '/shop/tops'     },
                { label: 'Bottoms',         to: '/shop/bottoms'  },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-[13px] text-cream/60 hover:text-cream transition-colors duration-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help column */}
          <div>
            <h3 className="text-[11px] tracking-[0.2em] uppercase text-cream/40 mb-4 font-semibold">
              Help
            </h3>
            <ul className="space-y-3">
              {['Contact Us', 'Shipping & Returns', 'Size Guide', 'FAQ'].map(label => (
                <li key={label}>
                  <span className="text-[13px] text-cream/55">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter column */}
          <div>
            <h3 className="text-[11px] tracking-[0.2em] uppercase text-cream/40 mb-4 font-semibold">
              Stay in the loop
            </h3>
            <p className="text-[13px] text-cream/55 mb-4 leading-relaxed">
              New drops, restocks, and slow-morning inspiration — straight to your inbox.
            </p>
            <form onSubmit={e => e.preventDefault()} className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                aria-label="Email for newsletter"
                className="flex-1 min-w-0 bg-white/10 border border-cream/20 rounded-full px-4 py-2.5
                           text-[13px] text-cream placeholder:text-cream/30
                           focus:outline-none focus:border-cream/50 transition-colors"
              />
              <button
                type="submit"
                className="shrink-0 font-body font-semibold text-[12px] rounded-full px-5 py-2.5
                           bg-[#EBCFD2] text-ink hover:bg-[#e0bfc2] transition-colors duration-300
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-cream"
              >
                Join
              </button>
            </form>
          </div>

        </div>

        {/* ── Bottom bar ───────────────────────────────────────────────────── */}
        <div className="border-t border-cream/10">
          <div className="max-w-[1080px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-cream/35 text-center sm:text-left">
              © {new Date().getFullYear()} SINAY sleepwear. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              {/* Instagram */}
              <a href="#" aria-label="Instagram" className="text-cream/40 hover:text-cream transition-colors duration-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              {/* TikTok */}
              <a href="#" aria-label="TikTok" className="text-cream/40 hover:text-cream transition-colors duration-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
                </svg>
              </a>
              {/* WhatsApp */}
              <a href="#" aria-label="WhatsApp" className="text-cream/40 hover:text-cream transition-colors duration-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
