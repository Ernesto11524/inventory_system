import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { Alert, Product } from '@inventory/shared';

// ─── Email ────────────────────────────────────────────────────────────────────

function getEmailTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Fallback to console in dev
  return null;
}

export async function sendLowStockEmail(
  product: Pick<Product, 'name' | 'sku'>,
  currentStock: number,
  minStockLevel: number,
  alertType: 'low_stock' | 'out_of_stock',
): Promise<void> {
  const to = process.env.ALERT_EMAIL;
  if (!to) return;

  const transporter = getEmailTransporter();
  if (!transporter) {
    console.log(`[EMAIL SKIP] ${alertType} alert for ${product.name}: stock=${currentStock}`);
    return;
  }

  const subject = alertType === 'out_of_stock'
    ? `🚨 OUT OF STOCK: ${product.name}`
    : `⚠️ Low Stock Alert: ${product.name}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${alertType === 'out_of_stock' ? '#ef4444' : '#f59e0b'}; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">
          ${alertType === 'out_of_stock' ? '🚨 Out of Stock' : '⚠️ Low Stock Alert'}
        </h1>
      </div>
      <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <h2 style="color: #111827;">${product.name}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; color: #6b7280;">SKU:</td>
            <td style="padding: 8px; font-weight: bold;">${product.sku}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 8px; color: #6b7280;">Current Stock:</td>
            <td style="padding: 8px; font-weight: bold; color: ${alertType === 'out_of_stock' ? '#ef4444' : '#f59e0b'};">
              ${currentStock} units
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #6b7280;">Minimum Level:</td>
            <td style="padding: 8px; font-weight: bold;">${minStockLevel} units</td>
          </tr>
        </table>
        <p style="color: #374151; margin-top: 16px;">
          Please create a purchase order to restock this item.
        </p>
        <a href="${process.env.WEB_APP_URL}/inventory" 
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; 
                  border-radius: 6px; text-decoration: none; margin-top: 8px;">
          View Inventory
        </a>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Inventory System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Failed to send email alert:', err);
  }
}

// ─── SMS ──────────────────────────────────────────────────────────────────────

function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export async function sendLowStockSMS(
  product: Pick<Product, 'name' | 'sku'>,
  currentStock: number,
  alertType: 'low_stock' | 'out_of_stock',
): Promise<void> {
  const to = process.env.ALERT_PHONE;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!to || !from) return;

  const client = getTwilioClient();
  if (!client) {
    console.log(`[SMS SKIP] ${alertType} for ${product.name}: stock=${currentStock}`);
    return;
  }

  const body = alertType === 'out_of_stock'
    ? `🚨 OUT OF STOCK: ${product.name} (SKU: ${product.sku}). Stock: ${currentStock} units. Please reorder immediately.`
    : `⚠️ LOW STOCK: ${product.name} (SKU: ${product.sku}). Only ${currentStock} units remaining. Consider restocking.`;

  try {
    await client.messages.create({ body, from, to });
  } catch (err) {
    console.error('Failed to send SMS alert:', err);
  }
}
