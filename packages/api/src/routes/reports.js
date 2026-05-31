"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = void 0;
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const sync_1 = require("csv-stringify/sync");
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
exports.reportsRouter = (0, express_1.Router)();
exports.reportsRouter.use(auth_1.authenticate);
/**
 * GET /api/reports/stock-value
 */
exports.reportsRouter.get('/stock-value', async (_req, res) => {
    const data = await client_1.default.$queryRaw `
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
    (0, response_1.successResponse)(res, { products: data, totals }, 'Stock value report retrieved');
});
/**
 * GET /api/reports/movement
 */
exports.reportsRouter.get('/movement', async (req, res) => {
    const { from, to, productId, type, page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    const where = {
        ...(from ? { createdAt: { gte: new Date(String(from)) } } : {}),
        ...(to ? { createdAt: { lte: new Date(String(to)) } } : {}),
        ...(productId ? { productId: String(productId) } : {}),
        ...(type ? { type: String(type) } : {}),
    };
    const [entries, total] = await client_1.default.$transaction([
        client_1.default.stockEntry.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, sku: true } },
                performer: { select: { id: true, name: true } },
            },
            skip,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
        }),
        client_1.default.stockEntry.count({ where }),
    ]);
    (0, response_1.successResponse)(res, entries, 'Movement report retrieved', 200, {
        page: pageNum, limit: limitNum, total,
        totalPages: Math.ceil(total / limitNum),
    });
});
/**
 * GET /api/reports/dashboard
 * 30-day stock movement chart data
 */
exports.reportsRouter.get('/dashboard', async (_req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [movementByDay, topByValue, categoryBreakdown] = await Promise.all([
        // 30-day movement
        client_1.default.$queryRaw `
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
        client_1.default.$queryRaw `
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
        client_1.default.$queryRaw `
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
    (0, response_1.successResponse)(res, {
        movementByDay,
        topByValue,
        categoryBreakdown,
    }, 'Dashboard data retrieved');
});
/**
 * GET /api/reports/export/csv
 */
exports.reportsRouter.get('/export/csv', async (req, res) => {
    const { type = 'inventory', from, to } = req.query;
    let rows = [];
    let filename = '';
    if (type === 'sales') {
        const salesFrom = from ? new Date(String(from)) : undefined;
        const salesTo = to ? new Date(String(to)) : undefined;
        const salesWhere = {
            ...(salesFrom ? { createdAt: { gte: salesFrom } } : {}),
            ...(salesTo ? { createdAt: { lte: salesTo } } : {}),
        };
        const salesEntries = await client_1.default.stockEntry.findMany({
            where: salesWhere,
            include: {
                product: { select: { name: true, sku: true, price: true, costPrice: true } },
                performer: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        rows = salesEntries.map(e => {
            const isSale = e.type === 'sale';
            const price = isSale ? Number(e.product.price) : Number(e.product.costPrice);
            const total = e.quantity * price;
            const revenue = isSale ? total : 0;
            const cost = isSale ? e.quantity * Number(e.product.costPrice) : total;
            const profit = revenue - cost;
            return {
                date: e.createdAt.toISOString(),
                product: e.product.name,
                sku: e.product.sku,
                type: e.type,
                quantity: e.quantity,
                unitPrice: price.toFixed(2),
                totalValue: total.toFixed(2),
                revenue: revenue.toFixed(2),
                costOfGoods: cost.toFixed(2),
                profit: profit.toFixed(2),
                performedBy: e.performer.name,
            };
        });
        filename = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    }
    else if (type === 'inventory') {
        rows = await client_1.default.$queryRaw `
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
    }
    else if (type === 'movement') {
        const where = {};
        if (from)
            where.createdAt = { ...where.createdAt, gte: new Date(String(from)) };
        if (to)
            where.createdAt = { ...where.createdAt, lte: new Date(String(to)) };
        const entries = await client_1.default.stockEntry.findMany({
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
    const csv = (0, sync_1.stringify)(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
});
/**
 * GET /api/reports/sales
 * Sales report with revenue, cost, profit breakdown
 */
exports.reportsRouter.get('/sales', async (req, res) => {
    const { from, to } = req.query;
    const where = {
        ...(from ? { createdAt: { gte: new Date(String(from)) } } : {}),
        ...(to ? { createdAt: { lte: new Date(String(to)) } } : {}),
    };
    // Get all stock entries in the period
    const entries = await client_1.default.stockEntry.findMany({
        where,
        include: {
            product: { select: { id: true, name: true, sku: true, price: true, costPrice: true } },
            performer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    // Calculate totals
    let totalRevenue = 0;
    let totalCost = 0;
    let totalUnitsSold = 0;
    // Group by product for top products
    const productMap = {};
    // Group by date for daily breakdown
    const dateMap = {};
    for (const entry of entries) {
        const product = entry.product;
        if (!product)
            continue;
        const price = Number(product.price);
        const costPrice = Number(product.costPrice);
        const qty = entry.quantity;
        const dateKey = entry.createdAt.toISOString().split('T')[0];
        // Initialize date entry
        if (!dateMap[dateKey]) {
            dateMap[dateKey] = { date: dateKey, revenue: 0, cost: 0, profit: 0, unitsSold: 0 };
        }
        if (entry.type === 'sale') {
            const revenue = price * qty;
            const cost = costPrice * qty;
            const profit = revenue - cost;
            totalRevenue += revenue;
            totalCost += cost;
            totalUnitsSold += qty;
            dateMap[dateKey].revenue += revenue;
            dateMap[dateKey].cost += cost;
            dateMap[dateKey].profit += profit;
            dateMap[dateKey].unitsSold += qty;
            // Product aggregation
            if (!productMap[product.id]) {
                productMap[product.id] = {
                    productId: product.id,
                    name: product.name,
                    sku: product.sku,
                    unitsSold: 0,
                    revenue: 0,
                    cost: 0,
                    profit: 0,
                };
            }
            productMap[product.id].unitsSold += qty;
            productMap[product.id].revenue += revenue;
            productMap[product.id].cost += cost;
            productMap[product.id].profit += profit;
        }
    }
    const totalProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20);
    const dailyBreakdown = Object.values(dateMap)
        .sort((a, b) => a.date.localeCompare(b.date));
    (0, response_1.successResponse)(res, {
        totals: {
            revenue: totalRevenue,
            cost: totalCost,
            profit: totalProfit,
            margin,
            unitsSold: totalUnitsSold,
        },
        topProducts,
        dailyBreakdown,
        transactions: entries,
    }, 'Sales report retrieved');
});
//# sourceMappingURL=reports.js.map