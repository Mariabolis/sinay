import { useCallback, useRef, useState } from 'react'

/**
 * Returns a callback ref and a boolean that flips true once the element
 * enters the viewport. Using a callback ref (instead of useRef) means the
 * observer is set up correctly even when the element mounts after the initial
 * render (e.g. after async data loads).
 */
export function useReveal<T extends Element>(threshold = 0.12) {
  const [visible, setVisible] = useState(false)
  const obsRef = useRef<IntersectionObserver | null>(null)

  const ref = useCallback(
    (el: T | null) => {
      if (obsRef.current) {
        obsRef.current.disconnect()
        obsRef.current = null
      }
      if (!el) return

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true)
            obs.disconnect()
          }
        },
        { threshold },
      )
      obs.observe(el)
      obsRef.current = obs
    },
    [threshold],
  )

  return [ref, visible] as const
}
