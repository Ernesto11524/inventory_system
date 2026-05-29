import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../prisma/client';
import { successResponse, NotFoundError, ConflictError, buildPagination } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { productSchema, productUpdateSchema, bulkImportRowSchema } from '@inventory/shared';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from '../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '@inventory/shared';
import { parse } from 'csv-parse/sync';

// Simple multer for CSV only (no cloudinary)
const upload = multer({ storage: multer.memoryStorage() });

export const productsRouter = Router();
productsRouter.use(authenticate);

// GET /api/products
productsRouter.get('/', async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search, categoryId } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
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

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: { category: true, inventory: true },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  successResponse(res, products, 'Products retrieved', 200, buildPagination(pageNum, limitNum, total));
});

// GET /api/products/barcode/:barcode
productsRouter.get('/barcode/:barcode', async (req: Request, res: Response) => {
  const { barcode } = req.params;
  const product = await prisma.product.findFirst({
    where: { barcode, deletedAt: null },
    include: { category: true, inventory: true },
  });
  if (!product) throw new NotFoundError('Product');
  successResponse(res, product, 'Product found');
});

// GET /api/products/:id
productsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const cached = await cacheGet(CACHE_KEYS.PRODUCT(id));
  if (cached) return successResponse(res, cached, 'Product retrieved');

  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: { category: true, inventory: true },
  });
  if (!product) throw new NotFoundError('Product');

  await cacheSet(CACHE_KEYS.PRODUCT(id), product, CACHE_TTL.MEDIUM);
  successResponse(res, product, 'Product retrieved');
});

// POST /api/products
productsRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  const data = productSchema.parse({
    ...req.body,
    price: Number(req.body.price),
    costPrice: req.body.costPrice !== undefined && req.body.costPrice !== '' ? Number(req.body.costPrice) : 0,
    minStockLevel: Number(req.body.minStockLevel || 10),
  });

  const existing = await prisma.product.findFirst({ where: { sku: data.sku } });
  if (existing) throw new ConflictError(`Product with SKU "${data.sku}" already exists`);

  const product = await prisma.product.create({
    data: data as any,
    include: { category: true, inventory: true },
  });

  await cacheDel(CACHE_KEYS.PRODUCTS);
  successResponse(res, product, 'Product created', 201);
});

// PUT /api/products/:id
productsRouter.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError('Product');

  const data = productUpdateSchema.parse({
    ...req.body,
    ...(req.body.price !== undefined && { price: Number(req.body.price) }),
    ...(req.body.costPrice !== undefined && { costPrice: Number(req.body.costPrice) }),
    ...(req.body.minStockLevel !== undefined && { minStockLevel: Number(req.body.minStockLevel) }),
  });

  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: true, inventory: true },
  });

  await cacheDel(CACHE_KEYS.PRODUCT(id));
  await cacheDel(CACHE_KEYS.PRODUCTS);
  successResponse(res, product, 'Product updated');
});

// DELETE /api/products/:id (soft delete)
productsRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!product) throw new NotFoundError('Product');

  await prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });

  await cacheDel(CACHE_KEYS.PRODUCT(id));
  await cacheDel(CACHE_KEYS.PRODUCTS);
  successResponse(res, null, 'Product deleted');
});

// POST /api/products/bulk-import
productsRouter.post('/bulk-import', requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) throw new Error('CSV file is required');

  const content = req.file.buffer.toString('utf-8');
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  const results = { created: 0, failed: 0, errors: [] as string[] };

  for (const [index, row] of rows.entries()) {
    try {
      const data = bulkImportRowSchema.parse(row);

      let categoryId: string | undefined;
      if (data.category) {
        const cat = await prisma.category.upsert({
          where: { name: data.category },
          update: {},
          create: { name: data.category },
        });
        categoryId = cat.id;
      }

      const product = await prisma.product.upsert({
        where: { sku: data.sku },
        update: { name: data.name, price: data.price, costPrice: data.costPrice, minStockLevel: data.minStockLevel, categoryId },
        create: { name: data.name, sku: data.sku, barcode: data.barcode, price: data.price, costPrice: data.costPrice, unit: data.unit, minStockLevel: data.minStockLevel, categoryId },
      });

      if (data.initialStock > 0) {
        await prisma.stockEntry.create({
          data: { productId: product.id, quantity: data.initialStock, type: 'restock', note: 'Bulk import', performedBy: req.user!.userId },
        });
        await prisma.inventory.upsert({
          where: { productId: product.id },
          update: { currentStock: { increment: data.initialStock } },
          create: { productId: product.id, currentStock: data.initialStock },
        });
      }

      results.created++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`Row ${index + 2}: ${err.message}`);
    }
  }

  await cacheDelPattern('products*');
  successResponse(res, results, `Bulk import complete: ${results.created} created, ${results.failed} failed`);
});
