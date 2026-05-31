import { Response } from 'express';
import { PaginationMeta } from '@inventory/shared';
export declare function successResponse<T>(res: Response, data: T, message?: string, statusCode?: number, pagination?: PaginationMeta): void;
export declare function errorResponse(res: Response, message: string, statusCode?: number, data?: unknown): void;
export declare function buildPagination(page: number, limit: number, total: number): PaginationMeta;
export declare class AppError extends Error {
    message: string;
    statusCode: number;
    code?: string | undefined;
    constructor(message: string, statusCode?: number, code?: string | undefined);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
//# sourceMappingURL=response.d.ts.map