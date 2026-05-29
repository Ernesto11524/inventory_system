import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/response';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      data: null,
      message: err.message,
      code: err.code,
    });
    return;
  }

  // Prisma unique constraint errors
  if ((err as any).code === 'P2002') {
    const field = (err as any).meta?.target?.[0] || 'field';
    res.status(409).json({
      success: false,
      data: null,
      message: `A record with this ${field} already exists`,
      code: 'DUPLICATE_ENTRY',
    });
    return;
  }

  // Prisma not found
  if ((err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      data: null,
      message: 'Record not found',
      code: 'NOT_FOUND',
    });
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      data: null,
      message: err.message,
      code: 'UPLOAD_ERROR',
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    data: null,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
}
