import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../context.js'
import { adminController } from '../controllers/adminController.js'
import { requireAuth } from '../middleware/auth.js'

/**
 * Administrative API. Everything except login requires the administrator's
 * JWT. There is a single administrator (configured through the environment);
 * there are no other accounts or roles.
 */
export async function adminRoutes(app: FastifyInstance, ctx: AppContext) {
  const c = adminController(ctx)
  const staff = { preHandler: requireAuth }
  const adminOnly = staff

  app.post('/auth/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, c.login)
  app.get('/auth/me', staff, c.me)

  app.get('/overview', staff, c.overview)
  app.get('/audit', adminOnly, c.audit)

  app.get('/submissions', staff, c.listSubmissions)
  app.get('/submissions/:id', staff, c.getSubmission)
  app.post('/submissions/:id/review', staff, c.reviewSubmission)

  app.get('/websites', staff, c.listWebsites)
  app.get('/websites/:id', staff, c.getWebsite)
  app.post('/websites', staff, c.createWebsite)
  app.patch('/websites/:id', staff, c.updateWebsite)
  app.delete('/websites/:id', adminOnly, c.deleteWebsite)

  app.get('/universes', staff, c.listUniverses)
  app.post('/universes', adminOnly, c.createUniverse)
  app.patch('/universes/:id', staff, c.updateUniverse)

  app.get('/relationships', staff, c.listRelationships)
  app.post('/relationships', staff, c.createRelationship)
  app.patch('/relationships/:id', staff, c.updateRelationship)
  app.delete('/relationships/:id', staff, c.deleteRelationship)

  app.get('/tags', staff, c.listTags)
  app.post('/tags', staff, c.createTag)
  app.patch('/tags/:id', staff, c.updateTag)
  app.delete('/tags/:id', adminOnly, c.deleteTag)
}
