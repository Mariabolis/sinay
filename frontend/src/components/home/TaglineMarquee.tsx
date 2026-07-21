const PHRASES = [
  'soft, comfy & yours',
  '•',
  'made to feel like you',
  '•',
  'for slow mornings & easy nights',
  '•',
  'mix & match your way',
  '•',
]

// Duplicate for seamless 50% marquee loop
const TRACK = [...PHRASES, ...PHRASES]

// Scrolling tagline ribbon shown above the site footer on the homepage.
// The full footer itself lives in components/Footer.tsx and is rendered
// once, globally, by CustomerLayout — this component used to duplicate it.
export default function TaglineMarquee() {
  return (
    <div className="bg-sage overflow-hidden py-[18px]" aria-hidden="true">
      <div className="marquee-track">
        {TRACK.map((phrase, i) => (
          <span
            key={i}
            className={`mx-5 text-[13px] tracking-[0.08em] font-semibold text-ink/80 ${
              phrase === '•' ? 'opacity-50' : ''
            }`}
          >
            {phrase}
          </span>
        ))}
      </div>
    </div>
  )
}
