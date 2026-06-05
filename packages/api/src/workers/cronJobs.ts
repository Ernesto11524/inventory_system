import cron from 'node-cron';
import { format } from 'date-fns';
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

// ─── Auto-Open Day Session ────────────────────────────────────────────────────

async function autoOpenDaySession(): Promise<void> {
  console.log('[CRON] Attempting to auto-open day session...');
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[CRON] Calculated today's date (UTC): ${today}`);

    const existing = await prisma.daySession.findUnique({
      where: { date: today },
    });

    if (!existing) {
      // Verify admin user exists
      const sysUser = await prisma.user.findFirst({
        where: { role: 'admin' },
        orderBy: { createdAt: 'asc' },
      });

      if (!sysUser) {
        throw new Error('[CRON] Critical: No admin user found in database. Cannot auto-open day session.');
      }

      console.log(`[CRON] Admin user found: ${sysUser.name} (${sysUser.id}). Creating day session...`);

      const newSession = await prisma.daySession.create({
        data: {
          date: today,
          openedBy: sysUser.id,
          status: 'open',
          notes: '🤖 Auto-opened by system at midnight (no manual action needed)',
        },
      });

      console.log(`[CRON] ✓ Day session auto-opened successfully for ${today}. Session ID: ${newSession.id}`);
    } else {
      console.log(`[CRON] Day session already exists for ${today}`);
    }
  } catch (err) {
    console.error('[CRON] ✗ Auto-open day session failed:', err);
  }
}

// ─── Auto-Close Day Session ───────────────────────────────────────────────────

async function autoCloseDaySession(): Promise<void> {
  console.log('[CRON] Checking for sessions to auto-close...');
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Find open sessions from yesterday or earlier
    const openSessions = await prisma.daySession.findMany({
      where: {
        status: 'open',
        date: { lt: today },
      },
    });

    for (const session of openSessions) {
      const sessionDate = new Date(session.date);
      const shouldCloseBefore = new Date(sessionDate);
      shouldCloseBefore.setDate(shouldCloseBefore.getDate() + 1);
      shouldCloseBefore.setHours(0, 30, 0, 0);

      if (now > shouldCloseBefore) {
        // Find a manager or admin to close the session
        const sysUser = await prisma.user.findFirst({
          where: { role: { in: ['admin', 'manager'] } },
          orderBy: { createdAt: 'asc' },
        });

        if (sysUser) {
          await prisma.daySession.update({
            where: { id: session.id },
            data: {
              status: 'closed',
              closedAt: shouldCloseBefore,
              closedBy: sysUser.id,
              notes: '🤖 Auto-closed by system after 30 minutes into next day (staff forgot to close manually)',
            },
          });
          console.log(`[CRON] Auto-closed session for ${session.date}`);
        }
      }
    }
  } catch (err) {
    console.error('[CRON] Auto-close day session failed:', err);
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

  // Auto-open day session at midnight UTC
  cron.schedule('0 0 * * *', autoOpenDaySession, {
    name: 'auto-open-day-session',
    timezone: 'UTC',
  });

  console.log('[CRON] Scheduled: auto-open-day-session (daily at 00:00 UTC)');

  // Auto-close day session every 30 minutes
  cron.schedule('*/30 * * * *', autoCloseDaySession, {
    name: 'auto-close-day-session',
    timezone: 'UTC',
  });

  console.log('[CRON] Scheduled: auto-close-day-session (every 30 minutes UTC)');

  // Run immediately on startup
  setTimeout(checkLowStock, 5000);
}
