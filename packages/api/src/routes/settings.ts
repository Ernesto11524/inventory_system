import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { successResponse } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/auth';

export const settingsRouter = Router();
settingsRouter.use(authenticate);

async function getOrCreate() {
  let s = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
  if (!s) s = await prisma.appSettings.create({ data: { id: 'singleton' } });
  return s;
}

/**
 * GET /api/settings
 * Returns public settings for all authenticated users.
 * Admins also receive hasSecretKey indicator.
 */
settingsRouter.get('/', async (req: Request, res: Response, next) => {
  try {
  const settings = await getOrCreate();
  const { paystackSecretKey, ...pub } = settings;

  const payload = req.user!.role === 'admin'
    ? { ...pub, hasSecretKey: !!paystackSecretKey }
    : pub;

  successResponse(res, payload, 'Settings retrieved');
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/settings
 * Admin-only. Updates store settings (upserts the singleton row).
 */
settingsRouter.patch('/', requireAdmin, async (req: Request, res: Response, next) => {
  try {
  const allowed = [
    'storeName', 'storeTagline', 'storeLogo', 'storeEmail',
    'storePhone', 'storeAddress', 'currency', 'currencySymbol',
    'paystackPublicKey', 'paystackSecretKey',
  ];

  const data: Record<string, any> = {};
  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      // Treat empty string as null for optional fields
      data[field] = req.body[field] === '' ? null : req.body[field];
    }
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...data },
    update: data,
  });

  const { paystackSecretKey, ...pub } = settings;
  successResponse(res, { ...pub, hasSecretKey: !!paystackSecretKey }, 'Settings updated');
  } catch (err) {
    next(err);
  }
});
