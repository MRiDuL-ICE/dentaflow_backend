import {
  ExceptionFilter, Catch,
  ArgumentsHost, HttpException,
  HttpStatus, Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

interface ErrorResponse {
  statusCode: number;
  error:      string;
  message:    string | string[];
  path:       string;
  timestamp:  string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx   = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const req   = ctx.getRequest<FastifyRequest>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error   = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        // class-validator sends { message: string[] }
        message = (body.message as string | string[]) ?? message;
        error   = (body.error   as string)            ?? error;
      }
    } else if (exception instanceof Error) {
      // Unexpected errors — log full stack, return generic message
      this.logger.error(
        `Unhandled error on ${req.method} ${req.url}`,
        exception.stack,
      );
      message = 'Something went wrong';
      error   = 'Internal Server Error';
    }

    // Log all 5xx errors
    if (status >= 500) {
      this.logger.error(
        `${status} ${req.method} ${req.url} — ${JSON.stringify(message)}`,
      );
    }

    const body: ErrorResponse = {
      statusCode: status,
      error,
      message,
      path:      req.url,
      timestamp: new Date().toISOString(),
    };

    void reply.status(status).send(body);
  }
}
