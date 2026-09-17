import { useEffect, useState } from 'react'

/**
 * True once the visitor has not pressed, scrolled, tapped or typed for
 * `afterMs`. Pointer movement alone does not count — the parallax already
 * answers it, and a resting hand should not be mistaken for attention.
 */
export function useIdle(afterMs = 5000): boolean {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    let timer = 0
    const arm = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), afterMs)
    }
    const touched = () => {
      setIdle(false)
      arm()
    }
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'wheel', 'keydown', 'touchstart']
    for (const e of events) window.addEventListener(e, touched, { passive: true })
    arm()
    return () => {
      window.clearTimeout(timer)
      for (const e of events) window.removeEventListener(e, touched)
    }
  }, [afterMs])
  return idle
}
