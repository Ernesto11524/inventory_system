import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client';
import { successResponse, NotFoundError, buildPagination } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema } from '@inventory/shared';

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get('/', requireAdmin, async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  successResponse(res, users, 'Users retrieved', 200, buildPagination(pageNum, limitNum, total));
});

usersRouter.post('/', requireAdmin, validate(registerSchema), async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  successResponse(res, user, 'User created', 201);
});

usersRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (id === req.user!.userId) throw new Error('Cannot delete your own account');

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  await prisma.user.delete({ where: { id } });
  successResponse(res, null, 'User deleted');
});

/**
 * POST /api/users/push-token
 * Register Expo push token for current user (mobile notifications)
 */
usersRouter.post('/push-token', async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return successResponse(res, null, 'Push token skipped (no token provided)');
  }

  // Store token in a JSON field on user — or log it for now.
  // In production you'd persist this to send targeted pushes.
  // For now we acknowledge receipt so the mobile app doesn't error.
  console.log(`[PUSH] Token registered for user ${req.user!.userId}: ${token.slice(0, 30)}…`);
  successResponse(res, { registered: true }, 'Push token registered');
});

/**
 * PATCH /api/users/:id/pos-settings
 * Toggle barcode-only mode for a user (admin only)
 */
usersRouter.patch('/:id/pos-settings', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { posBarCodeOnly } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  const updated = await prisma.user.update({
    where: { id },
    data: { posBarCodeOnly: Boolean(posBarCodeOnly) },
    select: { id: true, name: true, email: true, role: true, posBarCodeOnly: true },
  });

  successResponse(res, updated, `POS barcode mode ${posBarCodeOnly ? 'enabled' : 'disabled'} for ${user.name}`);
});

/**
 * POST /api/users
 * Create a new user (admin only)
 */
usersRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) throw new Error('Name, email and password are required');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already in use');

  const bcrypt = await import('bcryptjs');
  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || 'staff' },
    select: { id: true, name: true, email: true, role: true, posBarCodeOnly: true, createdAt: true },
  });

  successResponse(res, user, 'User created', 201);
});
