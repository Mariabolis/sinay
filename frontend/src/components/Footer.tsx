import { Link } from 'react-router-dom'
import sinayLogoWhite from '../assets/logo/Sinay-Logo-W.png'

export default function Footer() {
  return (
    <footer className="bg-[#4A3F38] text-cream/70 font-body">
      <div className="max-w-[1080px] mx-auto px-6 pt-14 pb-10">

        {/* ── Top row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 pb-10 border-b border-cream/10">

          {/* Brand */}
          <div className="flex flex-col items-start gap-4">
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
              {[
                { label: 'All Products',    href: '/shop'           },
                { label: 'Tops',            href: '/shop/tops'      },
                { label: 'Bottoms',         href: '/shop/bottoms'   },
                { label: 'Ready-made Sets', href: '/#sets'          },
                { label: 'Build Your Own',  href: '/build-your-set' },
              ].map(({ label, href }) => (
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

          {/* Account links */}
          <div>
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-cream/35 font-semibold mb-4">
              Account
            </p>
            <ul className="space-y-2.5">
              {[
                { label: 'Log In',      href: '/login'   },
                { label: 'Register',    href: '/register' },
                { label: 'My Orders',   href: '/orders'  },
                { label: 'My Account',  href: '/account' },
                { label: 'My Bag',      href: '/cart'    },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className="text-[13px] text-cream/60 hover:text-cream transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
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
