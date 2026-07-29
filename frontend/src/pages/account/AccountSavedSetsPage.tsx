import { useEffect, useState } from 'react'
import { useSavedSetsStore } from '../../store/savedSetsStore'
import { cartApi } from '../../api/cart'
import { useCartStore } from '../../store/cartStore'
import { TOP_PATHS, BOTTOM_PATHS } from '../../lib/garmentPaths'
import { SkeletonGrid } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import InlineError from '../../components/InlineError'

export default function AccountSavedSetsPage() {
  const { sets, loaded, error, fetchSavedSets, remove } = useSavedSetsStore()
  const setCart = useCartStore(s => s.setCart)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedId,   setAddedId]   = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) fetchSavedSets()
  }, [loaded, fetchSavedSets])

  async function handleAddToBag(id: string, topVariantId: string, bottomVariantId: string) {
    setAddingId(id)
    try {
      const cart = await cartApi.addSet(topVariantId, bottomVariantId)
      setCart(cart)
      setAddedId(id)
      setTimeout(() => setAddedId(null), 2000)
    } catch {
      // no-op — button just returns to its normal state
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-logo text-[24px] text-ink">Saved Sets</h1>
        <p className="text-[13px] text-mocha/55 mt-1">Combinations you bookmarked from Build Your Own.</p>
      </div>

      {!loaded ? (
        <SkeletonGrid count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
      ) : error && sets.length === 0 ? (
        <InlineError message="We couldn't load your saved sets." onRetry={fetchSavedSets} />
      ) : sets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE7E0]">
          <EmptyState
            message="No saved sets yet"
            subtext="Bookmark combinations from Build Your Own to find them here."
            ctaLabel="Build a set"
            ctaTo="/build-your-set"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sets.map(set => {
            const topPath = TOP_PATHS[set.top.product.style] ?? TOP_PATHS['classic_short_sleeve']
            const bottomPath = BOTTOM_PATHS[set.bottom.product.style] ?? BOTTOM_PATHS['wide_leg']
            const total = set.top.price + set.bottom.price
            return (
              <div key={set.id} className="bg-white rounded-2xl border border-[#EDE7E0] p-5">
                <div className="flex items-center justify-center gap-2 bg-[#F9F5F0] rounded-xl p-4 mb-4">
                  <svg viewBox="30 0 140 175" className="w-1/2 max-w-[100px]">
                    <path fill={set.top.color_hex} stroke="#8B7568" strokeWidth="2" d={topPath} />
                  </svg>
                  <svg viewBox="35 5 90 165" className="w-1/2 max-w-[90px]">
                    <path fill={set.bottom.color_hex} stroke="#8B7568" strokeWidth="2" d={bottomPath} />
                  </svg>
                </div>

                <p className="text-[13px] font-semibold text-ink truncate">{set.top.product.name}</p>
                <p className="text-[11.5px] text-mocha/55 mb-0.5">{set.top.color_name} · {set.top.size}</p>
                <p className="text-[13px] font-semibold text-ink truncate mt-2">{set.bottom.product.name}</p>
                <p className="text-[11.5px] text-mocha/55 mb-3">{set.bottom.color_name} · {set.bottom.size}</p>

                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13.5px] font-semibold text-ink">EGP {total.toLocaleString()}</p>
                  <button
                    onClick={() => remove(set.id)}
                    className="text-[11px] text-mocha/40 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>

                <button
                  onClick={() => handleAddToBag(set.id, set.top.id, set.bottom.id)}
                  disabled={addingId === set.id}
                  className="w-full btn-pill-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingId === set.id ? 'Adding…' : addedId === set.id ? 'Added!' : 'Add to Bag'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
