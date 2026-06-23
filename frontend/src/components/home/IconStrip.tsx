const ICONS = [
  {
    label: 'Lightweight & breathable',
    paths: ['M5 19c8 0 14-6 14-14-8 0-14 6-14 14z', 'M5 19c0-5 2-9 6-11'],
  },
  {
    label: 'Super soft',
    paths: ['M7 17a4 4 0 010-8 5 5 0 019.6-1.5A4.5 4.5 0 0117.5 17H7z'],
  },
  {
    label: 'Made for comfort',
    paths: [
      'M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
      'M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
    ],
  },
  {
    label: 'All day comfort',
    paths: [
      'M12 20s-7-4.4-9.5-9A5.5 5.5 0 0112 5.5 5.5 5.5 0 0121.5 11c-2.5 4.6-9.5 9-9.5 9z',
    ],
  },
  {
    label: 'Mix & match your way',
    paths: ['M6 4h5l1 2h6v3H6z', 'M6 9v11h12V9'],
  },
]

export default function IconStrip() {
  return (
    <section className="grid grid-cols-3 md:grid-cols-5 gap-[18px] px-6 py-9 bg-cream-deep">
      {ICONS.map(({ paths, label }) => (
        <div key={label} className="text-center">
          <svg
            viewBox="0 0 24 24"
            className="w-[34px] h-[34px] mx-auto mb-2.5 fill-none stroke-mocha"
            strokeWidth="1.4"
            aria-hidden="true"
          >
            {paths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </svg>
          <span className="text-[12.5px] text-ink">{label}</span>
        </div>
      ))}
    </section>
  )
}
