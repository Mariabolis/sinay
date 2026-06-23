const PRODUCTS = [
  { color: '#EBCFD2', name: 'Sage Trim Top',         price: 'from EGP 450' },
  { color: '#B9C0AE', name: 'Wide-leg Bottom',        price: 'from EGP 420' },
  { color: '#C9D8E8', name: 'Cloud Tee Top',          price: 'from EGP 450' },
  { color: '#8B7568', name: 'Mocha Lounge Bottom',    price: 'from EGP 420' },
]

export default function ProductPreviewGrid() {
  return (
    <section className="bg-cream-deep px-6 pt-[60px] pb-20">
      <div className="max-w-[1080px] mx-auto">
        <div className="text-center mb-9">
          <p className="text-xs tracking-[0.3em] uppercase text-mocha">
            Sold separately
          </p>
          <h2
            className="font-logo text-ink mt-2"
            style={{ fontSize: 'clamp(28px, 5vw, 38px)' }}
          >
            Or shop individual pieces
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {PRODUCTS.map(({ color, name, price }) => (
            <div
              key={name}
              className="bg-white rounded-[18px] p-[18px] text-center transition duration-150 hover:-translate-y-1 cursor-pointer"
            >
              <div
                className="h-[120px] rounded-xl mb-3.5"
                style={{ background: color }}
              />
              <h4 className="font-body font-semibold text-[14px] text-ink mb-1">{name}</h4>
              <p className="text-[13px] text-mocha">{price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
