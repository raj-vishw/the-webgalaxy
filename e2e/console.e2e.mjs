import { API_URL, WEB_URL, check, finish, launch } from './shared.mjs'

/**
 * The content console: sign-in, moderation, editing, trending, relationships,
 * deletion. The web server under test must be built/started with the same
 * VITE_ADMIN_PATH this script receives; ADMIN_EMAIL / ADMIN_PASSWORD default
 * to backend/.env.example. Creates its own uniquely named submission.
 */
const consolePath = process.env.VITE_ADMIN_PATH
if (!consolePath) {
  console.error('VITE_ADMIN_PATH is required (the console is only served at that path)')
  process.exit(1)
}
const email = process.env.ADMIN_EMAIL ?? 'admin@webgalaxy.local'
const password = process.env.ADMIN_PASSWORD ?? 'change-me-now'
const name = `E2E Site ${Date.now().toString(36)}`
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const { browser, page, logs, wait } = await launch()
const api = async (path, init) => (await fetch(`${API_URL}${path}`, init)).json()

// A fresh pending submission from the public API.
const created = await api('/submissions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ websiteName: name, url: `https://${slug}.example`, description: 'A freshly submitted website used to verify the moderation workflow.', requestedUniverseId: 'design', tags: ['testing'] }) })
check('submission created', created.success, created.error?.message)

await page.goto(`${WEB_URL}${consolePath}`); await wait(800)
await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill('definitely-wrong-1'); await page.getByRole('button', { name: 'Sign in' }).click(); await wait(800)
check('wrong password rejected', (await page.locator('[role=alert]').textContent()).includes('Incorrect'))
await page.getByLabel('Password').fill(password); await page.getByRole('button', { name: 'Sign in' }).click(); await wait(1200)
check('signed in', await page.getByText(email).isVisible())
await page.click('a[href="#submissions"]'); await wait(1000)
const row = page.locator('tr', { hasText: name }).first()
check('pending submission listed', (await row.count()) > 0)
await row.getByRole('button', { name: 'Review' }).click(); await wait(400)
await row.getByLabel('Object type').selectOption('comet')
await row.getByRole('button', { name: 'Approve & publish' }).click(); await wait(1200)
check('approved', (await page.locator('tr', { hasText: name }).count()) === 0)
const pub = await api(`/websites/${slug}`)
check('published to public API', pub.success && pub.data.objectType === 'comet' && pub.data.universeSlug === 'design', pub.data?.slug ?? pub.error?.message)
await page.click('a[href="#websites"]'); await wait(1000)
await page.getByLabel('Search websites').fill(name); await wait(900)
await page.locator('tr', { hasText: name }).getByRole('button', { name: 'Edit' }).click(); await wait(400)
await page.getByLabel('Trending', { exact: true }).check(); await page.getByLabel('Trending score').fill('0.75')
await page.getByRole('button', { name: 'Save changes' }).click(); await wait(1000)
check('trending toggle reaches public API', (await api('/discovery/trending')).data.some((w) => w.slug === slug))
await page.click('a[href="#relationships"]'); await wait(1000)
await page.getByLabel('Website A (slug)').fill(slug); await page.getByLabel('Website B (slug)').fill('figma'); await page.getByRole('button', { name: 'Connect' }).click(); await wait(900)
check('relationship created', (await api(`/websites/${slug}/relationships`)).data.some((r) => r.target.slug === 'figma' || r.source.slug === 'figma'))
await page.getByLabel('Website A (slug)').fill('figma'); await page.getByLabel('Website B (slug)').fill(slug); await page.getByRole('button', { name: 'Connect' }).click(); await wait(900)
check('duplicate refused', (await page.locator('[role=alert]').textContent()).includes('already'))
await page.click('a[href="#websites"]'); await wait(800); await page.getByLabel('Search websites').fill(name); await wait(900)
await page.locator('tr', { hasText: name }).getByRole('button', { name: 'Edit' }).click(); await wait(300)
page.once('dialog', (d) => d.accept())
await page.getByRole('button', { name: 'Delete' }).click(); await wait(900)
check('deleted', (await fetch(`${API_URL}/websites/${slug}`)).status === 404)
await page.getByRole('button', { name: 'Sign out' }).click(); await wait(300)
check('signed out', await page.getByRole('button', { name: 'Sign in' }).isVisible())
await finish(browser, logs.filter((l) => !/40[149]|Conflict/.test(l)))
