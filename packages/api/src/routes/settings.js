"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRouter = void 0;
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
exports.settingsRouter = (0, express_1.Router)();
exports.settingsRouter.use(auth_1.authenticate);
async function getOrCreate() {
    let s = await client_1.default.appSettings.findUnique({ where: { id: 'singleton' } });
    if (!s)
        s = await client_1.default.appSettings.create({ data: { id: 'singleton' } });
    return s;
}
/**
 * GET /api/settings
 * Returns public settings for all authenticated users.
 * Admins also receive hasSecretKey indicator.
 */
exports.settingsRouter.get('/', async (req, res) => {
    const settings = await getOrCreate();
    const { paystackSecretKey, ...pub } = settings;
    const payload = req.user.role === 'admin'
        ? { ...pub, hasSecretKey: !!paystackSecretKey }
        : pub;
    (0, response_1.successResponse)(res, payload, 'Settings retrieved');
});
/**
 * PATCH /api/settings
 * Admin-only. Updates store settings (upserts the singleton row).
 */
exports.settingsRouter.patch('/', auth_1.requireAdmin, async (req, res) => {
    const allowed = [
        'storeName', 'storeTagline', 'storeLogo', 'storeEmail',
        'storePhone', 'storeAddress', 'currency', 'currencySymbol',
        'paystackPublicKey', 'paystackSecretKey',
    ];
    const data = {};
    for (const field of allowed) {
        if (req.body[field] !== undefined) {
            // Treat empty string as null for optional fields
            data[field] = req.body[field] === '' ? null : req.body[field];
        }
    }
    const settings = await client_1.default.appSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...data },
        update: data,
    });
    const { paystackSecretKey, ...pub } = settings;
    (0, response_1.successResponse)(res, { ...pub, hasSecretKey: !!paystackSecretKey }, 'Settings updated');
});
//# sourceMappingURL=settings.js.map