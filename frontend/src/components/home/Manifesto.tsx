import { useReveal } from '../../lib/useReveal'

export default function Manifesto() {
  const [ref, visible] = useReveal<HTMLElement>()

  return (
    <section
      ref={ref}
      className={`text-center px-6 pt-2 pb-14 max-w-[640px] mx-auto reveal ${visible ? 'is-visible' : ''}`}
    >
      <p
        className="font-logo text-ink leading-[1.45] mb-[30px]"
        style={{ fontSize: 'clamp(19px, 2.6vw, 24px)' }}
      >
        Instead of a fixed pajama set, every SINAY piece is designed to be mixed
        and matched your way.
      </p>

      <div className="flex items-center justify-center gap-6 mb-[26px] flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <span className="block text-[11px] tracking-[0.18em] uppercase text-mocha mb-1.5">
            Choose your top
          </span>
          <p className="text-[14px] text-[#6b5d54]">
            Classic short-sleeve · Sleeveless · Relaxed shirt
          </p>
        </div>

        <span className="font-logo text-[22px] text-dusty-pink" aria-hidden="true">
          +
        </span>

        <div className="flex-1 min-w-[180px]">
          <span className="block text-[11px] tracking-[0.18em] uppercase text-mocha mb-1.5">
            Pair it with
          </span>
          <p className="text-[14px] text-[#6b5d54]">
            Shorts · Bermuda shorts · Wide-leg pants
          </p>
        </div>
      </div>

      <p className="font-logo italic text-[18px] text-mocha">
        Mix. Match. Make it yours.
      </p>
    </section>
  )
}
