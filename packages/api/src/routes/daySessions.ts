import { Router, Request, Response } from 'express';
import { format } from 'date-fns';
import prisma from '../prisma/client';
import { successResponse, buildPagination, NotFoundError, ConflictError } from '../utils/response';
import { authenticate, requireManagerOrAdmin } from '../middleware/auth';

export const daySessionsRouter = Router();

// GET /api/day-sessions/today
daySessionsRouter.get('/today', async (_req: Request, res: Response, next) => {
  try {
  const today = format(new Date(), 'yyyy-MM-dd');
  const session = await prisma.daySession.findUnique({
    where: { date: today },
    include: {
      opener: { select: { id: true, name: true } },
      closer: { select: { id: true, name: true } },
    },
  });
  successResponse(res, session, session ? 'Today\'s session retrieved' : 'No session open today');
  } catch (err) {
    next(err);
  }
});

// GET /api/day-sessions — list all sessions (paged)
daySessionsRouter.get('/', async (req: Request, res: Response, next) => {
  try {
  const { page = 1, limit = 30 } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const [sessions, total] = await prisma.$transaction([
    prisma.daySession.findMany({
      include: {
        opener: { select: { id: true, name: true } },
        closer: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.daySession.count(),
  ]);

  successResponse(res, sessions, 'Day sessions retrieved', 200, buildPagination(pageNum, limitNum, total));
  } catch (err) {
    next(err);
  }
});

// GET /api/day-sessions/:id — single session with activity
daySessionsRouter.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const session = await prisma.daySession.findUnique({
      where: { id },
      include: {
        opener: { select: { id: true, name: true } },
        closer: { select: { id: true, name: true } },
      },
    });
    if (!session) throw new NotFoundError('Day session');

    const endTime = session.closedAt ?? new Date();

    const [activityLogs, salesSummary] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where: { createdAt: { gte: session.openedAt, lte: endTime } },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: session.openedAt, lte: endTime } },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    successResponse(res, {
      session,
      activityLogs,
      summary: {
        totalSales: salesSummary._count.id,
        totalRevenue: salesSummary._sum.total ?? 0,
        totalActions: activityLogs.length,
      },
    }, 'Day session retrieved');
  } catch (err) {
    next(err);
  }
});

// POST /api/day-sessions — open today
daySessionsRouter.post('/', async (req: Request, res: Response, next) => {
  try {
  const today = format(new Date(), 'yyyy-MM-dd');

  const existing = await prisma.daySession.findUnique({ where: { date: today } });
  if (existing) throw new ConflictError('A session is already open for today');

  const session = await prisma.daySession.create({
    data: {
      date: today,
      openedBy: req.user!.userId,
      status: 'open',
      notes: req.body.notes ?? null,
    },
    include: {
      opener: { select: { id: true, name: true } },
    },
  });

  successResponse(res, session, 'Day session opened', 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/day-sessions/:id/close — close a session
daySessionsRouter.patch('/:id/close', async (req: Request, res: Response, next) => {
  try {
  const { id } = req.params;

  const session = await prisma.daySession.findUnique({ where: { id } });
  if (!session) throw new NotFoundError('Day session');
  if (session.status === 'closed') throw new ConflictError('Session is already closed');

  const updated = await prisma.daySession.update({
    where: { id },
    data: {
      status: 'closed',
      closedAt: new Date(),
      closedBy: req.user!.userId,
      notes: req.body.notes ?? session.notes,
    },
    include: {
      opener: { select: { id: true, name: true } },
      closer: { select: { id: true, name: true } },
    },
  });

  successResponse(res, updated, 'Day session closed');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/day-sessions/:id/reopen — reopen a closed session
daySessionsRouter.patch('/:id/reopen', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.daySession.findUnique({ where: { id } });
    if (!session) throw new NotFoundError('Day session');
    if (session.status === 'open') throw new ConflictError('Session is already open');

    // Only allow reopening if it's today's session
    const today = format(new Date(), 'yyyy-MM-dd');
    if (session.date !== today) {
      throw new ConflictError('Can only reopen today\'s session');
    }

    const updated = await prisma.daySession.update({
      where: { id },
      data: {
        status: 'open',
        closedAt: null,
        closedBy: null,
      },
      include: {
        opener: { select: { id: true, name: true } },
        closer: { select: { id: true, name: true } },
      },
    });

    successResponse(res, updated, 'Day session reopened - continue working!');
  } catch (err) {
    next(err);
  }
});
