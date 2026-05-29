import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { successResponse, NotFoundError, buildPagination, AppError } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { purchaseOrderSchema, poStatusSchema } from '@inventory/shared';

export const purchaseOrdersRouter = Router();
purchaseOrdersRouter.use(authenticate);

purchaseOrdersRouter.get('/', async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status, supplierId } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    ...(status ? { status: String(status) } : {}),
    ...(supplierId ? { supplierId: String(supplierId) } : {}),
  };

  const [orders, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
        },
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  successResponse(res, orders, 'Purchase orders retrieved', 200, buildPagination(pageNum, limitNum, total));
});

purchaseOrdersRouter.get('/:id', async (req: Request, res: Response) => {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: {
      supplier: true,
      items: {
        include: { product: { select: { id: true, name: true, sku: true, unit: true, imageUrl: true } } },
      },
    },
  });
  if (!order) throw new NotFoundError('Purchase order');
  successResponse(res, order, 'Purchase order retrieved');
});

purchaseOrdersRouter.post('/', requireAdmin, validate(purchaseOrderSchema), async (req: Request, res: Response) => {
  const { supplierId, items, note } = req.body;

  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      note,
      items: {
        create: items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      },
    },
    include: {
      supplier: true,
      items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
    },
  });

  successResponse(res, order, 'Purchase order created', 201);
});

purchaseOrdersRouter.patch('/:id/status', requireAdmin, validate(poStatusSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) throw new NotFoundError('Purchase order');

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    draft: ['sent'],
    sent: ['received'],
    received: [],
  };

  if (!validTransitions[order.status].includes(status)) {
    throw new AppError(`Cannot transition from ${order.status} to ${status}`, 400);
  }

  const updatedOrder = await prisma.purchaseOrder.update({
    where: { id },
    data: { status },
    include: { supplier: true, items: { include: { product: true } } },
  });

  // On "received", generate restock stock entries
  if (status === 'received') {
    for (const item of order.items) {
      await prisma.stockEntry.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          type: 'restock',
          note: `Auto-restock from PO #${id.slice(-8).toUpperCase()}`,
          performedBy: req.user!.userId,
        },
      });

      await prisma.inventory.upsert({
        where: { productId: item.productId },
        update: { currentStock: { increment: item.quantity } },
        create: { productId: item.productId, currentStock: item.quantity },
      });

      // Auto-resolve any related alerts
      await prisma.alert.updateMany({
        where: { productId: item.productId, resolved: false },
        data: { resolved: true },
      });
    }
  }

  successResponse(res, updatedOrder, `Purchase order marked as ${status}`);
});
