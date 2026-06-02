import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { successResponse, buildPagination } from '../utils/response';
import { authenticate, requireManagerOrAdmin } from '../middleware/auth';

export const activityRouter = Router();
activityRouter.use(authenticate);
activityRouter.use(requireManagerOrAdmin);

// GET /api/activity - Get all activity logs (admin only)
activityRouter.get('/', async (req: Request, res: Response, next) => {
  try {
  const { page = 1, limit = 50, userId, action, from, to } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    ...(userId ? { userId: String(userId) } : {}),
    ...(action ? { action: { contains: String(action) } } : {}),
    ...(from || to ? {
      createdAt: {
        ...(from ? { gte: new Date(String(from)) } : {}),
        ...(to ? { lte: new Date(String(to) + 'T23:59:59') } : {}),
      },
    } : {}),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.activityLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.activityLog.count({ where }),
  ]);

  successResponse(res, logs, 'Activity logs retrieved', 200, buildPagination(pageNum, limitNum, total));
  } catch (err) {
    next(err);
  }
});

// GET /api/activity/workers - Worker login summary
activityRouter.get('/workers', async (req: Request, res: Response, next) => {
  try {
  const { from, to } = req.query;
  const fromDate = from ? new Date(String(from)) : new Date(new Date().setHours(0,0,0,0));
  const toDate = to ? new Date(String(to) + 'T23:59:59') : new Date();

  const users = await prisma.user.findMany({
    where: { isHidden: false },
    select: { id: true, name: true, email: true, role: true },
  });

  const workerStats = await Promise.all(users.map(async (user) => {
    const logs = await prisma.activityLog.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    const logins = logs.filter(l => l.action === 'login');
    const logouts = logs.filter(l => l.action === 'logout');
    const salesCount = logs.filter(l => l.action === 'stock_sale').length;
    const stockActions = logs.filter(l => l.action.startsWith('stock_')).length;

    return {
      user,
      logins: logins.map(l => l.createdAt),
      logouts: logouts.map(l => l.createdAt),
      lastSeen: logs.length > 0 ? logs[logs.length - 1].createdAt : null,
      salesCount,
      stockActions,
      totalActions: logs.length,
    };
  }));

  successResponse(res, workerStats, 'Worker activity retrieved');
  } catch (err) {
    next(err);
  }
});

// GET /api/activity/users/:userId - Specific user activity
activityRouter.get('/users/:userId', async (req: Request, res: Response, next) => {
  try {
  const { userId } = req.params;
  const { from, to, page = 1, limit = 50 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    userId,
    ...(from || to ? {
      createdAt: {
        ...(from ? { gte: new Date(String(from)) } : {}),
        ...(to ? { lte: new Date(String(to) + 'T23:59:59') } : {}),
      },
    } : {}),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.activityLog.count({ where }),
  ]);

  successResponse(res, logs, 'User activity retrieved', 200, buildPagination(pageNum, limitNum, total));
  } catch (err) {
    next(err);
  }
});
