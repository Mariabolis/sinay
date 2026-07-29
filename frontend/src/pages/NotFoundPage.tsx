import { Link } from 'react-router-dom'
import sinayLogoBeige from '../assets/logo/Sinay-Logo-B.png'

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 font-body">
      <div className="h-20 overflow-hidden flex items-center justify-center mb-6 opacity-60">
        <img src={sinayLogoBeige} alt="SINAY" className="h-[240px] w-auto object-contain flex-none" />
      </div>
      <p className="font-logo text-[72px] text-mocha/20 leading-none mb-2" aria-hidden>404</p>
      <span className="font-logo text-2xl text-dusty-pink block mb-3" aria-hidden="true">≈</span>
      <h1 className="font-logo text-[26px] text-ink mb-3">Page not found</h1>
      <p className="text-mocha/55 text-[14px] max-w-xs mb-8">
        The page you're looking for doesn't exist — it may have moved or the link is broken.
      </p>
      <div className="flex gap-3">
        <Link to="/" className="btn-pill-sm">Go home</Link>
        <Link to="/shop" className="btn-pill-ghost">Shop all</Link>
      </div>
    </div>
  )
}
