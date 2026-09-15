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
    return { id: user.id, email: user.email, role: user.role as Actor['role'] }
  },

  /** Ensures the first administrator exists (from env) — used by the seed. */
  async ensureFirstAdmin(ctx: AppContext): Promise<'created' | 'exists'> {
    if ((await adminRepo.count(ctx.db)) > 0) return 'exists'
    await adminRepo.create(ctx.db, {
      email: ctx.env.ADMIN_EMAIL,
      name: ctx.env.ADMIN_NAME,
      passwordHash: await hashPassword(ctx.env.ADMIN_PASSWORD),
      role: 'admin',
    })
    return 'created'
  },
}
