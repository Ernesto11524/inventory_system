"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const client_1 = __importDefault(require("../prisma/client"));
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const shared_1 = require("@inventory/shared");
const cache_1 = require("../utils/cache");
const shared_2 = require("@inventory/shared");
const sync_1 = require("csv-parse/sync");
// Simple multer for CSV only (no cloudinary)
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
exports.productsRouter = (0, express_1.Router)();
exports.productsRouter.use(auth_1.authenticate);
// GET /api/products
exports.productsRouter.get('/', async (req, res) => {
    const { page = 1, limit = 20, search, categoryId } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    const where = {
        deletedAt: null,
        ...(search ? {
            OR: [
                { name: { contains: String(search), mode: 'insensitive' } },
                { sku: { contains: String(search), mode: 'insensitive' } },
                { barcode: { contains: String(search), mode: 'insensitive' } },
            ],
        } : {}),
        ...(categoryId ? { categoryId: String(categoryId) } : {}),
    };
    const [products, total] = await client_1.default.$transaction([
        client_1.default.product.findMany({
            where,
            include: { category: true, inventory: true },
            skip,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
        }),
        client_1.default.product.count({ where }),
    ]);
    (0, response_1.successResponse)(res, products, 'Products retrieved', 200, (0, response_1.buildPagination)(pageNum, limitNum, total));
});
// GET /api/products/barcode/:barcode
exports.productsRouter.get('/barcode/:barcode', async (req, res) => {
    const { barcode } = req.params;
    const product = await client_1.default.product.findFirst({
        where: { barcode, deletedAt: null },
        include: { category: true, inventory: true },
    });
    if (!product)
        throw new response_1.NotFoundError('Product');
    (0, response_1.successResponse)(res, product, 'Product found');
});
// GET /api/products/:id
exports.productsRouter.get('/:id', async (req, res) => {
    const { id } = req.params;
    const cached = await (0, cache_1.cacheGet)(shared_2.CACHE_KEYS.PRODUCT(id));
    if (cached)
        return (0, response_1.successResponse)(res, cached, 'Product retrieved');
    const product = await client_1.default.product.findFirst({
        where: { id, deletedAt: null },
        include: { category: true, inventory: true },
    });
    if (!product)
        throw new response_1.NotFoundError('Product');
    await (0, cache_1.cacheSet)(shared_2.CACHE_KEYS.PRODUCT(id), product, shared_2.CACHE_TTL.MEDIUM);
    (0, response_1.successResponse)(res, product, 'Product retrieved');
});
// POST /api/products
exports.productsRouter.post('/', auth_1.requireAdmin, async (req, res) => {
    const data = shared_1.productSchema.parse({
        ...req.body,
        price: Number(req.body.price),
        costPrice: req.body.costPrice !== undefined && req.body.costPrice !== '' ? Number(req.body.costPrice) : 0,
        minStockLevel: Number(req.body.minStockLevel || 10),
    });
    const existing = await client_1.default.product.findFirst({ where: { sku: data.sku } });
    if (existing)
        throw new response_1.ConflictError(`Product with SKU "${data.sku}" already exists`);
    const product = await client_1.default.product.create({
        data: data,
        include: { category: true, inventory: true },
    });
    await (0, cache_1.cacheDel)(shared_2.CACHE_KEYS.PRODUCTS);
    (0, response_1.successResponse)(res, product, 'Product created', 201);
});
// PUT /api/products/:id
exports.productsRouter.put('/:id', auth_1.requireAdmin, async (req, res) => {
    const { id } = req.params;
    const existing = await client_1.default.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing)
        throw new response_1.NotFoundError('Product');
    const data = shared_1.productUpdateSchema.parse({
        ...req.body,
        ...(req.body.price !== undefined && { price: Number(req.body.price) }),
        ...(req.body.costPrice !== undefined && { costPrice: Number(req.body.costPrice) }),
        ...(req.body.minStockLevel !== undefined && { minStockLevel: Number(req.body.minStockLevel) }),
    });
    const product = await client_1.default.product.update({
        where: { id },
        data,
        include: { category: true, inventory: true },
    });
    await (0, cache_1.cacheDel)(shared_2.CACHE_KEYS.PRODUCT(id));
    await (0, cache_1.cacheDel)(shared_2.CACHE_KEYS.PRODUCTS);
    (0, response_1.successResponse)(res, product, 'Product updated');
});
// DELETE /api/products/:id (soft delete)
exports.productsRouter.delete('/:id', auth_1.requireAdmin, async (req, res) => {
    const { id } = req.params;
    const product = await client_1.default.product.findFirst({ where: { id, deletedAt: null } });
    if (!product)
        throw new response_1.NotFoundError('Product');
    await client_1.default.product.update({ where: { id }, data: { deletedAt: new Date() } });
    await (0, cache_1.cacheDel)(shared_2.CACHE_KEYS.PRODUCT(id));
    await (0, cache_1.cacheDel)(shared_2.CACHE_KEYS.PRODUCTS);
    (0, response_1.successResponse)(res, null, 'Product deleted');
});
// POST /api/products/bulk-import
exports.productsRouter.post('/bulk-import', auth_1.requireAdmin, upload.single('file'), async (req, res) => {
    if (!req.file)
        throw new Error('CSV file is required');
    const content = req.file.buffer.toString('utf-8');
    const rows = (0, sync_1.parse)(content, { columns: true, skip_empty_lines: true, trim: true });
    const results = { created: 0, failed: 0, errors: [] };
    for (const [index, row] of rows.entries()) {
        try {
            const data = shared_1.bulkImportRowSchema.parse(row);
            let categoryId;
            if (data.category) {
                const cat = await client_1.default.category.upsert({
                    where: { name: data.category },
                    update: {},
                    create: { name: data.category },
                });
                categoryId = cat.id;
            }
            const product = await client_1.default.product.upsert({
                where: { sku: data.sku },
                update: { name: data.name, price: data.price, costPrice: data.costPrice, minStockLevel: data.minStockLevel, categoryId },
                create: { name: data.name, sku: data.sku, barcode: data.barcode, price: data.price, costPrice: data.costPrice, unit: data.unit, minStockLevel: data.minStockLevel, categoryId },
            });
            if (data.initialStock > 0) {
                await client_1.default.stockEntry.create({
                    data: { productId: product.id, quantity: data.initialStock, type: 'restock', note: 'Bulk import', performedBy: req.user.userId },
                });
                await client_1.default.inventory.upsert({
                    where: { productId: product.id },
                    update: { currentStock: { increment: data.initialStock } },
                    create: { productId: product.id, currentStock: data.initialStock },
                });
            }
            results.created++;
        }
        catch (err) {
            results.failed++;
            results.errors.push(`Row ${index + 2}: ${err.message}`);
        }
    }
    await (0, cache_1.cacheDelPattern)('products*');
    (0, response_1.successResponse)(res, results, `Bulk import complete: ${results.created} created, ${results.failed} failed`);
});
//# sourceMappingURL=products.js.map