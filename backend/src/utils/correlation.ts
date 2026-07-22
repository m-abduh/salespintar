import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export function correlationMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  next();
}

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: {
        userId: string;
        businessId: string;
        role: string;
      };
    }
  }
}
