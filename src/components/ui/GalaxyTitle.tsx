import { useGalaxyStore } from '../../store/galaxyStore'

/** Centred cinematic title shown during the intro, then released to the scene. */
export function GalaxyTitle() {
  const titleVisible = useGalaxyStore((s) => s.intro.titleVisible)
  const subtitleVisible = useGalaxyStore((s) => s.intro.subtitleVisible)

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      <h1
        className={[
          'font-sans font-light text-white',
          'text-[clamp(1.9rem,5.2vw,4.6rem)] leading-none',
          'transition-[opacity,transform,letter-spacing] duration-[2200ms] ease-out',
          titleVisible
            ? 'opacity-100 translate-y-0 tracking-[0.34em]'
            : 'opacity-0 translate-y-2 tracking-[0.42em]',
        ].join(' ')}
        style={{ textShadow: '0 0 28px rgba(200,214,255,0.35), 0 0 70px rgba(150,170,255,0.18)' }}
      >
        THE WEBGALAXY
      </h1>
      <p
        className={[
          'mt-5 font-sans font-light text-space-300',
          'text-[clamp(0.8rem,1.35vw,1.05rem)] tracking-[0.12em]',
          'transition-[opacity,transform] duration-[1800ms] ease-out',
          subtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        ].join(' ')}
      >
        Explore the internet as a living universe.
      </p>
    </div>
  )
}
