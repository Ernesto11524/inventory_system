import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client';
import { successResponse, NotFoundError, buildPagination } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/auth';

export const usersRouter = Router();
usersRouter.use(authenticate);

// GET /api/users
usersRouter.get('/', requireAdmin, async (req: Request, res: Response, next) => {
  try {
    const { page = 1, limit = 50, includeHidden } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 200);
    const skip = (pageNum - 1) * limitNum;

    const where = includeHidden === 'true' ? {} : { isHidden: false };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, isHidden: true, posBarCodeOnly: true, createdAt: true },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    successResponse(res, users, 'Users retrieved', 200, buildPagination(pageNum, limitNum, total));
  } catch (err) {
    next(err);
  }
});

// POST /api/users  — create user
usersRouter.post('/', requireAdmin, async (req: Request, res: Response, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) throw new Error('Name, email and password are required');

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('Email already in use');

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || 'staff' },
      select: { id: true, name: true, email: true, role: true, posBarCodeOnly: true, createdAt: true },
    });

    successResponse(res, user, 'User created', 201);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id
usersRouter.delete('/:id', requireAdmin, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    if (id === req.user!.userId) throw new Error('Cannot delete your own account');

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User');
    if (user.isHidden) throw new Error('Cannot delete system accounts');

    await prisma.user.delete({ where: { id } });
    successResponse(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/password  — admin resets a user's password
usersRouter.patch('/:id/password', requireAdmin, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) throw new Error('Password must be at least 6 characters');

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User');

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    successResponse(res, null, `Password updated for ${user.name}`);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/visibility  — hide or show a user
usersRouter.patch('/:id/visibility', requireAdmin, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const { isHidden } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User');

    const updated = await prisma.user.update({
      where: { id },
      data: { isHidden: Boolean(isHidden) },
      select: { id: true, name: true, isHidden: true },
    });

    successResponse(res, updated, `User ${updated.isHidden ? 'hidden' : 'shown'}`);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/pos-settings
usersRouter.patch('/:id/pos-settings', requireAdmin, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const { posBarCodeOnly } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User');

    const updated = await prisma.user.update({
      where: { id },
      data: { posBarCodeOnly: Boolean(posBarCodeOnly) },
      select: { id: true, name: true, email: true, role: true, posBarCodeOnly: true },
    });

    successResponse(res, updated, `POS barcode mode updated for ${user.name}`);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/push-token
usersRouter.post('/push-token', async (req: Request, res: Response, next) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return successResponse(res, null, 'Push token skipped');
    }
    successResponse(res, { registered: true }, 'Push token registered');
  } catch (err) {
    next(err);
  }
});
