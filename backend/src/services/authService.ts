import type { Actor, AppContext } from '../context.js'
import { adminRepo } from '../repositories/adminRepo.js'
import { unauthorized } from '../utils/errors.js'
import { hashPassword, verifyPassword } from '../utils/password.js'

/** Password check with a constant-cost path when the account doesn't exist. */
const DUMMY_HASH_PROMISE = hashPassword('dummy-password-for-timing')

export const authService = {
  async authenticate(ctx: AppContext, email: string, password: string): Promise<Actor> {
    const user = await adminRepo.findByEmail(ctx.db, email)
    const valid = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, await DUMMY_HASH_PROMISE)
    if (!user || !valid || !user.isActive) {
      ctx.log.warn({ email: email.toLowerCase() }, 'admin login failed')
      throw unauthorized('Incorrect email or password.')
    }
    await adminRepo.touchLogin(ctx.db, user.id)
    ctx.log.info({ actor: user.email }, 'admin login')
    return { id: user.id, email: user.email }
  },

  /**
   * Makes the database hold exactly the one administrator configured in the
   * environment: creates or updates that account (email, name, password) and
   * removes any other account. Used by the seed and on API start.
   */
  async ensureAdmin(ctx: AppContext): Promise<'created' | 'updated'> {
    const passwordHash = await hashPassword(ctx.env.ADMIN_PASSWORD)
    const existing = await adminRepo.findByEmail(ctx.db, ctx.env.ADMIN_EMAIL)
    let id: string
    if (existing) {
      await adminRepo.update(ctx.db, existing.id, { name: ctx.env.ADMIN_NAME, passwordHash, isActive: true })
      id = existing.id
    } else {
      id = (await adminRepo.create(ctx.db, { email: ctx.env.ADMIN_EMAIL, name: ctx.env.ADMIN_NAME, passwordHash })).id
    }
    const removed = await adminRepo.removeOthers(ctx.db, id)
    if (removed) ctx.log.warn({ removed }, 'extra administrator accounts removed — there is exactly one administrator')
    return existing ? 'updated' : 'created'
  },
}
