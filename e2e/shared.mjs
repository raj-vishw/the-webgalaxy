import { chromium } from 'playwright-core'

/**
 * Shared harness for the browser suites. Needs a running web dev server
 * (WEB_URL, default http://localhost:5173) with the API behind it, and a
 * Chromium binary (CHROMIUM_PATH; falls back to Playwright's bundled one).
 * GPU flags are opt-in via E2E_GPU=1 for machines where SwiftShader is too
 * slow for the camera flights.
 */
export const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173'
export const API_URL = process.env.API_URL ?? 'http://localhost:4000/api'

let failures = 0
export const check = (label, ok, extra = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`)
}
export const finish = async (browser, logs) => {
  console.log(logs.length ? logs.join('\n') : '(no console output)')
  await browser.close()
  if (failures) {
    console.error(`${failures} check(s) failed`)
    process.exit(1)
  }
}

export async function launch({ mobile = false, reduced = false } = {}) {
  const args = ['--no-sandbox']
  if (process.env.E2E_GPU) args.push('--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=vulkan', '--enable-features=Vulkan')
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args })
  const context = await browser.newContext({
    ...(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1440, height: 900 } }),
    ...(reduced ? { reducedMotion: 'reduce' } : {}),
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  // Returning visitor: no onboarding, short flight.
  await context.addInitScript(() => {
    if (!localStorage.getItem('webgalaxy.settings.v1')) localStorage.setItem('webgalaxy.settings.v1', JSON.stringify({ graphics: 'auto', visits: 3, onboardingDone: true }))
  })
  const page = await context.newPage()
  const logs = []
  page.on('console', (m) => {
    if (!/vite|DevTools|Clock|relationship\(s\) ignored|\[analytics\]/.test(m.text())) logs.push(`[${m.type()}] ${m.text().slice(0, 160)}`)
  })
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  const wait = (ms) => page.waitForTimeout(ms)
  const state = () =>
    page.evaluate(() => {
      const s = window.__webgalaxy.store.getState()
      return { mode: s.viewMode, u: s.activeUniverseId, w: s.selectedWebsiteId, t: s.isTransitioning, o: s.overlay, d: s.discovery.phase, phase: s.introPhase, rel: s.visibleRelationships.length, path: s.activeDiscoveryPath, hl: s.highlight?.kind ?? null, rec: s.recommendations.map((r) => r.website.id) }
    })
  const settle = async (max = 15000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < max) {
      if (!(await state()).t) break
      await wait(200)
    }
    await wait(300)
  }
  const enter = async (path = '/') => {
    await page.goto(`${WEB_URL}${path}`)
    await page.waitForFunction(() => window.__webgalaxy?.store.getState().introPhase === 'landing', null, { timeout: 60000 })
    await page.getByRole('button', { name: 'Enter the WebGalaxy' }).click()
    await page.waitForFunction(() => window.__webgalaxy?.store.getState().introPhase === 'complete', null, { timeout: 60000 })
    await wait(500)
  }
  return { browser, context, page, logs, wait, state, settle, enter }
}
