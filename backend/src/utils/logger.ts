import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { env } from '../config/env';

const logDir = path.resolve(env.LOG_DIR);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        const cid = correlationId ? ` [${correlationId}]` : '';
        return `${timestamp} ${level}${cid}: ${message}${metaStr}`;
      })
    ),
  }),
];

if (env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      dirname: logDir,
      maxSize: '100m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  transports,
});
