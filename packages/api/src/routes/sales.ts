import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { successResponse, buildPagination } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { logActivity } from '../utils/activityLog';
import { io } from '../index';
import { emitStockUpdate } from '../services/socketService';
import { SOCKET_EVENTS } from '@inventory/shared';

export const salesRouter = Router();
salesRouter.use(authenticate);

// POST /api/sales - Create a new sale
salesRouter.post('/', async (req: Request, res: Response) => {
  const {
    items, customerName, customerPhone, paymentMethod,
    subtotal, discount, total, amountPaid, change, note,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'No items in sale' });
  }

  // Generate receipt number
  const receiptNo = `RCP-${Date.now().toString(36).toUpperCase()}`;

  // Create sale and stock entries in a transaction
  const sale = await prisma.$transaction(async (tx) => {
    // Create the sale record
    const newSale = await tx.sale.create({
      data: {
        receiptNo,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        paymentMethod: paymentMethod || 'cash',
        subtotal: Number(subtotal),
        discount: Number(discount || 0),
        total: Number(total),
        amountPaid: Number(amountPaid || total),
        change: Number(change || 0),
        note: note || null,
        cashierId: req.user!.userId,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: Number(item.price),
            costPrice: Number(item.costPrice || 0),
            subtotal: item.quantity * Number(item.price),
          })),
        },
      },
      include: {
        items: { include: { product: { select: { name: true, sku: true } } } },
        cashier: { select: { name: true } },
      },
    });

    // Create stock entries and update inventory for each item
    for (const item of items) {
      await tx.stockEntry.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          type: 'sale',
          note: `POS Sale - Receipt ${receiptNo}`,
          performedBy: req.user!.userId,
        },
      });

      await tx.inventory.upsert({
        where: { productId: item.productId },
        update: { currentStock: { decrement: item.quantity } },
        create: { productId: item.productId, currentStock: -item.quantity },
      });
    }

    return newSale;
  });

  // Log activity
  await logActivity(
    req.user!.userId,
    'stock_sale',
    `POS Sale ${receiptNo} - ${items.length} items - Total: GH₵${total}`,
    req.ip,
  );

  // Emit real-time update
  if (io) {
    emitStockUpdate(io, { saleId: sale.id });
  }

  successResponse(res, sale, 'Sale completed', 201);
});

// GET /api/sales - Get all sales
salesRouter.get('/', async (req: Request, res: Response) => {
  const { page = 1, limit = 20, from, to, cashierId, paymentMethod } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    ...(cashierId ? { cashierId: String(cashierId) } : {}),
    ...(paymentMethod ? { paymentMethod: String(paymentMethod) } : {}),
    ...(from || to ? {
      createdAt: {
        ...(from ? { gte: new Date(String(from)) } : {}),
        ...(to ? { lte: new Date(String(to) + 'T23:59:59') } : {}),
      },
    } : {}),
  };

  const [sales, total] = await prisma.$transaction([
    prisma.sale.findMany({
      where,
      include: {
        items: {
          include: { product: { select: { name: true, sku: true, unit: true } } },
        },
        cashier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.sale.count({ where }),
  ]);

  successResponse(res, sales, 'Sales retrieved', 200, buildPagination(pageNum, limitNum, total));
});

// GET /api/sales/:id - Get single sale
salesRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { name: true, sku: true, unit: true, price: true } } },
      },
      cashier: { select: { id: true, name: true } },
    },
  });
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  successResponse(res, sale, 'Sale retrieved');
});

// GET /api/sales/summary/today - Today's summary
salesRouter.get('/summary/today', async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: today, lt: tomorrow } },
    include: { items: true },
  });

  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
  const totalTransactions = sales.length;
  const totalItems = sales.reduce((s, sale) =>
    s + sale.items.reduce((si, item) => si + item.quantity, 0), 0);
  const totalProfit = sales.reduce((s, sale) =>
    s + sale.items.reduce((si, item) =>
      si + (item.quantity * (item.unitPrice - item.costPrice)), 0), 0);

  const byPaymentMethod: Record<string, number> = {};
  for (const sale of sales) {
    byPaymentMethod[sale.paymentMethod] = (byPaymentMethod[sale.paymentMethod] || 0) + sale.total;
  }

  successResponse(res, {
    totalRevenue,
    totalTransactions,
    totalItems,
    totalProfit,
    byPaymentMethod,
  }, 'Today summary retrieved');
});
