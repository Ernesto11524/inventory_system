import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '@inventory/shared';

// ─── Response Helpers ─────────────────────────────────────────────────────────

export function successResponse<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  pagination?: PaginationMeta,
): void {
  const body: ApiResponse<T> = { success: true, data, message };
  if (pagination) body.pagination = pagination;
  res.status(statusCode).json(body);
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode = 400,
  data: unknown = null,
): void {
  const body: ApiResponse<unknown> = { success: false, data, message };
  res.status(statusCode).json(body);
}

export function buildPagination(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── Custom Errors ────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'DUPLICATE_ENTRY');
  }
}
