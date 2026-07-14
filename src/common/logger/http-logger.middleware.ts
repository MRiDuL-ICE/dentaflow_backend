import {
  Injectable, NestMiddleware,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import pino from 'pino';

const httpLogger = pino({
  level:     process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  use(
    req:  FastifyRequest['raw'],
    res:  FastifyReply['raw'],
    next: () => void,
  ): void {
    const start  = Date.now();
    const { method, url } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const status   = res.statusCode;

      const logFn = status >= 500
        ? httpLogger.error.bind(httpLogger)
        : status >= 400
          ? httpLogger.warn.bind(httpLogger)
          : httpLogger.info.bind(httpLogger);

      logFn({
        method,
        url,
        status,
        duration: `${duration}ms`,
        ip:       req.socket?.remoteAddress,
      }, `${method} ${url} ${status} ${duration}ms`);
    });

    next();
  }
}
