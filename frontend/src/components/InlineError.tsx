interface InlineErrorProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export default function InlineError({ message = "Something went wrong. Please try again.", onRetry, className = '' }: InlineErrorProps) {
  return (
    <div className={`text-center py-10 px-4 ${className}`}>
      <p className="text-[13.5px] text-[#B3564B] mb-3.5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center justify-center font-body font-semibold text-[12.5px]
                     tracking-[0.03em] rounded-full px-5 py-2 bg-transparent text-mocha
                     border-[1.5px] border-mocha/40 cursor-pointer transition-all duration-200
                     ease-[cubic-bezier(.4,0,.2,1)] hover:border-mocha hover:bg-mocha/5
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-mocha
                     focus-visible:outline-offset-[3px]"
        >
          Try again
        </button>
      )}
    </div>
  )
}
