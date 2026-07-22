import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export function requireBusinessAccess(resourceName: string = 'resource') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const resourceBusinessId = req.params.businessId || req.query.businessId || req.body?.businessId;

    if (resourceBusinessId && resourceBusinessId !== req.user?.businessId) {
      return next(new ForbiddenError(`Access denied to ${resourceName} of another business`));
    }

    next();
  };
}
