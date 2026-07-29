export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton-pulse rounded-lg ${className}`} />
}

export function SkeletonGrid({ count = 6, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <SkeletonBlock className="aspect-[3/4] w-full mb-3" />
          <SkeletonBlock className="h-3 w-3/4 mb-2" />
          <SkeletonBlock className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 4, className = '', rowClassName = 'h-16' }: { count?: number; className?: string; rowClassName?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} className={`w-full ${rowClassName}`} />
      ))}
    </div>
  )
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}
