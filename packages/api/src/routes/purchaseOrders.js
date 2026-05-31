"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseOrdersRouter = void 0;
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@inventory/shared");
exports.purchaseOrdersRouter = (0, express_1.Router)();
exports.purchaseOrdersRouter.use(auth_1.authenticate);
exports.purchaseOrdersRouter.get('/', async (req, res) => {
    const { page = 1, limit = 20, status, supplierId } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    const where = {
        ...(status ? { status: String(status) } : {}),
        ...(supplierId ? { supplierId: String(supplierId) } : {}),
    };
    const [orders, total] = await client_1.default.$transaction([
        client_1.default.purchaseOrder.findMany({
            where,
            include: {
                supplier: true,
                items: {
                    include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
                },
            },
            skip,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
        }),
        client_1.default.purchaseOrder.count({ where }),
    ]);
    (0, response_1.successResponse)(res, orders, 'Purchase orders retrieved', 200, (0, response_1.buildPagination)(pageNum, limitNum, total));
});
exports.purchaseOrdersRouter.get('/:id', async (req, res) => {
    const order = await client_1.default.purchaseOrder.findUnique({
        where: { id: req.params.id },
        include: {
            supplier: true,
            items: {
                include: { product: { select: { id: true, name: true, sku: true, unit: true, imageUrl: true } } },
            },
        },
    });
    if (!order)
        throw new response_1.NotFoundError('Purchase order');
    (0, response_1.successResponse)(res, order, 'Purchase order retrieved');
});
exports.purchaseOrdersRouter.post('/', auth_1.requireAdmin, (0, validate_1.validate)(shared_1.purchaseOrderSchema), async (req, res) => {
    const { supplierId, items, note } = req.body;
    const order = await client_1.default.purchaseOrder.create({
        data: {
            supplierId,
            note,
            items: {
                create: items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                })),
            },
        },
        include: {
            supplier: true,
            items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        },
    });
    (0, response_1.successResponse)(res, order, 'Purchase order created', 201);
});
exports.purchaseOrdersRouter.patch('/:id/status', auth_1.requireAdmin, (0, validate_1.validate)(shared_1.poStatusSchema), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const order = await client_1.default.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!order)
        throw new response_1.NotFoundError('Purchase order');
    // Validate status transitions
    const validTransitions = {
        draft: ['sent'],
        sent: ['received'],
        received: [],
    };
    if (!validTransitions[order.status].includes(status)) {
        throw new response_1.AppError(`Cannot transition from ${order.status} to ${status}`, 400);
    }
    const updatedOrder = await client_1.default.purchaseOrder.update({
        where: { id },
        data: { status },
        include: { supplier: true, items: { include: { product: true } } },
    });
    // On "received", generate restock stock entries
    if (status === 'received') {
        for (const item of order.items) {
            await client_1.default.stockEntry.create({
                data: {
                    productId: item.productId,
                    quantity: item.quantity,
                    type: 'restock',
                    note: `Auto-restock from PO #${id.slice(-8).toUpperCase()}`,
                    performedBy: req.user.userId,
                },
            });
            await client_1.default.inventory.upsert({
                where: { productId: item.productId },
                update: { currentStock: { increment: item.quantity } },
                create: { productId: item.productId, currentStock: item.quantity },
            });
            // Auto-resolve any related alerts
            await client_1.default.alert.updateMany({
                where: { productId: item.productId, resolved: false },
                data: { resolved: true },
            });
        }
    }
    (0, response_1.successResponse)(res, updatedOrder, `Purchase order marked as ${status}`);
});
//# sourceMappingURL=purchaseOrders.js.map