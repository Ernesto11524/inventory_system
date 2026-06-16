import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { stringify } from 'csv-stringify/sync';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

/**
 * GET /api/reports/stock-value
 */
reportsRouter.get('/stock-value', async (_req: Request, res: Response, next) => {
  try {
  const data = await prisma.$queryRaw<any[]>`
    SELECT
      p.id,
      p.name,
      p.sku,
      p."costPrice"::float,
      p.price::float,
      COALESCE(i."currentStock", 0) as "currentStock",
      (COALESCE(i."currentStock", 0) * p."costPrice"::float) as "stockValue",
      (COALESCE(i."currentStock", 0) * p.price::float) as "retailValue",
      c.name as "categoryName"
    FROM products p
    LEFT JOIN inventory i ON p.id = i."productId"
    LEFT JOIN categories c ON p."categoryId" = c.id
    WHERE p."deletedAt" IS NULL
    ORDER BY "stockValue" DESC
  `;

  const totals = data.reduce((acc, row) => ({
    totalCostValue: acc.totalCostValue + Number(row.stockValue),
    totalRetailValue: acc.totalRetailValue + Number(row.retailValue),
    totalItems: acc.totalItems + Number(row.currentStock),
  }), { totalCostValue: 0, totalRetailValue: 0, totalItems: 0 });

  successResponse(res, { products: data, totals }, 'Stock value report retrieved');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/movement
 */
reportsRouter.get('/movement', async (req: Request, res: Response, next) => {
  try {
  const { from, to, productId, type, page = 1, limit = 20 } = req.query;
  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    ...(from ? { createdAt: { gte: new Date(String(from)) } } : {}),
    ...(to ? { createdAt: { lte: new Date(String(to)) } } : {}),
    ...(productId ? { productId: String(productId) } : {}),
    ...(type ? { type: String(type) } : {}),
  };

  const [entries, total] = await prisma.$transaction([
    prisma.stockEntry.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        performer: { select: { id: true, name: true } },
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockEntry.count({ where }),
  ]);

  successResponse(res, entries, 'Movement report retrieved', 200, {
    page: pageNum, limit: limitNum, total,
    totalPages: Math.ceil(total / limitNum),
  });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/dashboard
 * 30-day stock movement chart data
 */
reportsRouter.get('/dashboard', async (_req: Request, res: Response, next) => {
  try {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [movementByDay, topByValue, categoryBreakdown] = await Promise.all([
    // 30-day movement
    prisma.$queryRaw<any[]>`
      SELECT 
        DATE("createdAt") as date,
        SUM(CASE WHEN type::text IN ('restock', 'return') THEN quantity ELSE 0 END)::int as inbound,
        SUM(CASE WHEN type::text = 'sale' THEN quantity ELSE 0 END)::int as outbound
      FROM stock_entries
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    // Top 10 products by stock value
    prisma.$queryRaw<any[]>`
      SELECT 
        p.id, p.name, p.sku,
        COALESCE(i."currentStock", 0) as "currentStock",
        (COALESCE(i."currentStock", 0) * p."costPrice"::float) as "stockValue"
      FROM products p
      LEFT JOIN inventory i ON p.id = i."productId"
      WHERE p."deletedAt" IS NULL
      ORDER BY "stockValue" DESC
      LIMIT 10
    `,
    // Category breakdown
    prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category,
        COUNT(p.id)::int as count,
        COALESCE(SUM(i."currentStock" * p."costPrice"::float), 0) as value
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN inventory i ON p.id = i."productId"
      WHERE p."deletedAt" IS NULL
      GROUP BY c.name
      ORDER BY value DESC
    `,
  ]);

  successResponse(res, {
    movementByDay,
    topByValue,
    categoryBreakdown,
  }, 'Dashboard data retrieved');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/export/csv
 */
reportsRouter.get('/export/csv', async (req: Request, res: Response, next) => {
  try {
  const { type = 'inventory', from, to } = req.query;

  let rows: any[] = [];
  let filename = '';

  if (type === 'sales') {
    const salesFrom = from ? new Date(String(from)) : undefined;
    const salesToStr = String(to);
    const salesToDate = to
      ? new Date(salesToStr.includes('T') ? salesToStr : salesToStr + 'T23:59:59')
      : undefined;
    const salesWhere: any = {
      ...(salesFrom ? { createdAt: { gte: salesFrom } } : {}),
      ...(salesToDate ? { createdAt: { lte: salesToDate } } : {}),
    };
    // Use Sale+SaleItem for historically accurate prices
    const saleDocs = await prisma.sale.findMany({
      where: salesWhere,
      include: {
        items: { include: { product: { select: { name: true, sku: true } } } },
        cashier: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    rows = saleDocs.flatMap(sale =>
      sale.items.map(item => {
        const revenue = Number(item.unitPrice) * item.quantity;
        const cost = Number(item.costPrice) * item.quantity;
        return {
          date: sale.createdAt.toISOString(),
          receiptNo: sale.receiptNo,
          product: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice).toFixed(2),
          unitCost: Number(item.costPrice).toFixed(2),
          revenue: revenue.toFixed(2),
          costOfGoods: cost.toFixed(2),
          profit: (revenue - cost).toFixed(2),
          paymentMethod: sale.paymentMethod,
          cashier: sale.cashier.name,
        };
      })
    );
    filename = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
  } else if (type === 'inventory') {
    rows = await prisma.$queryRaw<any[]>`
      SELECT p.name, p.sku, p.barcode, COALESCE(c.name, 'N/A') as category,
        p."costPrice"::float, p.price::float, p.unit, p."minStockLevel",
        COALESCE(i."currentStock", 0) as "currentStock",
        (COALESCE(i."currentStock", 0) * p."costPrice"::float) as "stockValue"
      FROM products p
      LEFT JOIN inventory i ON p.id = i."productId"
      LEFT JOIN categories c ON p."categoryId" = c.id
      WHERE p."deletedAt" IS NULL
      ORDER BY p.name
    `;
    filename = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
  } else if (type === 'movement') {
    const where: any = {};
    if (from) where.createdAt = { ...where.createdAt, gte: new Date(String(from)) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(String(to)) };

    const entries = await prisma.stockEntry.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true } },
        performer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    rows = entries.map(e => ({
      date: e.createdAt.toISOString(),
      product: e.product.name,
      sku: e.product.sku,
      type: e.type,
      quantity: e.quantity,
      performedBy: e.performer.name,
      note: e.note || '',
    }));
    filename = `stock-movement-${new Date().toISOString().split('T')[0]}.csv`;
  }

  const csv = stringify(rows, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/sales
 * Sales report with revenue, cost, profit breakdown
 * Uses actual Sale/SaleItem data (prices at time of sale, not current prices)
 */
reportsRouter.get('/sales', async (req: Request, res: Response, next) => {
  try {
  const { from, to } = req.query;

  const toStr = String(to);
  const where: any = {
    ...(from ? { createdAt: { gte: new Date(String(from)) } } : {}),
    ...(to ? { createdAt: { lte: new Date(toStr.includes('T') ? toStr : toStr + 'T23:59:59') } } : {}),
  };

  const sales = await prisma.sale.findMany({
    where,
    include: {
      items: {
        include: { product: { select: { id: true, name: true, sku: true } } },
      },
      cashier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  let totalRevenue = 0;
  let totalCost = 0;
  let totalUnitsSold = 0;

  const productMap: Record<string, any> = {};
  const dateMap: Record<string, any> = {};

  for (const sale of sales) {
    const dateKey = sale.createdAt.toISOString().split('T')[0];
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = { date: dateKey, revenue: 0, cost: 0, profit: 0, unitsSold: 0, transactions: 0 };
    }

    totalRevenue += Number(sale.total);
    dateMap[dateKey].revenue += Number(sale.total);
    dateMap[dateKey].transactions += 1;

    for (const item of sale.items) {
      const revenue = Number(item.unitPrice) * item.quantity;
      const cost = Number(item.costPrice) * item.quantity;
      const profit = revenue - cost;

      totalCost += cost;
      totalUnitsSold += item.quantity;
      dateMap[dateKey].cost += cost;
      dateMap[dateKey].profit += profit;
      dateMap[dateKey].unitsSold += item.quantity;

      const pid = item.product.id;
      if (!productMap[pid]) {
        productMap[pid] = { productId: pid, name: item.product.name, sku: item.product.sku, unitsSold: 0, revenue: 0, cost: 0, profit: 0 };
      }
      productMap[pid].unitsSold += item.quantity;
      productMap[pid].revenue += revenue;
      productMap[pid].cost += cost;
      productMap[pid].profit += profit;
    }
  }

  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const topProducts = Object.values(productMap)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 20);

  const dailyBreakdown = Object.values(dateMap)
    .sort((a: any, b: any) => a.date.localeCompare(b.date));

  // StockEntry records for the "All Transactions" list — matches what the frontend template expects
  const transactions = await prisma.stockEntry.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, sku: true, price: true, costPrice: true } },
      performer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  successResponse(res, {
    totals: { revenue: totalRevenue, cost: totalCost, profit: totalProfit, margin, unitsSold: totalUnitsSold },
    topProducts,
    dailyBreakdown,
    transactions,
  }, 'Sales report retrieved');
  } catch (err) {
    next(err);
  }
});
