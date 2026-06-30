import { useEffect, useRef } from 'react'

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const glowRef    = useRef<HTMLDivElement>(null)

  // Cursor-following ambient glow
  useEffect(() => {
    const section = sectionRef.current
    const glow    = glowRef.current
    if (!section || !glow) return

    let raf = 0
    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect()
        const cx   = rect.left + rect.width / 2
        const dx   = Math.max(-150, Math.min(150, (e.clientX - cx) * 0.28))
        glow.style.transform = `translate(calc(-50% + ${dx}px), -50%)`
      })
    }

    section.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => {
      section.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden text-center px-6 pt-16 pb-10"
    >
      {/* Ambient glow behind logo */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 w-[480px] h-[320px] pointer-events-none
                   transition-transform duration-[450ms] ease-[cubic-bezier(.4,0,.2,1)]"
        style={{
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(ellipse at center, rgba(235,207,210,0.55) 0%, rgba(201,216,232,0.35) 55%, transparent 75%)',
          filter: 'blur(56px)',
        }}
      />

      {/* Staggered hero content — each child gets .hero-el for CSS animation */}
      <p className="hero-el relative text-xs tracking-[0.34em] uppercase text-mocha mb-[18px]">
        Korean-inspired loungewear
      </p>

      <h1
        className="hero-el relative font-logo leading-none text-mocha tracking-[0.1em]"
        style={{ fontSize: 'clamp(48px, 9vw, 84px)' }}
      >
        SINAY
      </h1>

      <p
        className="hero-el relative font-logo italic text-ink mt-2.5"
        style={{ fontSize: 'clamp(18px, 2.6vw, 24px)' }}
      >
        made to feel like you
      </p>

      <p className="hero-el relative max-w-[440px] mx-auto mt-[18px] mb-7 text-[15px] text-[#6b5d54]">
        Comfort should feel personal. Choose your top, your bottom, your color — and make it yours.
      </p>

      <div className="hero-el relative flex gap-3.5 justify-center flex-wrap">
        <a href="#sets" className="btn-pill-solid">
          Shop Ready-made Sets
        </a>
        <a href="/build-your-set" className="btn-pill-ghost">
          Build Your Own
        </a>
      </div>
    </section>
  )
}
