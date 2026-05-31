"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = startCronJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = __importDefault(require("../prisma/client"));
const index_1 = require("../index");
const notificationService_1 = require("../services/notificationService");
const socketService_1 = require("../services/socketService");
const shared_1 = require("@inventory/shared");
// ─── Low Stock Check ──────────────────────────────────────────────────────────
async function checkLowStock() {
    console.log('[CRON] Running low stock check...');
    try {
        // Get all active products with inventory below minStockLevel
        const lowStockItems = await client_1.default.inventory.findMany({
            where: {
                product: { deletedAt: null },
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        minStockLevel: true,
                    },
                },
            },
        });
        let alertsCreated = 0;
        for (const item of lowStockItems) {
            const { product, currentStock } = item;
            const isOutOfStock = currentStock <= 0;
            const isLowStock = currentStock > 0 && currentStock < product.minStockLevel;
            if (!isOutOfStock && !isLowStock)
                continue;
            const alertType = isOutOfStock ? 'out_of_stock' : 'low_stock';
            // Check if unresolved alert already exists for this type
            const existingAlert = await client_1.default.alert.findFirst({
                where: {
                    productId: product.id,
                    type: alertType,
                    resolved: false,
                },
            });
            if (existingAlert)
                continue; // Skip if already alerted
            // Create alert record
            const message = isOutOfStock
                ? `${product.name} is out of stock (0 units remaining)`
                : `${product.name} has low stock (${currentStock} units, minimum: ${product.minStockLevel})`;
            const alert = await client_1.default.alert.create({
                data: {
                    productId: product.id,
                    type: alertType,
                    message,
                    resolved: false,
                },
            });
            alertsCreated++;
            // Emit Socket.IO event
            if (index_1.io) {
                (0, socketService_1.emitAlertCreated)(index_1.io, {
                    alertId: alert.id,
                    productId: product.id,
                    productName: product.name,
                    type: alertType,
                    currentStock,
                    minStockLevel: product.minStockLevel,
                });
            }
            // Send notifications
            await (0, notificationService_1.sendLowStockEmail)(product, currentStock, product.minStockLevel, alertType);
            await (0, notificationService_1.sendLowStockSMS)(product, currentStock, alertType);
        }
        console.log(`[CRON] Low stock check complete. ${alertsCreated} new alerts created.`);
    }
    catch (err) {
        console.error('[CRON] Low stock check failed:', err);
    }
}
// ─── Scheduled Jobs ───────────────────────────────────────────────────────────
function startCronJobs() {
    // Run every hour
    node_cron_1.default.schedule(shared_1.STOCK_CHECK_CRON, checkLowStock, {
        name: 'low-stock-check',
        timezone: 'UTC',
    });
    console.log('[CRON] Scheduled: low-stock-check (every hour)');
    // Run immediately on startup
    setTimeout(checkLowStock, 5000);
}
//# sourceMappingURL=cronJobs.js.map