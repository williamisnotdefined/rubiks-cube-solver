import { ArgumentsHost, Catch, HttpException, type ExceptionFilter } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from '../../shared/errors/app-error.js'

@Catch()
export class WcaDataExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const request = context.getRequest<FastifyRequest>()
    const reply = context.getResponse<FastifyReply>()

    if (error instanceof AppError) {
      reply.code(error.statusCode).send(errorResponse(error.code, error.message, request.id))
      return
    }

    if (error instanceof ZodError) {
      reply.code(400).send(errorResponse('invalid_request', 'Invalid request', request.id))
      return
    }

    if (error instanceof HttpException) {
      reply.code(error.getStatus()).send(errorResponse(httpExceptionCode(error), httpExceptionMessage(error), request.id))
      return
    }

    request.log.error({ error }, 'Unhandled WCA Data API error')
    reply.code(500).send(errorResponse('internal_error', 'Internal server error', request.id))
  }
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

function httpExceptionCode(error: HttpException): string {
  if (error.getStatus() === 404) {
    return 'not_found'
  }

  return 'http_error'
}

function httpExceptionMessage(error: HttpException): string {
  const response = error.getResponse()

  if (typeof response === 'object' && response !== null && 'message' in response) {
    const message = response.message

    if (typeof message === 'string') {
      return message
    }
  }

  return error.message
}
