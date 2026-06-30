import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 font-body">
      <p className="font-logo text-[72px] text-mocha/20 leading-none mb-4" aria-hidden>404</p>
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
