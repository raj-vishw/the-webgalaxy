import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hashPassword, verifyPassword } from '../src/utils/password.ts'
import { hashString, slugify } from '../src/utils/slug.ts'
import { parseWebsiteUrl } from '../src/utils/url.ts'

describe('url parsing', () => {
  it('normalises for duplicate detection', () => {
    const a = parseWebsiteUrl('https://www.GitHub.com/')
    const b = parseWebsiteUrl('github.com')
    assert.equal(a?.normalized, 'github.com')
    assert.equal(b?.normalized, 'github.com')
    assert.equal(b?.href, 'https://github.com/')
    assert.equal(parseWebsiteUrl('https://example.com/path/?q=1#frag')?.normalized, 'example.com/path?q=1')
  })
  it('rejects unsafe or non-public input', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://x.example', 'http://user:pw@example.com', 'localhost', 'http://127.0.0.1', 'nothost', '']) {
      assert.equal(parseWebsiteUrl(bad), null, bad)
    }
  })
})

describe('slugs and hashes', () => {
  it('slugifies names', () => {
    assert.equal(slugify('Hugging Face'), 'hugging-face')
    assert.equal(slugify('MITRE ATT&CK'), 'mitre-att-and-ck')
    assert.equal(slugify('  Ça va! '), 'ca-va')
  })
  it('hashes deterministically', () => {
    assert.equal(hashString('github'), hashString('github'))
    assert.notEqual(hashString('github'), hashString('gitlab'))
    assert.ok(hashString('anything') >= 0)
  })
})

describe('passwords', () => {
  it('hashes with scrypt and verifies', async () => {
    const hash = await hashPassword('correct horse battery staple')
    assert.ok(hash.startsWith('scrypt$'))
    assert.ok(!hash.includes('correct horse'))
    assert.equal(await verifyPassword('correct horse battery staple', hash), true)
    assert.equal(await verifyPassword('wrong', hash), false)
    assert.equal(await verifyPassword('x', 'garbage'), false)
  })
})
