import { gsap } from 'gsap'

type IntroTimeline = ReturnType<typeof gsap.timeline>

/**
 * Handle to the running intro timeline so UI outside the canvas can skip it.
 * The timeline itself is owned by `CameraController`.
 */
let timeline: IntroTimeline | null = null

export function registerIntroTimeline(tl: IntroTimeline | null) {
  timeline = tl
}

/** Smoothly scrubs the flight to its end instead of hard-cutting. */
export function skipIntro() {
  if (!timeline || timeline.progress() >= 1) return
  timeline.tweenTo(timeline.duration(), { duration: 0.9, ease: 'power2.inOut' })
}
