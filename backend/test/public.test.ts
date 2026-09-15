import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createTestApp, type TestApp } from './helpers.ts'

describe('public API', () => {
  let t: TestApp
  before(async () => {
    t = await createTestApp()
  })
  after(() => t.close())

  it('GET /health reports ok', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/health' })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.json(), { status: 'ok' })
    const ready = await t.app.inject({ method: 'GET', url: '/health/ready' })
    assert.equal(ready.json().database, 'ok')
  })

  it('lists universes as a flat list of peers with website counts', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/universes' })
    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.equal(body.success, true)
    assert.deepEqual(body.data.map((u: { slug: string }) => u.slug), ['ai', 'development'])
    assert.equal(body.data[0].websiteCount, 2)
    for (const u of body.data) {
      assert.ok(!('parentUniverseId' in u) && !('children' in u), 'no hierarchy fields')
    }
  })

  it('fetches a universe by slug or id and 404s otherwise', async () => {
    const bySlug = await t.app.inject({ method: 'GET', url: '/api/universes/ai' })
    assert.equal(bySlug.json().data.name, 'AI')
    const byId = await t.app.inject({ method: 'GET', url: `/api/universes/${t.ids.ai}` })
    assert.equal(byId.json().data.slug, 'ai')
    const missing = await t.app.inject({ method: 'GET', url: '/api/universes/nope' })
    assert.equal(missing.statusCode, 404)
    assert.equal(missing.json().error.code, 'UNIVERSE_NOT_FOUND')
  })

  it('lists websites with pagination, filters and light fields', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/websites?limit=2&page=1' })
    const body = res.json()
    assert.equal(body.data.length, 2)
    assert.deepEqual(body.pagination, { page: 1, limit: 2, total: 4, totalPages: 2 })
    assert.ok(!('description' in body.data[0]), 'light responses omit the description')
    assert.ok('positionSeed' in body.data[0])

    const ai = await t.app.inject({ method: 'GET', url: '/api/websites?universe=ai' })
    assert.deepEqual(ai.json().data.map((w: { slug: string }) => w.slug).sort(), ['chatgpt', 'claude'])
    const trending = await t.app.inject({ method: 'GET', url: '/api/websites?trending=true' })
    assert.deepEqual(trending.json().data.map((w: { slug: string }) => w.slug), ['chatgpt'])
    const tagged = await t.app.inject({ method: 'GET', url: '/api/websites?tag=git&type=planet' })
    assert.deepEqual(tagged.json().data.map((w: { slug: string }) => w.slug), ['gitlab'])
    const full = await t.app.inject({ method: 'GET', url: '/api/websites?fields=full&limit=1' })
    assert.ok('description' in full.json().data[0])
  })

  it('rejects invalid query parameters with a useful error', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/websites?limit=9999&type=asteroid' })
    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.success, false)
    assert.equal(body.error.code, 'VALIDATION_ERROR')
    assert.ok(body.error.details.some((d: { path: string }) => d.path === 'limit'))
    assert.ok(body.error.details.some((d: { path: string }) => d.path === 'type'))
  })

  it('returns a full website with its relationships', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/websites/github' })
    const w = res.json().data
    assert.equal(w.description, 'GitHub description for testing.')
    assert.deepEqual(w.tags, ['git', 'open-source'])
    assert.equal(w.relationships.length, 2)
    const types = w.relationships.map((r: { type: string }) => r.type).sort()
    assert.deepEqual(types, ['alternative', 'integration'])
    const missing = await t.app.inject({ method: 'GET', url: '/api/websites/does-not-exist' })
    assert.equal(missing.statusCode, 404)
    assert.equal(missing.json().error.code, 'WEBSITE_NOT_FOUND')
  })

  it('serves relationship, alternatives and integrations views', async () => {
    const rel = await t.app.inject({ method: 'GET', url: '/api/websites/github/relationships' })
    assert.equal(rel.json().data.length, 2)
    const alt = await t.app.inject({ method: 'GET', url: '/api/websites/github/alternatives' })
    assert.deepEqual(alt.json().data.map((r: { target: { slug: string } }) => r.target.slug), ['gitlab'])
    const integ = await t.app.inject({ method: 'GET', url: '/api/websites/chatgpt/integrations' })
    assert.equal(integ.json().data[0].source.slug, 'github')
    const all = await t.app.inject({ method: 'GET', url: '/api/relationships' })
    assert.equal(all.json().pagination.total, 3)
  })

  it('searches with ranked results across names, tags and universes', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/search?q=git' })
    const data = res.json().data
    assert.deepEqual(data.websites.map((h: { website: { slug: string } }) => h.website.slug), ['github', 'gitlab'])
    assert.equal(data.websites[0].matched, 'name')
    const tag = await t.app.inject({ method: 'GET', url: '/api/search?q=llm' })
    assert.equal(tag.json().data.websites.length, 2)
    assert.equal(tag.json().data.websites[0].matched, 'tag')
    const universe = await t.app.inject({ method: 'GET', url: '/api/search?q=development' })
    assert.equal(universe.json().data.universes[0].slug, 'development')
    const empty = await t.app.inject({ method: 'GET', url: '/api/search?q=' })
    assert.equal(empty.statusCode, 400)
  })

  it('discovers random, trending and emerging websites', async () => {
    const random = await t.app.inject({ method: 'GET', url: '/api/discovery/random?exclude=github' })
    assert.equal(random.statusCode, 200)
    assert.notEqual(random.json().data.slug, 'github')
    const trending = await t.app.inject({ method: 'GET', url: '/api/discovery/trending' })
    assert.deepEqual(trending.json().data.map((w: { slug: string }) => w.slug), ['chatgpt'])
    const emerging = await t.app.inject({ method: 'GET', url: '/api/discovery/emerging' })
    assert.deepEqual(emerging.json().data.map((w: { slug: string }) => w.slug), ['claude'])
  })

  it('never exposes inactive websites publicly', async () => {
    const token = (await t.app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: { email: 'admin@test.local', password: 'test-password-123' } })).json().data.token
    await t.app.inject({ method: 'PATCH', url: '/api/admin/websites/gitlab', headers: { authorization: `Bearer ${token}` }, payload: { isActive: false } })
    const res = await t.app.inject({ method: 'GET', url: '/api/websites/gitlab' })
    assert.equal(res.statusCode, 404)
    const list = await t.app.inject({ method: 'GET', url: '/api/websites' })
    assert.equal(list.json().pagination.total, 3)
    await t.app.inject({ method: 'PATCH', url: '/api/admin/websites/gitlab', headers: { authorization: `Bearer ${token}` }, payload: { isActive: true } })
  })

  it('uses the same envelope for unknown routes', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/unknown' })
    assert.equal(res.statusCode, 404)
    assert.equal(res.json().error.code, 'NOT_FOUND')
  })
})
