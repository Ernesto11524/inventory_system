"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockRouter = void 0;
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const index_1 = require("../index");
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@inventory/shared");
const socketService_1 = require("../services/socketService");
const cache_1 = require("../utils/cache");
const shared_2 = require("@inventory/shared");
exports.stockRouter = (0, express_1.Router)();
exports.stockRouter.use(auth_1.authenticate);
/**
 * POST /api/stock/entry
 * Create a new stock entry (immutable ledger)
 */
exports.stockRouter.post('/entry', (0, validate_1.validate)(shared_1.stockEntrySchema), async (req, res) => {
    const { productId, quantity, type, note } = req.body;
    const product = await client_1.default.product.findFirst({
        where: { id: productId, deletedAt: null },
        include: { inventory: true },
    });
    if (!product)
        throw new response_1.NotFoundError('Product');
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
    const [entry, inventory] = await client_1.default.$transaction([
        client_1.default.stockEntry.create({
            data: {
                productId,
                quantity,
                type,
                note,
                performedBy: req.user.userId,
            },
            include: {
                product: { select: { id: true, name: true, sku: true } },
                performer: { select: { id: true, name: true } },
            },
        }),
        client_1.default.inventory.upsert({
            where: { productId },
            update: { currentStock: { increment: delta } },
            create: { productId, currentStock: Math.max(0, delta) },
        }),
    ]);
    // Invalidate caches
    await (0, cache_1.cacheDel)(shared_2.CACHE_KEYS.PRODUCT(productId));
    await (0, cache_1.cacheDel)(shared_2.CACHE_KEYS.INVENTORY);
    await (0, cache_1.cacheDel)(shared_2.CACHE_KEYS.STOCK_MOVEMENT(productId));
    await (0, cache_1.cacheDel)(shared_2.CACHE_KEYS.DASHBOARD_METRICS);
    // Emit real-time update
    if (index_1.io) {
        (0, socketService_1.emitStockUpdate)(index_1.io, {
            productId,
            productName: product.name,
            currentStock: inventory.currentStock,
            change: delta,
            type,
        });
    }
    (0, response_1.successResponse)(res, entry, 'Stock entry created', 201);
});
/**
 * GET /api/stock/history/:productId
 */
exports.stockRouter.get('/history/:productId', async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    const product = await client_1.default.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product)
        throw new response_1.NotFoundError('Product');
    const where = { productId, ...(type ? { type: String(type) } : {}) };
    const [entries, total] = await client_1.default.$transaction([
        client_1.default.stockEntry.findMany({
            where,
            include: {
                performer: { select: { id: true, name: true } },
            },
            skip,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
        }),
        client_1.default.stockEntry.count({ where }),
    ]);
    (0, response_1.successResponse)(res, entries, 'Stock history retrieved', 200, (0, response_1.buildPagination)(pageNum, limitNum, total));
});
/**
 * GET /api/stock/recent
 * Recent activity across all products
 */
exports.stockRouter.get('/recent', async (req, res) => {
    const { limit = 20 } = req.query;
    const entries = await client_1.default.stockEntry.findMany({
        include: {
            product: { select: { id: true, name: true, sku: true } },
            performer: { select: { id: true, name: true } },
        },
        take: Math.min(Number(limit), 50),
        orderBy: { createdAt: 'desc' },
    });
    (0, response_1.successResponse)(res, entries, 'Recent activity retrieved');
});
//# sourceMappingURL=stock.js.map