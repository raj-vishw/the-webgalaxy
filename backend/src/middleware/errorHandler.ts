import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { AppError } from '../utils/errors.js'
import { fail } from '../utils/response.js'

/**
 * One place turns every failure into the API's error envelope. Known errors
 * keep their status and code; database and unexpected errors become a
 * generic 500 with the details only in the server log.
 */
export function registerErrorHandler(app: FastifyInstance) {
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply.status(404).send(fail('NOT_FOUND', `No route for ${request.method} ${request.url}.`))
  })

  app.setErrorHandler((error: FastifyError | AppError | Error, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      if (error.status >= 500) request.log.error({ err: error }, error.message)
      return reply.status(error.status).send(fail(error.code, error.message, error.details))
    }
    const fastifyError = error as FastifyError
    if (fastifyError.statusCode === 429) {
      return reply.status(429).send(fail('RATE_LIMITED', 'Too many requests. Please slow down.'))
    }
    if (fastifyError.statusCode && fastifyError.statusCode < 500) {
      // Body parse errors, oversized payloads, bad content types…
      return reply.status(fastifyError.statusCode).send(fail(fastifyError.code ?? 'BAD_REQUEST', 'The request could not be processed.'))
    }
    request.log.error({ err: error, path: request.url }, 'unexpected error')
    return reply.status(500).send(fail('INTERNAL_ERROR', 'Something went wrong on our side.'))
  })
}
