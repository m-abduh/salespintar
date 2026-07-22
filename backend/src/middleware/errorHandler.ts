import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const correlationId = req.correlationId;

  if (err instanceof AppError) {
    logger.warn(`[${correlationId}] ${err.statusCode} ${err.message}`, {
      path: req.path,
      method: req.method,
      code: err.code,
    });
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        correlationId,
      },
    });
  }

  logger.error(`[${correlationId}] Unhandled error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json({
    error: {
      message: 'Internal server error',
      correlationId,
    },
  });
}
