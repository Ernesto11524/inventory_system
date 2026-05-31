import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const registerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["admin", "staff"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
    role: "admin" | "staff";
}, {
    name: string;
    email: string;
    password: string;
    role?: "admin" | "staff" | undefined;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const categorySchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | null | undefined;
}, {
    name: string;
    description?: string | null | undefined;
}>;
export declare const productSchema: z.ZodObject<{
    name: z.ZodString;
    sku: z.ZodString;
    barcode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    imageUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    categoryId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    price: z.ZodNumber;
    costPrice: z.ZodNumber;
    unit: z.ZodDefault<z.ZodString>;
    minStockLevel: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    unit: string;
    sku: string;
    price: number;
    costPrice: number;
    minStockLevel: number;
    description?: string | null | undefined;
    barcode?: string | null | undefined;
    imageUrl?: string | null | undefined;
    categoryId?: string | null | undefined;
}, {
    name: string;
    sku: string;
    price: number;
    costPrice: number;
    description?: string | null | undefined;
    unit?: string | undefined;
    barcode?: string | null | undefined;
    imageUrl?: string | null | undefined;
    categoryId?: string | null | undefined;
    minStockLevel?: number | undefined;
}>;
export declare const productUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    sku: z.ZodOptional<z.ZodString>;
    barcode: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    imageUrl: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    categoryId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    price: z.ZodOptional<z.ZodNumber>;
    costPrice: z.ZodOptional<z.ZodNumber>;
    unit: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    minStockLevel: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | null | undefined;
    unit?: string | undefined;
    sku?: string | undefined;
    barcode?: string | null | undefined;
    imageUrl?: string | null | undefined;
    categoryId?: string | null | undefined;
    price?: number | undefined;
    costPrice?: number | undefined;
    minStockLevel?: number | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
    unit?: string | undefined;
    sku?: string | undefined;
    barcode?: string | null | undefined;
    imageUrl?: string | null | undefined;
    categoryId?: string | null | undefined;
    price?: number | undefined;
    costPrice?: number | undefined;
    minStockLevel?: number | undefined;
}>;
export declare const bulkImportRowSchema: z.ZodObject<{
    name: z.ZodString;
    sku: z.ZodString;
    barcode: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    price: z.ZodNumber;
    costPrice: z.ZodNumber;
    unit: z.ZodDefault<z.ZodString>;
    minStockLevel: z.ZodDefault<z.ZodNumber>;
    initialStock: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    unit: string;
    sku: string;
    price: number;
    costPrice: number;
    minStockLevel: number;
    initialStock: number;
    barcode?: string | undefined;
    category?: string | undefined;
}, {
    name: string;
    sku: string;
    price: number;
    costPrice: number;
    unit?: string | undefined;
    barcode?: string | undefined;
    category?: string | undefined;
    minStockLevel?: number | undefined;
    initialStock?: number | undefined;
}>;
export declare const stockEntrySchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
    type: z.ZodEnum<["restock", "sale", "adjustment", "return"]>;
    note: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "sale" | "restock" | "adjustment" | "return";
    productId: string;
    quantity: number;
    note?: string | null | undefined;
}, {
    type: "sale" | "restock" | "adjustment" | "return";
    productId: string;
    quantity: number;
    note?: string | null | undefined;
}>;
export declare const supplierSchema: z.ZodObject<{
    name: z.ZodString;
    contactName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    address?: string | null | undefined;
    email?: string | null | undefined;
    contactName?: string | null | undefined;
    phone?: string | null | undefined;
}, {
    name: string;
    address?: string | null | undefined;
    email?: string | null | undefined;
    contactName?: string | null | undefined;
    phone?: string | null | undefined;
}>;
export declare const poItemSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
    unitCost: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    productId: string;
    quantity: number;
    unitCost: number;
}, {
    productId: string;
    quantity: number;
    unitCost: number;
}>;
export declare const purchaseOrderSchema: z.ZodObject<{
    supplierId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
        unitCost: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        productId: string;
        quantity: number;
        unitCost: number;
    }, {
        productId: string;
        quantity: number;
        unitCost: number;
    }>, "many">;
    note: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    supplierId: string;
    items: {
        productId: string;
        quantity: number;
        unitCost: number;
    }[];
    note?: string | null | undefined;
}, {
    supplierId: string;
    items: {
        productId: string;
        quantity: number;
        unitCost: number;
    }[];
    note?: string | null | undefined;
}>;
export declare const poStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["draft", "sent", "received"]>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "sent" | "received";
}, {
    status: "draft" | "sent" | "received";
}>;
export declare const alertResolveSchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const dateRangeSchema: z.ZodObject<{
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    from?: string | undefined;
    to?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
}>;
export declare const movementReportSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
} & {
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
} & {
    productId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["restock", "sale", "adjustment", "return"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    type?: "sale" | "restock" | "adjustment" | "return" | undefined;
    productId?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    type?: "sale" | "restock" | "adjustment" | "return" | undefined;
    productId?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    from?: string | undefined;
    to?: string | undefined;
}>;
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
//# sourceMappingURL=index.d.ts.map