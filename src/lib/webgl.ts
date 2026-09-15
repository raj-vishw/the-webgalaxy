/** Whether this browser can render the galaxy at all. Checked once, before the Canvas mounts. */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    return !!gl
  } catch {
    return false
  }
}

/** `?view=list` opts into the accessible list view even where WebGL works. */
export function wantsListView(): boolean {
  return new URLSearchParams(window.location.search).get('view') === 'list'
}

/** `/admin` is the administration area, not part of the galaxy. */
export const isAdminPath = () => /^\/admin(\/|$)/.test(window.location.pathname)
