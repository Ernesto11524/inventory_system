"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityRouter = void 0;
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
exports.activityRouter = (0, express_1.Router)();
exports.activityRouter.use(auth_1.authenticate);
exports.activityRouter.use(auth_1.requireAdmin);
// GET /api/activity - Get all activity logs (admin only)
exports.activityRouter.get('/', async (req, res) => {
    const { page = 1, limit = 50, userId, action, from, to } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    const where = {
        ...(userId ? { userId: String(userId) } : {}),
        ...(action ? { action: { contains: String(action) } } : {}),
        ...(from || to ? {
            createdAt: {
                ...(from ? { gte: new Date(String(from)) } : {}),
                ...(to ? { lte: new Date(String(to) + 'T23:59:59') } : {}),
            },
        } : {}),
    };
    const [logs, total] = await client_1.default.$transaction([
        client_1.default.activityLog.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        }),
        client_1.default.activityLog.count({ where }),
    ]);
    (0, response_1.successResponse)(res, logs, 'Activity logs retrieved', 200, (0, response_1.buildPagination)(pageNum, limitNum, total));
});
// GET /api/activity/workers - Worker login summary
exports.activityRouter.get('/workers', async (req, res) => {
    const { from, to } = req.query;
    const fromDate = from ? new Date(String(from)) : new Date(new Date().setHours(0, 0, 0, 0));
    const toDate = to ? new Date(String(to) + 'T23:59:59') : new Date();
    const users = await client_1.default.user.findMany({
        select: { id: true, name: true, email: true, role: true },
    });
    const workerStats = await Promise.all(users.map(async (user) => {
        const logs = await client_1.default.activityLog.findMany({
            where: {
                userId: user.id,
                createdAt: { gte: fromDate, lte: toDate },
            },
            orderBy: { createdAt: 'asc' },
        });
        const logins = logs.filter(l => l.action === 'login');
        const logouts = logs.filter(l => l.action === 'logout');
        const salesCount = logs.filter(l => l.action === 'stock_sale').length;
        const stockActions = logs.filter(l => l.action.startsWith('stock_')).length;
        return {
            user,
            logins: logins.map(l => l.createdAt),
            logouts: logouts.map(l => l.createdAt),
            lastSeen: logs.length > 0 ? logs[logs.length - 1].createdAt : null,
            salesCount,
            stockActions,
            totalActions: logs.length,
        };
    }));
    (0, response_1.successResponse)(res, workerStats, 'Worker activity retrieved');
});
// GET /api/activity/users/:userId - Specific user activity
exports.activityRouter.get('/users/:userId', async (req, res) => {
    const { userId } = req.params;
    const { from, to, page = 1, limit = 50 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;
    const where = {
        userId,
        ...(from || to ? {
            createdAt: {
                ...(from ? { gte: new Date(String(from)) } : {}),
                ...(to ? { lte: new Date(String(to) + 'T23:59:59') } : {}),
            },
        } : {}),
    };
    const [logs, total] = await client_1.default.$transaction([
        client_1.default.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        }),
        client_1.default.activityLog.count({ where }),
    ]);
    (0, response_1.successResponse)(res, logs, 'User activity retrieved', 200, (0, response_1.buildPagination)(pageNum, limitNum, total));
});
//# sourceMappingURL=activity.js.map