// ─── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const ACCESS_TOKEN_EXPIRY = '24h';
export const REFRESH_TOKEN_EXPIRY = '7d';
export const ACCESS_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const AUTH_RATE_LIMIT_MAX = 10; // 10 attempts per window

// ─── Cache Keys ───────────────────────────────────────────────────────────────

export const CACHE_KEYS = {
  PRODUCTS: 'products',
  PRODUCT: (id: string) => `product:${id}`,
  INVENTORY: 'inventory',
  LOW_STOCK: 'inventory:low-stock',
  CATEGORIES: 'categories',
  DASHBOARD_METRICS: 'dashboard:metrics',
  STOCK_MOVEMENT: (productId: string) => `stock:history:${productId}`,
} as const;

export const CACHE_TTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// ─── Stock ────────────────────────────────────────────────────────────────────

export const STOCK_ENTRY_TYPES = ['restock', 'sale', 'adjustment', 'return'] as const;

export const STOCK_TYPE_MULTIPLIER: Record<string, number> = {
  restock: 1,
  return: 1,
  sale: -1,
  adjustment: 1, // can be negative if quantity is negative
};

// ─── Units ────────────────────────────────────────────────────────────────────

export const COMMON_UNITS = [
  'pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'bag', 'can',
  'bottle', 'roll', 'pair', 'set', 'dozen', 'carton',
] as const;

// ─── File Upload ──────────────────────────────────────────────────────────────

export const MAX_IMAGE_SIZE_MB = 5;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ─── Cron ─────────────────────────────────────────────────────────────────────

export const STOCK_CHECK_CRON = '0 * * * *'; // Every hour
export const REPORT_CRON = '0 8 * * 1'; // Every Monday at 8am

// ─── Socket Events ────────────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  STOCK_UPDATED: 'stock:updated',
  ALERT_CREATED: 'alert:created',
  ALERT_RESOLVED: 'alert:resolved',
  INVENTORY_REFRESH: 'inventory:refresh',
  JOIN_ROOM: 'join:room',
  LEAVE_ROOM: 'leave:room',
} as const;

// ─── Error Codes ──────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
} as const;
