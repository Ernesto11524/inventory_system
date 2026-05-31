"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movementReportSchema = exports.dateRangeSchema = exports.paginationSchema = exports.alertResolveSchema = exports.poStatusSchema = exports.purchaseOrderSchema = exports.poItemSchema = exports.supplierSchema = exports.stockEntrySchema = exports.bulkImportRowSchema = exports.productUpdateSchema = exports.productSchema = exports.categorySchema = exports.refreshTokenSchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
// ─── Auth ─────────────────────────────────────────────────────────────────────
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Must contain at least one number'),
    role: zod_1.z.enum(['admin', 'staff']).default('staff'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
// ─── Category ─────────────────────────────────────────────────────────────────
exports.categorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Category name is required').max(100),
    description: zod_1.z.string().max(500).optional().nullable(),
});
// ─── Product ──────────────────────────────────────────────────────────────────
exports.productSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Product name is required').max(200),
    sku: zod_1.z.string().min(1, 'SKU is required').max(50).regex(/^[A-Z0-9\-_]+$/i, 'SKU can only contain letters, numbers, hyphens, and underscores'),
    barcode: zod_1.z.string().max(50).optional().nullable(),
    description: zod_1.z.string().max(1000).optional().nullable(),
    imageUrl: zod_1.z.string().url().optional().nullable(),
    categoryId: zod_1.z.string().uuid().optional().nullable(),
    price: zod_1.z.number().min(0, 'Price must be non-negative'),
    costPrice: zod_1.z.number().min(0, 'Cost price must be non-negative'),
    unit: zod_1.z.string().min(1, 'Unit is required').max(20).default('pcs'),
    minStockLevel: zod_1.z.number().int().min(0, 'Min stock level must be non-negative').default(10),
});
exports.productUpdateSchema = exports.productSchema.partial();
exports.bulkImportRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    sku: zod_1.z.string().min(1),
    barcode: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    price: zod_1.z.coerce.number().min(0),
    costPrice: zod_1.z.coerce.number().min(0),
    unit: zod_1.z.string().default('pcs'),
    minStockLevel: zod_1.z.coerce.number().int().min(0).default(10),
    initialStock: zod_1.z.coerce.number().int().min(0).default(0),
});
// ─── Stock Entry ──────────────────────────────────────────────────────────────
exports.stockEntrySchema = zod_1.z.object({
    productId: zod_1.z.string().uuid('Invalid product ID'),
    quantity: zod_1.z.number().int().min(1, 'Quantity must be at least 1'),
    type: zod_1.z.enum(['restock', 'sale', 'adjustment', 'return']),
    note: zod_1.z.string().max(500).optional().nullable(),
});
// ─── Supplier ─────────────────────────────────────────────────────────────────
exports.supplierSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Supplier name is required').max(200),
    contactName: zod_1.z.string().max(100).optional().nullable(),
    email: zod_1.z.string().email().optional().nullable(),
    phone: zod_1.z.string().max(20).optional().nullable(),
    address: zod_1.z.string().max(500).optional().nullable(),
});
// ─── Purchase Order ───────────────────────────────────────────────────────────
exports.poItemSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid('Invalid product ID'),
    quantity: zod_1.z.number().int().min(1, 'Quantity must be at least 1'),
    unitCost: zod_1.z.number().min(0, 'Unit cost must be non-negative'),
});
exports.purchaseOrderSchema = zod_1.z.object({
    supplierId: zod_1.z.string().uuid('Invalid supplier ID'),
    items: zod_1.z.array(exports.poItemSchema).min(1, 'At least one item is required'),
    note: zod_1.z.string().max(1000).optional().nullable(),
});
exports.poStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['draft', 'sent', 'received']),
});
// ─── Alert ────────────────────────────────────────────────────────────────────
exports.alertResolveSchema = zod_1.z.object({
    note: zod_1.z.string().max(500).optional(),
});
// ─── Query Params ─────────────────────────────────────────────────────────────
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.dateRangeSchema = zod_1.z.object({
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
});
exports.movementReportSchema = exports.paginationSchema.merge(exports.dateRangeSchema).extend({
    productId: zod_1.z.string().uuid().optional(),
    type: zod_1.z.enum(['restock', 'sale', 'adjustment', 'return']).optional(),
});
//# sourceMappingURL=index.js.map