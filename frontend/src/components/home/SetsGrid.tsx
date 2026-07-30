import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setsApi, type ReadySet } from '../../api/products'
import { useReveal } from '../../lib/useReveal'
import ReadySetCard from '../ReadySetCard'

export default function SetsGrid() {
  const [sets,    setSets]    = useState<ReadySet[]>([])
  const [loading, setLoading] = useState(true)

  // Hooks must be called unconditionally — before any early returns
  const [headRef, headVisible] = useReveal<HTMLDivElement>()
  const [gridRef, gridVisible] = useReveal<HTMLDivElement>()

  useEffect(() => {
    setsApi.list()
      .then(setSets)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (sets.length === 0) return null

  return (
    <section className="px-6 pt-16 pb-5" id="sets">
      <div className="max-w-[1080px] mx-auto">

        <div
          ref={headRef}
          className={`text-center mb-9 reveal ${headVisible ? 'is-visible' : ''}`}
        >
          <p className="text-xs tracking-[0.3em] uppercase text-mocha">No mixing needed</p>
          <h2 className="font-logo text-ink mt-2" style={{ fontSize: 'clamp(30px, 5vw, 42px)' }}>
            Ready-made sets
          </h2>
          <p className="text-[14px] text-[#6b5d54] mt-2">
            Matching top + bottom, picked for you — one click to add.
          </p>
        </div>

        <div
          ref={gridRef}
          className={`stagger-grid grid grid-cols-2 md:grid-cols-4 gap-[18px] ${gridVisible ? 'is-visible' : ''}`}
        >
          {sets.map(set => (
            <ReadySetCard key={set.id} set={set} />
          ))}
        </div>

        <div className="text-center mt-9">
          <Link to="/shop?type=sets" className="btn-pill-ghost">
            Shop all sets
          </Link>
        </div>

      </div>
    </section>
  )
}
