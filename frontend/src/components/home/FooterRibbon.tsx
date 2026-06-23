const PHRASES = [
  'soft, comfy & yours',
  'made to feel like you',
  'for slow mornings & easy nights',
]

export default function FooterRibbon() {
  return (
    <>
      <div className="bg-gradient-to-r from-dusty-pink to-sky-blue py-[18px] overflow-hidden">
        <div className="flex justify-center items-center gap-3.5 flex-wrap px-6 text-[13px] tracking-[0.06em] font-semibold text-ink text-center">
          {PHRASES.map((phrase, i) => (
            <span key={phrase} className="flex items-center gap-3.5">
              {phrase}
              {i < PHRASES.length - 1 && (
                <span aria-hidden="true" className="opacity-50">
                  •
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
      <footer className="py-10 text-center text-[12.5px] text-[#8a7c72]">
        © SINAY sleepwear
      </footer>
    </>
  )
}
