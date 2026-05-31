"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesRouter = void 0;
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const activityLog_1 = require("../utils/activityLog");
const index_1 = require("../index");
const socketService_1 = require("../services/socketService");
exports.salesRouter = (0, express_1.Router)();
exports.salesRouter.use(auth_1.authenticate);
// POST /api/sales - Create a new sale
exports.salesRouter.post('/', async (req, res) => {
    const { items, customerName, customerPhone, paymentMethod, subtotal, discount, total, amountPaid, change, note, } = req.body;
    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No items in sale' });
    }
    // Generate receipt number
    const receiptNo = `RCP-${Date.now().toString(36).toUpperCase()}`;
    // Create sale and stock entries in a transaction
    const sale = await client_1.default.$transaction(async (tx) => {
        // Create the sale record
        const newSale = await tx.sale.create({
            data: {
                receiptNo,
                customerName: customerName || null,
                customerPhone: customerPhone || null,
                paymentMethod: paymentMethod || 'cash',
                subtotal: Number(subtotal),
                discount: Number(discount || 0),
                total: Number(total),
                amountPaid: Number(amountPaid || total),
                change: Number(change || 0),
                note: note || null,
                cashierId: req.user.userId,
                items: {
                    create: items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: Number(item.price),
                        costPrice: Number(item.costPrice || 0),
                        subtotal: item.quantity * Number(item.price),
                    })),
                },
            },
            include: {
                items: { include: { product: { select: { name: true, sku: true } } } },
                cashier: { select: { name: true } },
            },
        });
        // Create stock entries and update inventory for each item
        for (const item of items) {
            await tx.stockEntry.create({
                data: {
                    productId: item.productId,
                    quantity: item.quantity,
                    type: 'sale',
                    note: `POS Sale - Receipt ${receiptNo}`,
                    performedBy: req.user.userId,
                },
            });
            await tx.inventory.upsert({
                where: { productId: item.productId },
                update: { currentStock: { decrement: item.quantity } },
                create: { productId: item.productId, currentStock: -item.quantity },
            });
        }
        return newSale;
    });
    // Log activity
    await (0, activityLog_1.logActivity)(req.user.userId, 'stock_sale', `POS Sale ${receiptNo} - ${items.length} items - Total: GH₵${total}`, req.ip);
    // Emit real-time update
    if (index_1.io) {
        (0, socketService_1.emitStockUpdate)(index_1.io, { saleId: sale.id });
    }
    (0, response_1.successResponse)(res, sale, 'Sale completed', 201);
});
// GET /api/sales - Get all sales
exports.salesRouter.get('/', async (req, res) => {
    const { page = 1, limit = 20, from, to, cashierId, paymentMethod } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    const where = {
        ...(cashierId ? { cashierId: String(cashierId) } : {}),
        ...(paymentMethod ? { paymentMethod: String(paymentMethod) } : {}),
        ...(from || to ? {
            createdAt: {
                ...(from ? { gte: new Date(String(from)) } : {}),
                ...(to ? { lte: new Date(String(to) + 'T23:59:59') } : {}),
            },
        } : {}),
    };
    const [sales, total] = await client_1.default.$transaction([
        client_1.default.sale.findMany({
            where,
            include: {
                items: {
                    include: { product: { select: { name: true, sku: true, unit: true } } },
                },
                cashier: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        }),
        client_1.default.sale.count({ where }),
    ]);
    (0, response_1.successResponse)(res, sales, 'Sales retrieved', 200, (0, response_1.buildPagination)(pageNum, limitNum, total));
});
// GET /api/sales/:id - Get single sale
exports.salesRouter.get('/:id', async (req, res) => {
    const { id } = req.params;
    const sale = await client_1.default.sale.findUnique({
        where: { id },
        include: {
            items: {
                include: { product: { select: { name: true, sku: true, unit: true, price: true } } },
            },
            cashier: { select: { id: true, name: true } },
        },
    });
    if (!sale)
        return res.status(404).json({ message: 'Sale not found' });
    (0, response_1.successResponse)(res, sale, 'Sale retrieved');
});
// GET /api/sales/summary/today - Today's summary
exports.salesRouter.get('/summary/today', async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sales = await client_1.default.sale.findMany({
        where: { createdAt: { gte: today, lt: tomorrow } },
        include: { items: true },
    });
    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    const totalTransactions = sales.length;
    const totalItems = sales.reduce((s, sale) => s + sale.items.reduce((si, item) => si + item.quantity, 0), 0);
    const totalProfit = sales.reduce((s, sale) => s + sale.items.reduce((si, item) => si + (item.quantity * (item.unitPrice - item.costPrice)), 0), 0);
    const byPaymentMethod = {};
    for (const sale of sales) {
        byPaymentMethod[sale.paymentMethod] = (byPaymentMethod[sale.paymentMethod] || 0) + sale.total;
    }
    (0, response_1.successResponse)(res, {
        totalRevenue,
        totalTransactions,
        totalItems,
        totalProfit,
        byPaymentMethod,
    }, 'Today summary retrieved');
});
//# sourceMappingURL=sales.js.map