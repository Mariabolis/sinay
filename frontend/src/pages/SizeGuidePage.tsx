import { useEffect, useState } from 'react'
import { productsApi, type SizeGuideTopRow, type SizeGuideBottomRow } from '../api/products'

export default function SizeGuidePage() {
  const [tops,    setTops]    = useState<SizeGuideTopRow[]>([])
  const [bottoms, setBottoms] = useState<SizeGuideBottomRow[]>([])

  useEffect(() => {
    productsApi.sizeGuide()
      .then(res => { setTops(res.tops); setBottoms(res.bottoms) })
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-[680px] mx-auto px-5 py-14 font-body">
      <div className="text-center mb-10">
        <p className="text-xs tracking-[0.3em] uppercase text-mocha mb-2">Good to know</p>
        <h1 className="font-logo text-[32px] text-ink mb-3">Size Guide</h1>
        <p className="text-[13px] text-mocha/60">All measurements in centimeters. Measure your body, not your garment.</p>
      </div>

      <div className="space-y-10">
        <div>
          <h2 className="font-logo text-xl text-ink mb-4">Tops</h2>
          <table className="w-full text-[13px] font-body border-collapse">
            <thead>
              <tr className="border-b border-mocha/15">
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Size</th>
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Chest</th>
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Length</th>
                <th className="text-left py-2      text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Shoulder</th>
              </tr>
            </thead>
            <tbody>
              {tops.map(row => (
                <tr key={row.size} className="border-b border-mocha/8 hover:bg-mocha/5 transition-colors">
                  <td className="py-3 pr-4 font-semibold text-ink">{row.size}</td>
                  <td className="py-3 pr-4 text-ink/70">{row.chest} cm</td>
                  <td className="py-3 pr-4 text-ink/70">{row.length} cm</td>
                  <td className="py-3      text-ink/70">{row.shoulder} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="font-logo text-xl text-ink mb-4">Bottoms</h2>
          <table className="w-full text-[13px] font-body border-collapse">
            <thead>
              <tr className="border-b border-mocha/15">
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Size</th>
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Waist</th>
                <th className="text-left py-2 pr-4 text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Hip</th>
                <th className="text-left py-2      text-mocha/50 font-semibold text-[11px] tracking-[0.08em] uppercase">Inseam</th>
              </tr>
            </thead>
            <tbody>
              {bottoms.map(row => (
                <tr key={row.size} className="border-b border-mocha/8 hover:bg-mocha/5 transition-colors">
                  <td className="py-3 pr-4 font-semibold text-ink">{row.size}</td>
                  <td className="py-3 pr-4 text-ink/70">{row.waist} cm</td>
                  <td className="py-3 pr-4 text-ink/70">{row.hip} cm</td>
                  <td className="py-3      text-ink/70">{row.inseam} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[12px] text-mocha/50 leading-relaxed text-center">
          Between sizes? We recommend sizing up for a relaxed, lounge-friendly fit.
        </p>
      </div>
    </div>
  )
}
