import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { successResponse, NotFoundError, buildPagination } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { supplierSchema } from '@inventory/shared';

export const suppliersRouter = Router();
suppliersRouter.use(authenticate);

suppliersRouter.get('/', async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const where: any = search ? {
    OR: [
      { name: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
    ],
  } : {};

  const [suppliers, total] = await prisma.$transaction([
    prisma.supplier.findMany({ where, skip, take: limitNum, orderBy: { name: 'asc' } }),
    prisma.supplier.count({ where }),
  ]);

  successResponse(res, suppliers, 'Suppliers retrieved', 200, buildPagination(pageNum, limitNum, total));
});

suppliersRouter.get('/:id', async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: { purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!supplier) throw new NotFoundError('Supplier');
  successResponse(res, supplier, 'Supplier retrieved');
});

suppliersRouter.post('/', requireAdmin, validate(supplierSchema), async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.create({ data: req.body });
  successResponse(res, supplier, 'Supplier created', 201);
});

suppliersRouter.put('/:id', requireAdmin, validate(supplierSchema.partial()), async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
  successResponse(res, supplier, 'Supplier updated');
});

suppliersRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  await prisma.supplier.delete({ where: { id: req.params.id } });
  successResponse(res, null, 'Supplier deleted');
});
