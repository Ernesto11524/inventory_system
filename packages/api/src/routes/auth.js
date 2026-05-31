"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = __importDefault(require("../prisma/client"));
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const shared_1 = require("@inventory/shared");
const shared_2 = require("@inventory/shared");
exports.authRouter = (0, express_1.Router)();
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: shared_2.AUTH_RATE_LIMIT_WINDOW_MS,
    max: shared_2.AUTH_RATE_LIMIT_MAX,
    message: { success: false, data: null, message: 'Too many login attempts, please try again later', code: 'RATE_LIMITED' },
    standardHeaders: true,
    legacyHeaders: false,
});
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 */
exports.authRouter.post('/login', authLimiter, (0, validate_1.validate)(shared_1.loginSchema), async (req, res) => {
    const { email, password } = req.body;
    const user = await client_1.default.user.findUnique({ where: { email } });
    if (!user)
        throw new response_1.UnauthorizedError('Invalid email or password');
    const valid = await bcryptjs_1.default.compare(password, user.password);
    if (!valid)
        throw new response_1.UnauthorizedError('Invalid email or password');
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = (0, jwt_1.signAccessToken)(payload);
    const refreshToken = (0, jwt_1.signRefreshToken)(payload);
    // Store refresh token
    await client_1.default.session.create({
        data: {
            userId: user.id,
            refreshToken,
            expiresAt: new Date(Date.now() + shared_2.REFRESH_TOKEN_EXPIRY_MS),
        },
    });
    (0, response_1.successResponse)(res, {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
        tokens: { accessToken, refreshToken },
    }, 'Login successful');
});
/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security: []
 */
exports.authRouter.post('/refresh', (0, validate_1.validate)(shared_1.refreshTokenSchema), async (req, res) => {
    const { refreshToken } = req.body;
    const session = await client_1.default.session.findUnique({ where: { refreshToken }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
        throw new response_1.UnauthorizedError('Invalid or expired refresh token');
    }
    try {
        (0, jwt_1.verifyRefreshToken)(refreshToken);
    }
    catch {
        await client_1.default.session.delete({ where: { id: session.id } });
        throw new response_1.UnauthorizedError('Invalid refresh token');
    }
    const { user } = session;
    const payload = { userId: user.id, email: user.email, role: user.role };
    const newAccessToken = (0, jwt_1.signAccessToken)(payload);
    const newRefreshToken = (0, jwt_1.signRefreshToken)(payload);
    // Rotate refresh token
    await client_1.default.session.update({
        where: { id: session.id },
        data: {
            refreshToken: newRefreshToken,
            expiresAt: new Date(Date.now() + shared_2.REFRESH_TOKEN_EXPIRY_MS),
        },
    });
    (0, response_1.successResponse)(res, {
        tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    }, 'Token refreshed');
});
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and invalidate refresh token
 *     tags: [Auth]
 */
exports.authRouter.post('/logout', auth_1.authenticate, async (req, res) => {
    const authHeader = req.headers.authorization;
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
        await client_1.default.session.deleteMany({ where: { refreshToken } });
    }
    (0, response_1.successResponse)(res, null, 'Logged out successfully');
});
/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 */
exports.authRouter.get('/me', auth_1.authenticate, async (req, res) => {
    const user = await client_1.default.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, name: true, email: true, role: true, posBarCodeOnly: true, createdAt: true },
    });
    (0, response_1.successResponse)(res, user, 'User retrieved');
});
//# sourceMappingURL=auth.js.map