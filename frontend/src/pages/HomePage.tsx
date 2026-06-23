import { Link } from 'react-router-dom'

const microCopy = [
  'soft, comfy & yours',
  'for slow mornings & easy nights',
  'mix & match your way',
  'lightweight & breathable',
]

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section className="min-h-[82vh] flex flex-col items-center justify-center text-center px-6 gap-5">
        <span className="text-dusty-pink text-3xl select-none" aria-hidden>≈</span>

        <h1 className="font-logo text-7xl md:text-9xl tracking-brand text-mocha uppercase leading-none">
          sinay
        </h1>

        <p className="text-mocha/60 text-sm md:text-base tracking-wide2 uppercase mt-1">
          made to feel like you
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link
            to="/build-your-set"
            className="bg-dusty-pink text-mocha px-8 py-3 text-xs tracking-wide2 uppercase hover:bg-dusty-pink/75 transition-colors"
          >
            Build Your Set
          </Link>
          <Link
            to="/shop"
            className="border border-mocha/25 text-mocha px-8 py-3 text-xs tracking-wide2 uppercase hover:border-mocha/60 transition-colors"
          >
            Shop All
          </Link>
        </div>
      </section>

      {/* ── Micro-copy ticker ── */}
      <div className="bg-sage/30 py-3 overflow-hidden">
        <p className="text-center text-mocha/55 text-xs tracking-wide2 uppercase">
          {microCopy.join(' ≈ ')}
        </p>
      </div>

      {/* ── New In placeholder ── */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-20">
        <h2 className="font-logo text-3xl md:text-4xl tracking-brand text-mocha uppercase text-center mb-10">
          New In
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-dusty-pink/20 aspect-[3/4] flex items-end p-4"
            >
              <span className="text-mocha/40 text-xs tracking-wide2 uppercase">Coming soon</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Wave footer band ── */}
      <div className="bg-cream border-t border-dusty-pink/30 py-8 text-center">
        <span className="text-dusty-pink/50 text-5xl select-none" aria-hidden>≈</span>
      </div>
    </main>
  )
}
