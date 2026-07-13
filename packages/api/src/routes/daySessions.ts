import { Router, Request, Response } from 'express';
import { format } from 'date-fns';
import prisma from '../prisma/client';
import { successResponse, buildPagination, NotFoundError, ConflictError } from '../utils/response';
import { authenticate, requirePermission } from '../middleware/auth';

export const daySessionsRouter = Router();

daySessionsRouter.use(authenticate);

const canView  = requirePermission('daySessions.viewSessions');
const canWrite = requirePermission('daySessions.openClose');

// GET /api/day-sessions/today
daySessionsRouter.get('/today', canView, async (_req: Request, res: Response, next) => {
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
daySessionsRouter.get('/', canView, async (req: Request, res: Response, next) => {
  try {
  const { page = 1, limit = 30, excludeToday } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const today = format(new Date(), 'yyyy-MM-dd');
  const where = excludeToday === 'true' ? { date: { not: today } } : {};

  const [sessions, total] = await prisma.$transaction([
    prisma.daySession.findMany({
      where,
      include: {
        opener: { select: { id: true, name: true } },
        closer: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.daySession.count({ where }),
  ]);

  successResponse(res, sessions, 'Day sessions retrieved', 200, buildPagination(pageNum, limitNum, total));
  } catch (err) {
    next(err);
  }
});

// GET /api/day-sessions/:id — single session with activity
daySessionsRouter.get('/:id', canView, async (req: Request, res: Response, next) => {
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

    const sessionWhere = { createdAt: { gte: session.openedAt, lte: endTime } };

    const [activityLogs, salesSummary, paymentBreakdown, splitSales, cashEntries] = await Promise.all([
      prisma.activityLog.findMany({
        where: { createdAt: { gte: session.openedAt, lte: endTime } },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.sale.aggregate({
        where: sessionWhere,
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: { ...sessionWhere, paymentMethod: { not: 'split' } },
        _sum: { total: true },
        _count: { id: true },
      }),
      // Fetch split sales separately so we can distribute their amounts
      prisma.sale.findMany({
        where: { ...sessionWhere, paymentMethod: 'split' },
        select: { splitPayments: true, total: true },
      }),
      prisma.cashEntry.findMany({
        where: { daySessionId: id },
        include: { performer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const totalRevenue = Number(salesSummary._sum.total ?? 0);
    const byPaymentMethod: Record<string, { total: number; count: number; components?: Record<string, number> }> = {};

    // Build breakdown from non-split sales
    for (const row of paymentBreakdown) {
      byPaymentMethod[row.paymentMethod] = {
        total: Number(row._sum.total ?? 0),
        count: row._count.id,
      };
    }

    // Build split entry with its own row and component breakdown
    if (splitSales.length > 0) {
      const splitTotal = splitSales.reduce((s, sale) => s + Number(sale.total), 0);
      const splitComponents: Record<string, number> = {};
      for (const sale of splitSales) {
        const parts = (sale.splitPayments as any[]) ?? [];
        for (const part of parts) {
          const method = part.method as string;
          const amount = Number(part.amount ?? 0);
          splitComponents[method] = (splitComponents[method] ?? 0) + amount;
        }
      }
      byPaymentMethod['split'] = { total: splitTotal, count: splitSales.length, components: splitComponents };
    }

    // systemMomo = pure momo sales + momo portion of any split sales
    const systemMomo = (byPaymentMethod['momo']?.total ?? 0) + (byPaymentMethod['split']?.components?.['momo'] ?? 0);
    const totalCashIn = cashEntries.filter(e => e.type === 'cash_in').reduce((s, e) => s + e.amount, 0);
    const totalCashOut = cashEntries.filter(e => e.type === 'cash_out').reduce((s, e) => s + e.amount, 0);

    successResponse(res, {
      session,
      activityLogs,
      cashEntries,
      summary: {
        totalSales: salesSummary._count.id,
        totalRevenue,
        totalActions: activityLogs.length,
        byPaymentMethod,
        systemMomo,
        totalCashIn,
        totalCashOut,
      },
    }, 'Day session retrieved');
  } catch (err) {
    next(err);
  }
});

// POST /api/day-sessions — open today
daySessionsRouter.post('/', canWrite, async (req: Request, res: Response, next) => {
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
daySessionsRouter.patch('/:id/close', canWrite, async (req: Request, res: Response, next) => {
  try {
  const { id } = req.params;
  const { notes, physicalCash, changeGiven, momoTotal } = req.body;

  const session = await prisma.daySession.findUnique({ where: { id } });
  if (!session) throw new NotFoundError('Day session');
  if (session.status === 'closed') throw new ConflictError('Session is already closed');

  const closedAt = new Date();

  // Compute reconciliation if cash data provided
  let reconcileData: any = {};
  if (physicalCash !== undefined) {
    const [salesAgg, cashEntries] = await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: session.openedAt, lte: closedAt } },
        _sum: { total: true },
      }),
      prisma.cashEntry.findMany({ where: { daySessionId: id } }),
    ]);
    const systemTotal = Number(salesAgg._sum.total ?? 0);
    const momo = Number(momoTotal ?? 0);
    const change = Number(changeGiven ?? 0);
    const physCash = Number(physicalCash);
    const cashIn = cashEntries.filter(e => e.type === 'cash_in').reduce((s, e) => s + e.amount, 0);
    const cashOut = cashEntries.filter(e => e.type === 'cash_out').reduce((s, e) => s + e.amount, 0);
    const totalPhysical = (physCash - change) + momo + cashIn - cashOut;
    reconcileData = {
      physicalCash: physCash,
      changeGiven: change,
      momoTotal: momo,
      variance: Math.round((totalPhysical - systemTotal) * 100) / 100,
      reconciledAt: closedAt,
    };
  }

  const updated = await prisma.daySession.update({
    where: { id },
    data: {
      status: 'closed',
      closedAt,
      closedBy: req.user!.userId,
      notes: notes ?? session.notes,
      ...reconcileData,
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
daySessionsRouter.patch('/:id/reopen', canWrite, async (req: Request, res: Response, next) => {
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
