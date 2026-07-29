import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const isDev = process.env.NODE_ENV !== 'production';

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const ctx = context ? `[${context as string}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp as string} ${level} ${ctx}${message as string}${metaStr}`;
  }),
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        // Console — always on
        new winston.transports.Console({
          format: isDev ? consoleFormat : jsonFormat,
          level: isDev ? 'debug' : 'info',
        }),

        // Daily rotating file — production only
        ...(!isDev
          ? [
              new (winston.transports as any).DailyRotateFile({
                filename: '/var/log/dentaflow/app-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '14d',
                format: jsonFormat,
                level: 'info',
              }),
              new (winston.transports as any).DailyRotateFile({
                filename: '/var/log/dentaflow/error-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '30d',
                format: jsonFormat,
                level: 'error',
              }),
            ]
          : []),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
