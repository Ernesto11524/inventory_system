import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { successResponse, NotFoundError } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/auth';
import type { UserPermissions } from '@inventory/shared';

export const permissionsRouter = Router();
permissionsRouter.use(authenticate, requireAdmin);

permissionsRouter.get('/:userId', async (req: Request, res: Response, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, permissions: true },
    });

    if (!user) throw new NotFoundError('User');

    successResponse(res, {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      permissions: user.permissions as unknown as UserPermissions,
    });
  } catch (err) {
    next(err);
  }
});

permissionsRouter.patch('/:userId', async (req: Request, res: Response, next) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      throw new Error('Invalid permissions object');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { permissions },
      select: { id: true, name: true, permissions: true },
    });

    successResponse(res, {
      user: { id: updated.id, name: updated.name },
      permissions: updated.permissions as unknown as UserPermissions,
    }, 'Permissions updated');
  } catch (err) {
    next(err);
  }
});
