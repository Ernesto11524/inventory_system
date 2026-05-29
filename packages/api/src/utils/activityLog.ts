import prisma from '../prisma/client';

export async function logActivity(
  userId: string,
  action: string,
  details?: string,
  ipAddress?: string,
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, action, details, ipAddress },
    });
  } catch {
    // Silent fail — logging should never break the main flow
  }
}
