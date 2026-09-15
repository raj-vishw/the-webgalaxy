import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { auth, createTestApp, login, type TestApp } from './helpers.ts'

const good = {
  websiteName: 'Example Tool',
  url: 'example-tool.dev',
  description: 'A brand new tool for testing the submission workflow end to end.',
  requestedUniverseId: 'development',
  tags: ['testing', 'tools'],
}

describe('submissions', () => {
  let t: TestApp
  before(async () => {
    t = await createTestApp()
  })
  after(() => t.close())

  it('validates the body and the URL', async () => {
    const short = await t.app.inject({ method: 'POST', url: '/api/submissions', payload: { ...good, description: 'too short' } })
    assert.equal(short.statusCode, 400)
    assert.equal(short.json().error.code, 'VALIDATION_ERROR')
    for (const url of ['javascript:alert(1)', 'ftp://files.example', 'localhost:3000', 'not a url']) {
      const res = await t.app.inject({ method: 'POST', url: '/api/submissions', payload: { ...good, url } })
      assert.equal(res.statusCode, 400, url)
      assert.equal(res.json().error.code, 'INVALID_URL', url)
    }
    const honeypot = await t.app.inject({ method: 'POST', url: '/api/submissions', payload: { ...good, website: 'spam' } })
    assert.equal(honeypot.statusCode, 400)
    const badUniverse = await t.app.inject({ method: 'POST', url: '/api/submissions', payload: { ...good, requestedUniverseId: 'nope' } })
    assert.equal(badUniverse.json().error.code, 'INVALID_UNIVERSE')
  })

  it('detects websites that already exist, ignoring scheme, www and trailing slash', async () => {
    const res = await t.app.inject({ method: 'POST', url: '/api/submissions', payload: { ...good, url: 'http://www.github.example/' } })
    assert.equal(res.statusCode, 409)
    assert.equal(res.json().error.code, 'WEBSITE_EXISTS')
    assert.equal(res.json().error.message, 'This website is already in the WebGalaxy.')
    const check = await t.app.inject({ method: 'GET', url: '/api/submissions/check?url=GITHUB.example' })
    assert.deepEqual(check.json().data, { valid: true, exists: true, pending: false, website: { slug: 'github', name: 'GitHub' } })
  })

  it('creates a pending submission, blocks duplicates, then publishes on approval', async () => {
    const created = await t.app.inject({ method: 'POST', url: '/api/submissions', payload: good })
    assert.equal(created.statusCode, 201)
    const submission = created.json().data
    assert.equal(submission.status, 'pending')
    assert.equal(submission.url, 'https://example-tool.dev/')

    const again = await t.app.inject({ method: 'POST', url: '/api/submissions', payload: good })
    assert.equal(again.statusCode, 409)
    assert.equal(again.json().error.code, 'SUBMISSION_PENDING')

    // Not visible before moderation.
    const before = await t.app.inject({ method: 'GET', url: '/api/search?q=example' })
    assert.equal(before.json().data.websites.length, 0)

    const token = await login(t.app)
    const list = await t.app.inject({ method: 'GET', url: '/api/admin/submissions?status=pending', headers: auth(token) })
    assert.equal(list.json().pagination.total, 1)

    const approved = await t.app.inject({
      method: 'POST',
      url: `/api/admin/submissions/${submission.id}/review`,
      headers: auth(token),
      payload: { action: 'approve', overrides: { objectType: 'comet', importance: 42 } },
    })
    assert.equal(approved.statusCode, 200)
    const website = approved.json().data.website
    assert.equal(website.slug, 'example-tool')
    assert.equal(website.objectType, 'comet')
    assert.deepEqual(website.tags, ['testing', 'tools'])

    const after = await t.app.inject({ method: 'GET', url: '/api/websites/example-tool' })
    assert.equal(after.statusCode, 200)
    assert.equal(after.json().data.universeSlug, 'development')

    const twice = await t.app.inject({ method: 'POST', url: `/api/admin/submissions/${submission.id}/review`, headers: auth(token), payload: { action: 'reject', rejectionReason: 'late' } })
    assert.equal(twice.statusCode, 409)
  })

  it('rejects with a reason', async () => {
    const created = await t.app.inject({ method: 'POST', url: '/api/submissions', payload: { ...good, url: 'https://another-tool.dev', websiteName: 'Another Tool' } })
    const token = await login(t.app)
    const rejected = await t.app.inject({
      method: 'POST',
      url: `/api/admin/submissions/${created.json().data.id}/review`,
      headers: auth(token),
      payload: { action: 'reject', rejectionReason: 'Not a fit for the galaxy.' },
    })
    assert.equal(rejected.json().data.submission.status, 'rejected')
    assert.equal(rejected.json().data.website, null)
    const missing = await t.app.inject({ method: 'GET', url: '/api/websites/another-tool' })
    assert.equal(missing.statusCode, 404)
  })
})
