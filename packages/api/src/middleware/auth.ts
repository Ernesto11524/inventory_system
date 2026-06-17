import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/response';
import prisma from '../prisma/client';

// Extend Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  if (req.user.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }
  next();
}

export function requireManagerOrAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    throw new ForbiddenError('Manager or admin access required');
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}

// Check a dot-path permission (e.g. 'daySessions.viewSessions') from the DB.
// Admins and managers always pass. Staff must have the specific permission enabled.
// Reads from DB so permission changes take effect immediately without re-login.
export function requirePermission(permPath: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) { next(new UnauthorizedError()); return; }
    if (req.user.role === 'admin' || req.user.role === 'manager') { next(); return; }
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { permissions: true },
      });
      const parts = permPath.split('.');
      let val: any = user?.permissions;
      for (const part of parts) val = val?.[part];
      if (!val) { next(new ForbiddenError('You do not have permission to do this')); return; }
      next();
    } catch (err) {
      next(err);
    }
  };
}
