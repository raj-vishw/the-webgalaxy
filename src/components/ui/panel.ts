/** Shared class fragments so every floating surface reads as one instrument. */
export const glassPanel =
  'rounded-2xl border border-white/10 bg-[#070a18]/70 backdrop-blur-md shadow-[0_24px_70px_rgba(0,0,0,0.5)]'

export const focusRing = 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/70'

export const eyebrow = 'font-sans text-[10.5px] tracking-[0.22em] uppercase text-space-300/70'

export const ghostButton = `inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 font-sans text-[11px] tracking-[0.18em] uppercase text-white/85 transition-colors duration-300 hover:border-white/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`
