import { useEffect } from 'react'
import { useGalaxyStore } from '../store/galaxyStore'

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/**
 * Global shortcuts:  /  or Ctrl/⌘+K search · F filters · E explore · D discover ·
 * M map · Esc steps back (closes overlays first, then website → universe → galaxy).
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // A focused control that already handled the key (e.g. Escape in the
      // search box) must not also step the navigation back.
      if (e.defaultPrevented) return
      const store = useGalaxyStore.getState()
      if (store.introPhase !== 'complete') return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        store.toggleOverlay('search')
        return
      }
      if (e.key === 'Escape') {
        store.goBack()
        return
      }
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      switch (e.key) {
        case '/':
          e.preventDefault()
          store.openOverlay('search')
          break
        case 'f':
        case 'F':
          store.toggleOverlay('filters')
          break
        case 'e':
        case 'E':
          store.toggleOverlay('navigator')
          break
        case 'd':
        case 'D':
          store.toggleOverlay('discover')
          break
        case 'm':
        case 'M':
          store.setMinimapVisible(!store.minimapVisible)
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
