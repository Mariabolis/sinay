import { Link } from 'react-router-dom'

interface EmptyStateProps {
  message: string
  subtext?: string
  ctaLabel?: string
  ctaTo?: string
  onCtaClick?: () => void
  className?: string
  /** Larger font-logo heading treatment for full-page empty states (e.g. empty cart) */
  heading?: boolean
}

export default function EmptyState({ message, subtext, ctaLabel, ctaTo, onCtaClick, className = '', heading = false }: EmptyStateProps) {
  return (
    <div className={`text-center py-16 px-4 ${className}`}>
      <span className="font-logo text-4xl text-dusty-pink block mb-3" aria-hidden="true">≈</span>
      {heading ? (
        <p className="font-logo text-ink" style={{ fontSize: 'clamp(26px,5vw,36px)' }}>{message}</p>
      ) : (
        <p className="text-[14px] text-mocha/70 font-medium">{message}</p>
      )}
      {subtext && <p className="text-[12.5px] text-mocha/45 mt-2 max-w-[320px] mx-auto">{subtext}</p>}
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className={heading ? 'btn-pill-solid inline-flex mt-6' : 'btn-pill-sm inline-flex mt-5'}
        >
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaTo && (
        <button onClick={onCtaClick} className={heading ? 'btn-pill-solid mt-6' : 'btn-pill-sm mt-5'}>
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
