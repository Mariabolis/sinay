import { Link } from 'react-router-dom'
import sinayLogoWhite from '../assets/logo/Sinay-Logo-W.png'

const SHOP_LINKS = [
  { label: 'All Products',    href: '/shop'           },
  { label: 'Tops',            href: '/shop/tops'      },
  { label: 'Bottoms',         href: '/shop/bottoms'   },
  { label: 'Ready-made Sets', href: '/#sets'          },
  { label: 'Build Your Own',  href: '/build-your-set' },
]

const HELP_LINKS = [
  { label: 'Contact Us',          to: '/contact'          },
  { label: 'Shipping & Returns',  to: '/shipping-returns' },
  { label: 'Size Guide',          to: '/size-guide'       },
  { label: 'FAQ',                 to: '/faq'              },
]

const ACCOUNT_LINKS = [
  { label: 'Log In',      to: '/login'   },
  { label: 'Register',    to: '/register' },
  { label: 'My Orders',   to: '/account/orders' },
  { label: 'My Account',  to: '/account' },
  { label: 'My Wishlist', to: '/wishlist' },
  { label: 'My Bag',      to: '/cart'    },
]

export default function Footer() {
  return (
    <footer className="bg-[#4A3F38] text-cream/70 font-body">
      <div className="max-w-[1080px] mx-auto px-6 pt-14 pb-10">

        {/* ── Top row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 pb-10 border-b border-cream/10">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col items-start gap-4">
            <div className="h-20 overflow-hidden flex items-center">
              <img
                src={sinayLogoWhite}
                alt="SINAY"
                className="h-[240px] w-auto object-contain flex-none"
              />
            </div>
            <p className="text-[12.5px] leading-relaxed text-cream/50 max-w-[200px]">
              Effortless sets made for real life — soft, comfy & yours.
            </p>
          </div>

          {/* Shop links */}
          <div>
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-cream/35 font-semibold mb-4">
              Shop
            </p>
            <ul className="space-y-2.5">
              {SHOP_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-[13px] text-cream/60 hover:text-cream transition-colors duration-200"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Help links */}
          <div>
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-cream/35 font-semibold mb-4">
              Help
            </p>
            <ul className="space-y-2.5">
              {HELP_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-[13px] text-cream/60 hover:text-cream transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account links */}
          <div>
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-cream/35 font-semibold mb-4">
              Account
            </p>
            <ul className="space-y-2.5">
              {ACCOUNT_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-[13px] text-cream/60 hover:text-cream transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-cream/35 font-semibold mb-4">
              Stay in the loop
            </p>
            <p className="text-[13px] text-cream/50 mb-4 leading-relaxed">
              New drops, restocks, and slow-morning inspiration.
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

        {/* ── Bottom row ──────────────────────────────────────────────────── */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11.5px] text-cream/30">
            © {new Date().getFullYear()} SINAY. All rights reserved.
          </p>
          <p className="text-[11.5px] text-cream/30 italic tracking-wide">
            ✦ soft, comfy & yours ✦
          </p>
        </div>
      </div>
    </footer>
  )
}
