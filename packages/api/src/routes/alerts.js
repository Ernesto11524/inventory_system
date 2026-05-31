"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertsRouter = void 0;
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const index_1 = require("../index");
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const socketService_1 = require("../services/socketService");
exports.alertsRouter = (0, express_1.Router)();
exports.alertsRouter.use(auth_1.authenticate);
exports.alertsRouter.get('/', async (req, res) => {
    const { page = 1, limit = 20, resolved, type } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    const where = {
        ...(resolved !== undefined ? { resolved: resolved === 'true' } : {}),
        ...(type ? { type: String(type) } : {}),
    };
    const [alerts, total] = await client_1.default.$transaction([
        client_1.default.alert.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, sku: true, imageUrl: true } },
            },
            skip,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
        }),
        client_1.default.alert.count({ where }),
    ]);
    (0, response_1.successResponse)(res, alerts, 'Alerts retrieved', 200, (0, response_1.buildPagination)(pageNum, limitNum, total));
});
exports.alertsRouter.patch('/:id/resolve', async (req, res) => {
    const { id } = req.params;
    const alert = await client_1.default.alert.findUnique({ where: { id } });
    if (!alert)
        throw new response_1.NotFoundError('Alert');
    await client_1.default.alert.update({ where: { id }, data: { resolved: true } });
    if (index_1.io)
        (0, socketService_1.emitAlertResolved)(index_1.io, { alertId: id });
    (0, response_1.successResponse)(res, null, 'Alert resolved');
});
exports.alertsRouter.get('/unresolved-count', async (_req, res) => {
    const count = await client_1.default.alert.count({ where: { resolved: false } });
    (0, response_1.successResponse)(res, { count }, 'Unresolved alert count');
});
//# sourceMappingURL=alerts.js.map