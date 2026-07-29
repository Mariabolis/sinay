import { create } from 'zustand'
import { savedSetsApi, type SavedSet } from '../api/account'

interface SavedSetsState {
  sets: SavedSet[]
  loaded: boolean
  error: boolean
  fetchSavedSets: () => Promise<void>
  isSaved: (topVariantId: string, bottomVariantId: string) => boolean
  save: (topVariantId: string, bottomVariantId: string) => Promise<void>
  remove: (id: string) => Promise<void>
  clear: () => void
}

export const useSavedSetsStore = create<SavedSetsState>((set, get) => ({
  sets: [],
  loaded: false,
  error: false,

  fetchSavedSets: async () => {
    set({ error: false })
    try {
      const sets = await savedSetsApi.list()
      set({ sets, loaded: true })
    } catch {
      set({ loaded: true, error: true })
    }
  },

  isSaved: (topVariantId, bottomVariantId) =>
    get().sets.some(s => s.top.id === topVariantId && s.bottom.id === bottomVariantId),

  save: async (topVariantId, bottomVariantId) => {
    const created = await savedSetsApi.create(topVariantId, bottomVariantId)
    set({ sets: [created, ...get().sets] })
  },

  remove: async (id) => {
    const prev = get().sets
    set({ sets: prev.filter(s => s.id !== id) })
    try {
      await savedSetsApi.remove(id)
    } catch {
      set({ sets: prev })
    }
  },

  clear: () => set({ sets: [], loaded: false, error: false }),
}))
