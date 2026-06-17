import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { successResponse, NotFoundError } from '../utils/response';
import { authenticate } from '../middleware/auth';

export const cashEntriesRouter = Router();
cashEntriesRouter.use(authenticate);

// POST /api/cash-entries
cashEntriesRouter.post('/', async (req: Request, res: Response, next) => {
  try {
    const { type, amount, category, description, daySessionId } = req.body;

    if (!type || !amount || !category || !description || !daySessionId) {
      return res.status(400).json({ message: 'type, amount, category, description and daySessionId are required' });
    }
    if (!['cash_in', 'cash_out'].includes(type)) {
      return res.status(400).json({ message: 'type must be cash_in or cash_out' });
    }

    const session = await prisma.daySession.findUnique({ where: { id: daySessionId } });
    if (!session) throw new NotFoundError('Day session');

    const entry = await prisma.cashEntry.create({
      data: {
        type,
        amount: Number(amount),
        category,
        description,
        daySessionId,
        performedBy: req.user!.userId,
      },
      include: {
        performer: { select: { id: true, name: true } },
      },
    });

    successResponse(res, entry, 'Cash entry recorded', 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/cash-entries?daySessionId=xxx
cashEntriesRouter.get('/', async (req: Request, res: Response, next) => {
  try {
    const { daySessionId } = req.query;
    const entries = await prisma.cashEntry.findMany({
      where: daySessionId ? { daySessionId: String(daySessionId) } : {},
      include: { performer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    successResponse(res, entries, 'Cash entries retrieved');
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cash-entries/:id
cashEntriesRouter.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const entry = await prisma.cashEntry.findUnique({
      where: { id: req.params.id },
      include: { daySession: { select: { status: true } } },
    });
    if (!entry) throw new NotFoundError('Cash entry');
    if (entry.daySession.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Cannot delete entries from a closed session' });
    }
    await prisma.cashEntry.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Cash entry deleted');
  } catch (err) {
    next(err);
  }
});
