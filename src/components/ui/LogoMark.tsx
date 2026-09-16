import { useEffect, useState } from 'react'
import { loadLogoAtlas } from '../../lib/logoAtlas'

interface LogoMarkProps {
  websiteId: string
  universeId: string
  /** Rendered size in CSS pixels. */
  size: number
  /** Shown until the icon is known — and instead of it when there is none. */
  fallback: React.ReactNode
}

/** A website's icon cropped out of its universe's atlas, with the monogram as fallback. */
export function LogoMark({ websiteId, universeId, size, fallback }: LogoMarkProps) {
  const [style, setStyle] = useState<React.CSSProperties | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadLogoAtlas(universeId).then((atlas) => {
      if (cancelled) return
      const rect = atlas?.rectOf(websiteId) ?? null
      if (!atlas || !rect) return setStyle(null)
      const scale = size / rect.size
      setStyle({
        width: size,
        height: size,
        backgroundImage: `url(${atlas.image.src})`,
        backgroundSize: `${atlas.image.width * scale}px ${atlas.image.height * scale}px`,
        backgroundPosition: `-${rect.x * scale}px -${rect.y * scale}px`,
        backgroundRepeat: 'no-repeat',
      })
    })
    return () => {
      cancelled = true
    }
  }, [websiteId, universeId, size])
  if (!style) return <>{fallback}</>
  return <span aria-hidden style={style} className="block" />
}
