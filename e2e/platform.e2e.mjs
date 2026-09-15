import { check, finish, launch, WEB_URL } from './shared.mjs'

/** Phase 7 platform checks: deep links, URL sync, sharing, command palette, help/settings, mobile bar, list view. */
const mobile = process.argv.includes('--mobile')
const { browser, page, logs, wait, state: S, settle, enter } = await launch({ mobile })
// deep link
await enter("/website/github"); await settle()
let s = await S(); check('deep link /website/github', s.w === 'github' && s.u === 'development', JSON.stringify(s))
check('url synced', (await page.evaluate(() => location.pathname)) === '/website/github')
await page.evaluate(() => window.__webgalaxy.store.getState().selectWebsite('vercel', 'development')); await settle()
check('url follows navigation', (await page.evaluate(() => location.pathname)) === '/website/vercel')
await page.goBack(); await settle(); s = await S(); check('browser back returns to github', s.w === 'github', s.w)
// share
await page.getByRole('button', { name: 'Share this website' }).click(); await wait(400)
check('share copies link', (await page.evaluate(() => navigator.clipboard.readText())) === `${WEB_URL}/website/github`, await page.evaluate(() => document.querySelector('section[aria-label$="details"] p[role=status]')?.textContent))
// command palette
await page.keyboard.press('Escape'); await wait(200)
if (mobile) await page.getByRole('button', { name: /^Search/ }).tap(); else await page.keyboard.press('/')
await wait(300); await page.keyboard.type('> trending'); await wait(400)
console.log('actions:', await page.evaluate(() => [...document.querySelectorAll('[role=option]')].map((o) => o.textContent.slice(0, 30))))
await page.keyboard.press('Enter'); await wait(3800); s = await S(); check('palette action starts trending discovery', s.w !== 'github' || s.t, JSON.stringify(s)); await settle()
// help menu + graphics setting
await page.keyboard.press('Escape'); await wait(200)
if (mobile) { await page.getByRole('button', { name: /^More/ }).tap(); await page.getByRole('button', { name: /^Help/ }).tap() } else await page.keyboard.press('?')
await wait(400); check('help open', (await S()).o === 'help')
await page.getByRole('radio', { name: 'Low' }).click(); await wait(800)
check('graphics setting persisted', JSON.parse(await page.evaluate(() => localStorage.getItem('webgalaxy.settings.v1'))).graphics === 'low')
await page.screenshot({ path: `p7_${mobile ? 'm' : 'd'}_help.png` })
await page.getByRole('radio', { name: 'Auto' }).click(); await page.keyboard.press('Escape'); await wait(300)
// mobile bar / desktop nav presence
check(mobile ? 'mobile bar visible' : 'desktop nav visible', await page.getByRole('navigation', { name: mobile ? 'Controls' : 'Discovery' }).isVisible())
if (mobile) { await page.screenshot({ path: 'p7_m_bar.png' }) }
// list view
await page.goto(`${WEB_URL}/?view=list`); await wait(1500)
check('list view renders', (await page.locator('h2').count()) >= 10, `${await page.locator('h2').count()} universes`)
await page.locator('input[type=search]').fill('git'); await wait(300)
check('list view search', (await page.locator('main li').count()) >= 2)
await page.screenshot({ path: `p7_${mobile ? 'm' : 'd'}_list.png` })
await finish(browser, logs)
