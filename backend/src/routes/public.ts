import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../context.js'
import { publicController } from '../controllers/publicController.js'

/**
 * Public API — no authentication anywhere here. Read-only except for
 * submissions, which are moderated before anything becomes visible.
 */
export async function publicRoutes(app: FastifyInstance, ctx: AppContext) {
  const c = publicController(ctx)
  const searchLimit = { config: { rateLimit: { max: ctx.env.RATE_LIMIT_SEARCH, timeWindow: '1 minute' } } }
  const submitLimit = { config: { rateLimit: { max: ctx.env.RATE_LIMIT_SUBMIT, timeWindow: '10 minutes' } } }

  app.get('/universes', c.listUniverses)
  app.get('/universes/:id', c.getUniverse)

  app.get('/websites', c.listWebsites)
  app.get('/websites/:id', c.getWebsite)
  app.get('/websites/:id/relationships', c.websiteRelationships)
  app.get('/websites/:id/related', c.websiteRelated)
  app.get('/websites/:id/alternatives', c.websiteAlternatives)
  app.get('/websites/:id/integrations', c.websiteIntegrations)

  app.get('/relationships', c.listRelationships)

  app.get('/search', searchLimit, c.search)

  app.get('/discovery/random', searchLimit, c.discoverRandom)
  app.get('/discovery/trending', c.discoverTrending)
  app.get('/discovery/emerging', c.discoverEmerging)

  app.get('/submissions/check', searchLimit, c.checkSubmissionUrl)
  app.post('/submissions', submitLimit, c.createSubmission)
}
