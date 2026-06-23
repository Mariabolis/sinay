export default function Hero() {
  return (
    <section className="text-center px-6 pt-16 pb-10">
      <p className="text-xs tracking-[0.34em] uppercase text-mocha mb-[18px]">
        Egyptian-made sleepwear
      </p>

      <h1
        className="font-logo leading-none text-mocha tracking-[0.1em]"
        style={{ fontSize: 'clamp(48px, 9vw, 84px)' }}
      >
        SINAY
      </h1>

      <p
        className="font-logo italic text-ink mt-2.5"
        style={{ fontSize: 'clamp(18px, 2.6vw, 24px)' }}
      >
        made to feel like you
      </p>

      <p className="max-w-[440px] mx-auto mt-[18px] mb-7 text-[15px] text-[#6b5d54]">
        Shop a matching set picked for you, or pick a top and bottom yourself — soft,
        comfy, and made for slow mornings either way.
      </p>

      <div className="flex gap-3.5 justify-center flex-wrap">
        <a href="#sets" className="btn-pill-solid">
          Shop Ready-made Sets
        </a>
        <a href="#builder" className="btn-pill-ghost">
          Build Your Own
        </a>
      </div>
    </section>
  )
}
