import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { io } from '../index';
import { successResponse, NotFoundError, buildPagination } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { emitAlertResolved } from '../services/socketService';

export const alertsRouter = Router();

alertsRouter.use(authenticate);

alertsRouter.get('/', async (req: Request, res: Response, next) => {
  try {
  const { page = 1, limit = 20, resolved, type } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    ...(resolved !== undefined ? { resolved: resolved === 'true' } : {}),
    ...(type ? { type: String(type) } : {}),
  };

  const [alerts, total] = await prisma.$transaction([
    prisma.alert.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, imageUrl: true } },
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.alert.count({ where }),
  ]);

  successResponse(res, alerts, 'Alerts retrieved', 200, buildPagination(pageNum, limitNum, total));
  } catch (err) {
    next(err);
  }
});

alertsRouter.patch('/:id/resolve', async (req: Request, res: Response, next) => {
  try {
  const { id } = req.params;

  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) throw new NotFoundError('Alert');

  await prisma.alert.update({ where: { id }, data: { resolved: true } });

  if (io) emitAlertResolved(io, { alertId: id });

  successResponse(res, null, 'Alert resolved');
  } catch (err) {
    next(err);
  }
});

alertsRouter.get('/unresolved-count', async (_req: Request, res: Response, next) => {
  try {
  const count = await prisma.alert.count({ where: { resolved: false } });
  successResponse(res, { count }, 'Unresolved alert count');
  } catch (err) {
    next(err);
  }
});
