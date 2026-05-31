import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  role: z.enum(['admin', 'staff']).default('staff'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ─── Category ─────────────────────────────────────────────────────────────────

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional().nullable(),
});

// ─── Product ──────────────────────────────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  sku: z.string().min(1, 'SKU is required').max(50).regex(/^[A-Z0-9\-_]+$/i, 'SKU can only contain letters, numbers, hyphens, and underscores'),
  barcode: z.string().max(50).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  price: z.number().min(0, 'Price must be non-negative'),
  costPrice: z.number().min(0, 'Cost price must be non-negative').optional().default(0),
  unit: z.string().min(1, 'Unit is required').max(20).default('pcs'),
  minStockLevel: z.number().int().min(0, 'Min stock level must be non-negative').default(10),
});

export const productUpdateSchema = productSchema.partial();

export const bulkImportRowSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  unit: z.string().default('pcs'),
  minStockLevel: z.coerce.number().int().min(0).default(10),
  initialStock: z.coerce.number().int().min(0).default(0),
});

// ─── Stock Entry ──────────────────────────────────────────────────────────────

export const stockEntrySchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  type: z.enum(['restock', 'sale', 'adjustment', 'return']),
  note: z.string().max(500).optional().nullable(),
});

// ─── Supplier ─────────────────────────────────────────────────────────────────

export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(200),
  contactName: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

// ─── Purchase Order ───────────────────────────────────────────────────────────

export const poItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitCost: z.number().min(0, 'Unit cost must be non-negative'),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
  items: z.array(poItemSchema).min(1, 'At least one item is required'),
  note: z.string().max(1000).optional().nullable(),
});

export const poStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'received']),
});

// ─── Alert ────────────────────────────────────────────────────────────────────

export const alertResolveSchema = z.object({
  note: z.string().max(500).optional(),
});

// ─── Query Params ─────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const movementReportSchema = paginationSchema.merge(dateRangeSchema).extend({
  productId: z.string().uuid().optional(),
  type: z.enum(['restock', 'sale', 'adjustment', 'return']).optional(),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type StockEntryInput = z.infer<typeof stockEntrySchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type POStatusInput = z.infer<typeof poStatusSchema>;
export type BulkImportRow = z.infer<typeof bulkImportRowSchema>;
export type MovementReportParams = z.infer<typeof movementReportSchema>;
