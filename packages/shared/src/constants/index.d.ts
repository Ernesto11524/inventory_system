export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const ACCESS_TOKEN_EXPIRY = "24h";
export declare const REFRESH_TOKEN_EXPIRY = "7d";
export declare const ACCESS_TOKEN_EXPIRY_MS: number;
export declare const REFRESH_TOKEN_EXPIRY_MS: number;
export declare const AUTH_RATE_LIMIT_WINDOW_MS: number;
export declare const AUTH_RATE_LIMIT_MAX = 10;
export declare const CACHE_KEYS: {
    readonly PRODUCTS: "products";
    readonly PRODUCT: (id: string) => string;
    readonly INVENTORY: "inventory";
    readonly LOW_STOCK: "inventory:low-stock";
    readonly CATEGORIES: "categories";
    readonly DASHBOARD_METRICS: "dashboard:metrics";
    readonly STOCK_MOVEMENT: (productId: string) => string;
};
export declare const CACHE_TTL: {
    readonly SHORT: 60;
    readonly MEDIUM: 300;
    readonly LONG: 3600;
    readonly VERY_LONG: 86400;
};
export declare const STOCK_ENTRY_TYPES: readonly ["restock", "sale", "adjustment", "return"];
export declare const STOCK_TYPE_MULTIPLIER: Record<string, number>;
export declare const COMMON_UNITS: readonly ["pcs", "kg", "g", "l", "ml", "box", "pack", "bag", "can", "bottle", "roll", "pair", "set", "dozen", "carton"];
export declare const MAX_IMAGE_SIZE_MB = 5;
export declare const ALLOWED_IMAGE_TYPES: string[];
export declare const STOCK_CHECK_CRON = "0 * * * *";
export declare const REPORT_CRON = "0 8 * * 1";
export declare const SOCKET_EVENTS: {
    readonly STOCK_UPDATED: "stock:updated";
    readonly ALERT_CREATED: "alert:created";
    readonly ALERT_RESOLVED: "alert:resolved";
    readonly INVENTORY_REFRESH: "inventory:refresh";
    readonly JOIN_ROOM: "join:room";
    readonly LEAVE_ROOM: "leave:room";
};
export declare const ERROR_CODES: {
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly DUPLICATE_ENTRY: "DUPLICATE_ENTRY";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
};
//# sourceMappingURL=index.d.ts.map