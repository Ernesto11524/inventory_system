import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { successResponse, buildPagination } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { cacheGet, cacheSet } from '../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '@inventory/shared';

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

/**
 * GET /api/inventory
 * All products with current stock levels
 */
inventoryRouter.get('/', async (req: Request, res: Response, next) => {
  try {
  const { page = 1, limit = 20, search, categoryId } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    product: {
      deletedAt: null,
      ...(search ? {
        OR: [
          { name: { contains: String(search), mode: 'insensitive' } },
          { sku: { contains: String(search), mode: 'insensitive' } },
        ],
      } : {}),
      ...(categoryId ? { categoryId: String(categoryId) } : {}),
    },
  };

  const [inventory, total] = await prisma.$transaction([
    prisma.inventory.findMany({
      where,
      include: {
        product: { include: { category: true } },
      },
      skip,
      take: limitNum,
      orderBy: { lastUpdated: 'desc' },
    }),
    prisma.inventory.count({ where }),
  ]);

  successResponse(res, inventory, 'Inventory retrieved', 200, buildPagination(pageNum, limitNum, total));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/inventory/low-stock
 * Products with stock below minimum level
 */
inventoryRouter.get('/low-stock', async (req: Request, res: Response, next) => {
  try {
  const cached = await cacheGet(CACHE_KEYS.LOW_STOCK);
  if (cached) return successResponse(res, cached, 'Low stock items retrieved');

  const items = await prisma.inventory.findMany({
    where: {
      product: { deletedAt: null },
      currentStock: { lt: prisma.inventory.fields.currentStock },
    },
    include: {
      product: { include: { category: true } },
    },
  });

  // Filter in JS since Prisma can't compare columns directly
  const lowStock = await prisma.$queryRaw<any[]>`
    SELECT 
      i.id,
      i."productId",
      i."currentStock",
      i."lastUpdated",
      p.name as "productName",
      p.sku as "productSku",
      p."minStockLevel",
      p."imageUrl",
      c.name as "categoryName"
    FROM inventory i
    JOIN products p ON i."productId" = p.id
    LEFT JOIN categories c ON p."categoryId" = c.id
    WHERE p."deletedAt" IS NULL
      AND i."currentStock" < p."minStockLevel"
    ORDER BY (i."currentStock"::float / NULLIF(p."minStockLevel", 0)) ASC
  `;

  await cacheSet(CACHE_KEYS.LOW_STOCK, lowStock, CACHE_TTL.SHORT);
  successResponse(res, lowStock, 'Low stock items retrieved');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/inventory/summary
 * Aggregate stock statistics
 */
inventoryRouter.get('/summary', async (req: Request, res: Response, next) => {
  try {
  const summary = await prisma.$queryRaw<any[]>`
    SELECT
      COUNT(DISTINCT p.id)::int as "totalProducts",
      COALESCE(SUM(i."currentStock" * p."costPrice"), 0)::float as "totalStockValue",
      COUNT(CASE WHEN i."currentStock" < p."minStockLevel" AND i."currentStock" > 0 THEN 1 END)::int as "lowStockCount",
      COUNT(CASE WHEN i."currentStock" <= 0 THEN 1 END)::int as "outOfStockCount"
    FROM products p
    LEFT JOIN inventory i ON p.id = i."productId"
    WHERE p."deletedAt" IS NULL
  `;

  successResponse(res, summary[0], 'Inventory summary retrieved');
  } catch (err) {
    next(err);
  }
});
