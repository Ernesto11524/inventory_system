import cron from 'node-cron';
import prisma from '../prisma/client';
import { io } from '../index';
import { sendLowStockEmail, sendLowStockSMS } from '../services/notificationService';
import { emitAlertCreated } from '../services/socketService';
import { STOCK_CHECK_CRON } from '@inventory/shared';

// ─── Low Stock Check ──────────────────────────────────────────────────────────

async function checkLowStock(): Promise<void> {
  console.log('[CRON] Running low stock check...');

  try {
    // Get all active products with inventory below minStockLevel
    const lowStockItems = await prisma.inventory.findMany({
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

      if (!isOutOfStock && !isLowStock) continue;

      const alertType = isOutOfStock ? 'out_of_stock' : 'low_stock';

      // Check if unresolved alert already exists for this type
      const existingAlert = await prisma.alert.findFirst({
        where: {
          productId: product.id,
          type: alertType,
          resolved: false,
        },
      });

      if (existingAlert) continue; // Skip if already alerted

      // Create alert record
      const message = isOutOfStock
        ? `${product.name} is out of stock (0 units remaining)`
        : `${product.name} has low stock (${currentStock} units, minimum: ${product.minStockLevel})`;

      const alert = await prisma.alert.create({
        data: {
          productId: product.id,
          type: alertType,
          message,
          resolved: false,
        },
      });

      alertsCreated++;

      // Emit Socket.IO event
      if (io) {
        emitAlertCreated(io, {
          alertId: alert.id,
          productId: product.id,
          productName: product.name,
          type: alertType,
          currentStock,
          minStockLevel: product.minStockLevel,
        });
      }

      // Send notifications
      await sendLowStockEmail(product, currentStock, product.minStockLevel, alertType);
      await sendLowStockSMS(product, currentStock, alertType);
    }

    console.log(`[CRON] Low stock check complete. ${alertsCreated} new alerts created.`);
  } catch (err) {
    console.error('[CRON] Low stock check failed:', err);
  }
}

// ─── Scheduled Jobs ───────────────────────────────────────────────────────────

export function startCronJobs(): void {
  // Run every hour
  cron.schedule(STOCK_CHECK_CRON, checkLowStock, {
    name: 'low-stock-check',
    timezone: 'UTC',
  });

  console.log('[CRON] Scheduled: low-stock-check (every hour)');

  // Run immediately on startup
  setTimeout(checkLowStock, 5000);
}
