import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from '../../shared/errors/app-error.js'

export async function registerErrorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(errorResponse(error.code, error.message, request.id))
    }

    if (error instanceof ZodError) {
      return reply.code(400).send(errorResponse('invalid_request', 'Invalid request', request.id))
    }

    request.log.error({ error }, 'Unhandled WCA Data API error')
    return reply.code(500).send(errorResponse('internal_error', 'Internal server error', request.id))
  })
}

function errorResponse(code: string, message: string, requestId: string) {
  return {
    error: {
      code,
      message,
      requestId,
    },
  }
}
