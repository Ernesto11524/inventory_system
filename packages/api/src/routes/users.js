"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = __importDefault(require("../prisma/client"));
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@inventory/shared");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.use(auth_1.authenticate);
exports.usersRouter.get('/', auth_1.requireAdmin, async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    const [users, total] = await client_1.default.$transaction([
        client_1.default.user.findMany({
            select: { id: true, name: true, email: true, role: true, createdAt: true },
            skip,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
        }),
        client_1.default.user.count(),
    ]);
    (0, response_1.successResponse)(res, users, 'Users retrieved', 200, (0, response_1.buildPagination)(pageNum, limitNum, total));
});
exports.usersRouter.post('/', auth_1.requireAdmin, (0, validate_1.validate)(shared_1.registerSchema), async (req, res) => {
    const { name, email, password, role } = req.body;
    const hashed = await bcryptjs_1.default.hash(password, 12);
    const user = await client_1.default.user.create({
        data: { name, email, password: hashed, role },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    (0, response_1.successResponse)(res, user, 'User created', 201);
});
exports.usersRouter.delete('/:id', auth_1.requireAdmin, async (req, res) => {
    const { id } = req.params;
    if (id === req.user.userId)
        throw new Error('Cannot delete your own account');
    const user = await client_1.default.user.findUnique({ where: { id } });
    if (!user)
        throw new response_1.NotFoundError('User');
    await client_1.default.user.delete({ where: { id } });
    (0, response_1.successResponse)(res, null, 'User deleted');
});
/**
 * POST /api/users/push-token
 * Register Expo push token for current user (mobile notifications)
 */
exports.usersRouter.post('/push-token', async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
        return (0, response_1.successResponse)(res, null, 'Push token skipped (no token provided)');
    }
    // Store token in a JSON field on user — or log it for now.
    // In production you'd persist this to send targeted pushes.
    // For now we acknowledge receipt so the mobile app doesn't error.
    console.log(`[PUSH] Token registered for user ${req.user.userId}: ${token.slice(0, 30)}…`);
    (0, response_1.successResponse)(res, { registered: true }, 'Push token registered');
});
/**
 * PATCH /api/users/:id/pos-settings
 * Toggle barcode-only mode for a user (admin only)
 */
exports.usersRouter.patch('/:id/pos-settings', auth_1.requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { posBarCodeOnly } = req.body;
    const user = await client_1.default.user.findUnique({ where: { id } });
    if (!user)
        throw new response_1.NotFoundError('User');
    const updated = await client_1.default.user.update({
        where: { id },
        data: { posBarCodeOnly: Boolean(posBarCodeOnly) },
        select: { id: true, name: true, email: true, role: true, posBarCodeOnly: true },
    });
    (0, response_1.successResponse)(res, updated, `POS barcode mode ${posBarCodeOnly ? 'enabled' : 'disabled'} for ${user.name}`);
});
/**
 * POST /api/users
 * Create a new user (admin only)
 */
exports.usersRouter.post('/', auth_1.requireAdmin, async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
        throw new Error('Name, email and password are required');
    const existing = await client_1.default.user.findUnique({ where: { email } });
    if (existing)
        throw new Error('Email already in use');
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const user = await client_1.default.user.create({
        data: { name, email, password: hashed, role: role || 'staff' },
        select: { id: true, name: true, email: true, role: true, posBarCodeOnly: true, createdAt: true },
    });
    (0, response_1.successResponse)(res, user, 'User created', 201);
});
//# sourceMappingURL=users.js.map