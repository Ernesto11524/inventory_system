"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryRouter = void 0;
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const cache_1 = require("../utils/cache");
const shared_1 = require("@inventory/shared");
exports.inventoryRouter = (0, express_1.Router)();
exports.inventoryRouter.use(auth_1.authenticate);
/**
 * GET /api/inventory
 * All products with current stock levels
 */
exports.inventoryRouter.get('/', async (req, res) => {
    const { page = 1, limit = 20, search, categoryId } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    const where = {
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
    const [inventory, total] = await client_1.default.$transaction([
        client_1.default.inventory.findMany({
            where,
            include: {
                product: { include: { category: true } },
            },
            skip,
            take: limitNum,
            orderBy: { lastUpdated: 'desc' },
        }),
        client_1.default.inventory.count({ where }),
    ]);
    (0, response_1.successResponse)(res, inventory, 'Inventory retrieved', 200, (0, response_1.buildPagination)(pageNum, limitNum, total));
});
/**
 * GET /api/inventory/low-stock
 * Products with stock below minimum level
 */
exports.inventoryRouter.get('/low-stock', async (req, res) => {
    const cached = await (0, cache_1.cacheGet)(shared_1.CACHE_KEYS.LOW_STOCK);
    if (cached)
        return (0, response_1.successResponse)(res, cached, 'Low stock items retrieved');
    const items = await client_1.default.inventory.findMany({
        where: {
            product: { deletedAt: null },
            currentStock: { lt: client_1.default.inventory.fields.currentStock },
        },
        include: {
            product: { include: { category: true } },
        },
    });
    // Filter in JS since Prisma can't compare columns directly
    const lowStock = await client_1.default.$queryRaw `
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
    await (0, cache_1.cacheSet)(shared_1.CACHE_KEYS.LOW_STOCK, lowStock, shared_1.CACHE_TTL.SHORT);
    (0, response_1.successResponse)(res, lowStock, 'Low stock items retrieved');
});
/**
 * GET /api/inventory/summary
 * Aggregate stock statistics
 */
exports.inventoryRouter.get('/summary', async (req, res) => {
    const summary = await client_1.default.$queryRaw `
    SELECT
      COUNT(DISTINCT p.id)::int as "totalProducts",
      COALESCE(SUM(i."currentStock" * p."costPrice"), 0)::float as "totalStockValue",
      COUNT(CASE WHEN i."currentStock" < p."minStockLevel" AND i."currentStock" > 0 THEN 1 END)::int as "lowStockCount",
      COUNT(CASE WHEN i."currentStock" <= 0 THEN 1 END)::int as "outOfStockCount"
    FROM products p
    LEFT JOIN inventory i ON p.id = i."productId"
    WHERE p."deletedAt" IS NULL
  `;
    (0, response_1.successResponse)(res, summary[0], 'Inventory summary retrieved');
});
//# sourceMappingURL=inventory.js.map