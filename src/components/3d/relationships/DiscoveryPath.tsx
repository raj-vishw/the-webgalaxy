import { useMemo } from 'react'
import { useGalaxyStore } from '../../../store/galaxyStore'
import { ConnectionLine } from './ConnectionLine'

interface DiscoveryPathProps {
  pixelRatio: number
  reducedMotion: boolean
}

/**
 * The explorer's own trail: a faint thread through the websites visited in
 * order this exploration. It records a journey, not a structure — it fades
 * out entirely when a new exploration begins.
 */
export function DiscoveryPath({ pixelRatio, reducedMotion }: DiscoveryPathProps) {
  const path = useGalaxyStore((s) => s.activeDiscoveryPath)
  const segments = useMemo(() => {
    const out: { key: string; from: string; to: string }[] = []
    for (let i = 1; i < path.length; i++) {
      if (path[i - 1] !== path[i]) out.push({ key: `${path[i - 1]}>${path[i]}#${i}`, from: path[i - 1], to: path[i] })
    }
    return out
  }, [path])

  return (
    <>
      {segments.map((segment, index) => (
        <ConnectionLine
          key={segment.key}
          fromId={segment.from}
          toId={segment.to}
          style="trail"
          directed
          color="#dbe4ff"
          // Older steps fade so the most recent leg reads strongest.
          strength={0.16 + 0.14 * (index + 1) / segments.length}
          leaving={false}
          pixelRatio={pixelRatio}
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  )
}
