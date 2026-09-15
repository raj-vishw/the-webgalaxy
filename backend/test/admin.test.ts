import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { ADMIN, EDITOR, auth, createTestApp, login, type TestApp } from './helpers.ts'

describe('admin API', () => {
  let t: TestApp
  let admin: string
  let editor: string
  before(async () => {
    t = await createTestApp()
    admin = await login(t.app, ADMIN)
    editor = await login(t.app, EDITOR)
  })
  after(() => t.close())

  it('authenticates with correct credentials only', async () => {
    const bad = await t.app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: { email: ADMIN.email, password: 'wrong-password' } })
    assert.equal(bad.statusCode, 401)
    assert.equal(bad.json().error.code, 'UNAUTHORIZED')
    const unknown = await t.app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: { email: 'ghost@test.local', password: 'whatever-123' } })
    assert.equal(unknown.statusCode, 401)
    const me = await t.app.inject({ method: 'GET', url: '/api/admin/auth/me', headers: auth(admin) })
    assert.equal(me.json().data.email, ADMIN.email)
    assert.equal(me.json().data.role, 'admin')
  })

  it('protects every admin route', async () => {
    for (const [method, url] of [
      ['GET', '/api/admin/overview'],
      ['GET', '/api/admin/submissions'],
      ['POST', '/api/admin/websites'],
      ['PATCH', '/api/admin/websites/github'],
      ['DELETE', '/api/admin/websites/github'],
      ['POST', '/api/admin/relationships'],
    ] as const) {
      const res = await t.app.inject({ method, url, payload: method === 'GET' ? undefined : {} })
      assert.equal(res.statusCode, 401, `${method} ${url}`)
      const forged = await t.app.inject({ method, url, headers: { authorization: 'Bearer not-a-token' }, payload: method === 'GET' ? undefined : {} })
      assert.equal(forged.statusCode, 401, `${method} ${url} forged`)
    }
  })

  it('enforces roles: editors cannot delete or create universes', async () => {
    const del = await t.app.inject({ method: 'DELETE', url: '/api/admin/websites/gitlab', headers: auth(editor) })
    assert.equal(del.statusCode, 403)
    assert.equal(del.json().error.code, 'FORBIDDEN')
    const universe = await t.app.inject({ method: 'POST', url: '/api/admin/universes', headers: auth(editor), payload: {} })
    assert.equal(universe.statusCode, 403)
    const edit = await t.app.inject({ method: 'PATCH', url: '/api/admin/websites/gitlab', headers: auth(editor), payload: { importance: 76 } })
    assert.equal(edit.statusCode, 200)
    assert.equal(edit.json().data.importance, 76)
  })

  it('shows an overview', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/admin/overview', headers: auth(admin) })
    const d = res.json().data
    assert.equal(d.websites.total, 4)
    assert.equal(d.universes, 2)
    assert.equal(d.relationships, 3)
  })

  it('creates, updates and deletes websites with validation', async () => {
    const invalid = await t.app.inject({ method: 'POST', url: '/api/admin/websites', headers: auth(admin), payload: { name: 'X', universeId: 'ai', objectType: 'rock' } })
    assert.equal(invalid.statusCode, 400)
    const created = await t.app.inject({
      method: 'POST',
      url: '/api/admin/websites',
      headers: auth(admin),
      payload: { name: 'Hugging Face', url: 'https://huggingface.co', universeId: 'ai', objectType: 'comet', importance: 80, tags: ['models', 'Open Source'], isEmerging: true },
    })
    assert.equal(created.statusCode, 201)
    const w = created.json().data
    assert.equal(w.slug, 'hugging-face')
    assert.deepEqual(w.tags, ['models', 'open-source'])
    assert.equal(w.universeSlug, 'ai')

    const dupUrl = await t.app.inject({ method: 'POST', url: '/api/admin/websites', headers: auth(admin), payload: { name: 'HF again', url: 'http://www.huggingface.co/', universeId: 'ai', objectType: 'planet' } })
    assert.equal(dupUrl.statusCode, 409)
    assert.equal(dupUrl.json().error.code, 'WEBSITE_URL_EXISTS')

    const updated = await t.app.inject({ method: 'PATCH', url: '/api/admin/websites/hugging-face', headers: auth(admin), payload: { universeId: 'development', isTrending: true, trendingScore: 0.8, tags: ['models'] } })
    assert.equal(updated.json().data.universeSlug, 'development')
    assert.equal(updated.json().data.isTrending, true)
    assert.deepEqual(updated.json().data.tags, ['models'])
    const trending = await t.app.inject({ method: 'GET', url: '/api/discovery/trending' })
    assert.ok(trending.json().data.some((x: { slug: string }) => x.slug === 'hugging-face'), 'cache invalidated on edit')

    const selfAnchor = await t.app.inject({ method: 'PATCH', url: '/api/admin/websites/hugging-face', headers: auth(admin), payload: { orbitAnchorId: 'hugging-face' } })
    assert.equal(selfAnchor.statusCode, 400)

    const deleted = await t.app.inject({ method: 'DELETE', url: '/api/admin/websites/hugging-face', headers: auth(admin) })
    assert.equal(deleted.statusCode, 200)
    const gone = await t.app.inject({ method: 'GET', url: '/api/admin/websites/hugging-face', headers: auth(admin) })
    assert.equal(gone.statusCode, 404)
  })

  it('manages universes without any nesting', async () => {
    const created = await t.app.inject({
      method: 'POST',
      url: '/api/admin/universes',
      headers: auth(admin),
      payload: {
        name: 'Science',
        description: 'Research',
        visualType: 'planetary',
        visualConfig: { position: [0, 0, 40], scale: 10, palette: { core: '#fff', primary: '#abc', secondary: '#def' }, seed: 7, layout: { spread: [1, 0.5, 1], coreBias: 0.3, energy: 1, dust: 1 } },
        parentUniverseId: 'ai',
      },
    })
    assert.equal(created.statusCode, 201)
    assert.equal(created.json().data.slug, 'science')
    assert.ok(!('parentUniverseId' in created.json().data), 'unknown hierarchy fields are dropped, never stored')
    const dup = await t.app.inject({ method: 'POST', url: '/api/admin/universes', headers: auth(admin), payload: { name: 'Science', visualType: 'spiral', visualConfig: created.json().data.visualConfig } })
    assert.equal(dup.statusCode, 409)
    const disabled = await t.app.inject({ method: 'PATCH', url: '/api/admin/universes/science', headers: auth(admin), payload: { isActive: false } })
    assert.equal(disabled.json().data.isActive, false)
    const publicList = await t.app.inject({ method: 'GET', url: '/api/universes' })
    assert.ok(!publicList.json().data.some((u: { slug: string }) => u.slug === 'science'))
  })

  it('manages relationships and refuses self links and duplicates', async () => {
    const self = await t.app.inject({ method: 'POST', url: '/api/admin/relationships', headers: auth(admin), payload: { sourceId: 'github', targetId: 'github', type: 'related' } })
    assert.equal(self.statusCode, 400)
    assert.equal(self.json().error.code, 'SELF_RELATIONSHIP')
    const dup = await t.app.inject({ method: 'POST', url: '/api/admin/relationships', headers: auth(admin), payload: { sourceId: 'gitlab', targetId: 'github', type: 'alternative' } })
    assert.equal(dup.statusCode, 409)
    assert.equal(dup.json().error.code, 'DUPLICATE_RELATIONSHIP')
    const missing = await t.app.inject({ method: 'POST', url: '/api/admin/relationships', headers: auth(admin), payload: { sourceId: 'github', targetId: 'nope', type: 'related' } })
    assert.equal(missing.statusCode, 404)
    const created = await t.app.inject({ method: 'POST', url: '/api/admin/relationships', headers: auth(admin), payload: { sourceId: 'claude', targetId: 'gitlab', type: 'related', note: 'test' } })
    assert.equal(created.statusCode, 201)
    const id = created.json().data.id
    const updated = await t.app.inject({ method: 'PATCH', url: `/api/admin/relationships/${id}`, headers: auth(admin), payload: { strength: 0.5 } })
    assert.equal(updated.json().data.strength, 0.5)
    const removed = await t.app.inject({ method: 'DELETE', url: `/api/admin/relationships/${id}`, headers: auth(admin) })
    assert.equal(removed.statusCode, 200)
    const again = await t.app.inject({ method: 'DELETE', url: `/api/admin/relationships/${id}`, headers: auth(admin) })
    assert.equal(again.statusCode, 404)
  })

  it('manages tags', async () => {
    const created = await t.app.inject({ method: 'POST', url: '/api/admin/tags', headers: auth(admin), payload: { name: 'Machine Learning' } })
    assert.equal(created.json().data.slug, 'machine-learning')
    const list = await t.app.inject({ method: 'GET', url: '/api/admin/tags', headers: auth(admin) })
    assert.ok(list.json().data.some((t: { slug: string }) => t.slug === 'machine-learning'))
    const removed = await t.app.inject({ method: 'DELETE', url: `/api/admin/tags/${created.json().data.id}`, headers: auth(admin) })
    assert.equal(removed.statusCode, 200)
  })

  it('records admin actions in the audit log', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/admin/audit', headers: auth(admin) })
    assert.equal(res.statusCode, 200)
    const actions = res.json().data.map((e: { action: string }) => e.action)
    assert.ok(actions.includes('website.create'))
    assert.ok(actions.includes('relationship.delete'))
    const denied = await t.app.inject({ method: 'GET', url: '/api/admin/audit', headers: auth(editor) })
    assert.equal(denied.statusCode, 403)
  })
})
