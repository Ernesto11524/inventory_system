import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { addDays, addHours } from 'date-fns';
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

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new Error('Email is required');

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to avoid user enumeration
  if (!user) {
    return successResponse(res, null, 'If that email exists, a reset link has been sent');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = addHours(new Date(), 2);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  // Try to send email if SMTP is configured, otherwise return token directly for admin use
  const smtpHost = process.env.SMTP_HOST;
  const appUrl = process.env.WEB_APP_URL || 'http://76.13.1.67';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  if (smtpHost) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'StockFlow — Password Reset',
        html: `<p>Click the link below to reset your password (valid for 2 hours):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
      return successResponse(res, null, 'Password reset email sent');
    } catch {
      // Fall through to return token directly
    }
  }

  // No SMTP configured — return the reset URL directly (admin app, trusted environment)
  successResponse(res, { resetUrl, expiresAt: expiry }, 'Password reset link generated (no email configured)');
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) throw new Error('Token and new password are required');
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) throw new Error('Invalid or expired reset token');

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, passwordResetToken: null, passwordResetExpiry: null },
  });

  // Invalidate all sessions
  await prisma.session.deleteMany({ where: { userId: user.id } });

  successResponse(res, null, 'Password reset successfully. Please sign in.');
});
