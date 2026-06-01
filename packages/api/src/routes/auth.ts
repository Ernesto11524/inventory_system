import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { addDays } from 'date-fns';
import prisma from '../prisma/client';
import { logActivity } from '../utils/activityLog';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { successResponse, errorResponse, UnauthorizedError } from '../utils/response';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { loginSchema, refreshTokenSchema } from '@inventory/shared';
import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS, REFRESH_TOKEN_EXPIRY_MS } from '@inventory/shared';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  message: { success: false, data: null, message: 'Too many login attempts, please try again later', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 */
authRouter.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UnauthorizedError('Invalid email or password');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store refresh token
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    },
  });

  await logActivity(user.id, 'login', `Logged in from ${req.ip}`, req.ip);

  successResponse(res, {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    tokens: { accessToken, refreshToken },
  }, 'Login successful');
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security: []
 */
authRouter.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  const session = await prisma.session.findUnique({ where: { refreshToken }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  try {
    verifyRefreshToken(refreshToken);
  } catch {
    await prisma.session.delete({ where: { id: session.id } });
    throw new UnauthorizedError('Invalid refresh token');
  }

  const { user } = session;
  const payload = { userId: user.id, email: user.email, role: user.role };
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  // Rotate refresh token
  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    },
  });

  successResponse(res, {
    tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken },
  }, 'Token refreshed');
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and invalidate refresh token
 *     tags: [Auth]
 */
authRouter.post('/logout', authenticate, async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const refreshToken = req.body.refreshToken;

  if (refreshToken) {
    await prisma.session.deleteMany({ where: { refreshToken } });
  }

  await logActivity(req.user!.userId, 'logout', `Logged out`, req.ip);

  successResponse(res, null, 'Logged out successfully');
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 */
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, name: true, email: true, role: true, posBarCodeOnly: true, createdAt: true },
  });
  successResponse(res, user, 'User retrieved');
});
