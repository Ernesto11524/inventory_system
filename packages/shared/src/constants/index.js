"use strict";
// ─── Pagination ───────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.SOCKET_EVENTS = exports.REPORT_CRON = exports.STOCK_CHECK_CRON = exports.ALLOWED_IMAGE_TYPES = exports.MAX_IMAGE_SIZE_MB = exports.COMMON_UNITS = exports.STOCK_TYPE_MULTIPLIER = exports.STOCK_ENTRY_TYPES = exports.CACHE_TTL = exports.CACHE_KEYS = exports.AUTH_RATE_LIMIT_MAX = exports.AUTH_RATE_LIMIT_WINDOW_MS = exports.REFRESH_TOKEN_EXPIRY_MS = exports.ACCESS_TOKEN_EXPIRY_MS = exports.REFRESH_TOKEN_EXPIRY = exports.ACCESS_TOKEN_EXPIRY = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = void 0;
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
// ─── Auth ─────────────────────────────────────────────────────────────────────
exports.ACCESS_TOKEN_EXPIRY = '24h';
exports.REFRESH_TOKEN_EXPIRY = '7d';
exports.ACCESS_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;
exports.REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
// ─── Rate Limiting ────────────────────────────────────────────────────────────
exports.AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
exports.AUTH_RATE_LIMIT_MAX = 10; // 10 attempts per window
// ─── Cache Keys ───────────────────────────────────────────────────────────────
exports.CACHE_KEYS = {
    PRODUCTS: 'products',
    PRODUCT: (id) => `product:${id}`,
    INVENTORY: 'inventory',
    LOW_STOCK: 'inventory:low-stock',
    CATEGORIES: 'categories',
    DASHBOARD_METRICS: 'dashboard:metrics',
    STOCK_MOVEMENT: (productId) => `stock:history:${productId}`,
};
exports.CACHE_TTL = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
};
// ─── Stock ────────────────────────────────────────────────────────────────────
exports.STOCK_ENTRY_TYPES = ['restock', 'sale', 'adjustment', 'return'];
exports.STOCK_TYPE_MULTIPLIER = {
    restock: 1,
    return: 1,
    sale: -1,
    adjustment: 1, // can be negative if quantity is negative
};
// ─── Units ────────────────────────────────────────────────────────────────────
exports.COMMON_UNITS = [
    'pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'bag', 'can',
    'bottle', 'roll', 'pair', 'set', 'dozen', 'carton',
];
// ─── File Upload ──────────────────────────────────────────────────────────────
exports.MAX_IMAGE_SIZE_MB = 5;
exports.ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// ─── Cron ─────────────────────────────────────────────────────────────────────
exports.STOCK_CHECK_CRON = '0 * * * *'; // Every hour
exports.REPORT_CRON = '0 8 * * 1'; // Every Monday at 8am
// ─── Socket Events ────────────────────────────────────────────────────────────
exports.SOCKET_EVENTS = {
    STOCK_UPDATED: 'stock:updated',
    ALERT_CREATED: 'alert:created',
    ALERT_RESOLVED: 'alert:resolved',
    INVENTORY_REFRESH: 'inventory:refresh',
    JOIN_ROOM: 'join:room',
    LEAVE_ROOM: 'leave:room',
};
// ─── Error Codes ──────────────────────────────────────────────────────────────
exports.ERROR_CODES = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMITED: 'RATE_LIMITED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
};
//# sourceMappingURL=index.js.map