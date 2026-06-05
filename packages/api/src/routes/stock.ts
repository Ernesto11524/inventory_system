import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { logActivity } from '../utils/activityLog';
import { io } from '../index';
import { successResponse, NotFoundError, buildPagination } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { stockEntrySchema, paginationSchema } from '@inventory/shared';
import { emitStockUpdate } from '../services/socketService';
import { cacheDel } from '../utils/cache';
import { CACHE_KEYS } from '@inventory/shared';

export const stockRouter = Router();

/**
 * POST /api/stock/entry
 * Create a new stock entry (immutable ledger)
 */
stockRouter.post('/entry', validate(stockEntrySchema), async (req: Request, res: Response, next) => {
  try {
  const { productId, quantity, type, note } = req.body;

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: { inventory: true },
  });

  if (!product) throw new NotFoundError('Product');

  // For outbound entries, check we have enough stock
  const isOutbound = type === 'sale';
  if (isOutbound) {
    const currentStock = product.inventory?.currentStock || 0;
    if (currentStock < quantity) {
      throw new Error(`Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`);
    }
  }

  // Determine stock delta
  const delta = (type === 'sale') ? -quantity : quantity;

  // Create entry and update inventory atomically
  const [entry, inventory] = await prisma.$transaction([
    prisma.stockEntry.create({
      data: {
        productId,
        quantity,
        type,
        note,
        performedBy: req.user!.userId,
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        performer: { select: { id: true, name: true } },
      },
    }),
    prisma.inventory.upsert({
      where: { productId },
      update: { currentStock: { increment: delta } },
      create: { productId, currentStock: Math.max(0, delta) },
    }),
  ]);

  // Invalidate caches
  await cacheDel(CACHE_KEYS.PRODUCT(productId));
  await cacheDel(CACHE_KEYS.INVENTORY);
  await cacheDel(CACHE_KEYS.STOCK_MOVEMENT(productId));
  await cacheDel(CACHE_KEYS.DASHBOARD_METRICS);

  // Emit real-time update
  if (io) {
    emitStockUpdate(io, {
      productId,
      productName: product.name,
      currentStock: inventory.currentStock,
      change: delta,
      type,
    });
  }

  await logActivity(
    req.user!.userId,
    `stock_${type}`,
    `${type.charAt(0).toUpperCase() + type.slice(1)}: ${quantity}x ${product.name} (stock now ${inventory.currentStock})`,
    req.ip,
  );

  successResponse(res, entry, 'Stock entry created', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/history/:productId
 */
stockRouter.get('/history/:productId', async (req: Request, res: Response, next) => {
  try {
  const { productId } = req.params;
  const { page = 1, limit = 20, type } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) throw new NotFoundError('Product');

  const where: any = { productId, ...(type ? { type: String(type) } : {}) };

  const [entries, total] = await prisma.$transaction([
    prisma.stockEntry.findMany({
      where,
      include: {
        performer: { select: { id: true, name: true } },
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockEntry.count({ where }),
  ]);

  successResponse(res, entries, 'Stock history retrieved', 200, buildPagination(pageNum, limitNum, total));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/recent
 * Recent activity across all products
 */
stockRouter.get('/recent', async (req: Request, res: Response, next) => {
  try {
  const { limit = 20 } = req.query;

  const entries = await prisma.stockEntry.findMany({
    include: {
      product: { select: { id: true, name: true, sku: true } },
      performer: { select: { id: true, name: true } },
    },
    take: Math.min(Number(limit), 50),
    orderBy: { createdAt: 'desc' },
  });

  successResponse(res, entries, 'Recent activity retrieved');
  } catch (err) {
    next(err);
  }
});
