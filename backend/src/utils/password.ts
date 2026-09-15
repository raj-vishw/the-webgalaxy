import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

const scryptAsync = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))))
const N = 16384
const R = 8
const P = 1
const KEYLEN = 64

/** scrypt with a per-password salt; the parameters travel with the hash. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, KEYLEN, { N, r: R, p: P })
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, hashB64] = stored.split('$')
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const key = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })
  return key.length === expected.length && timingSafeEqual(key, expected)
}
