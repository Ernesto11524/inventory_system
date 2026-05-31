"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.ValidationError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.AppError = void 0;
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
exports.buildPagination = buildPagination;
// ─── Response Helpers ─────────────────────────────────────────────────────────
function successResponse(res, data, message = 'Success', statusCode = 200, pagination) {
    const body = { success: true, data, message };
    if (pagination)
        body.pagination = pagination;
    res.status(statusCode).json(body);
}
function errorResponse(res, message, statusCode = 400, data = null) {
    const body = { success: false, data, message };
    res.status(statusCode).json(body);
}
function buildPagination(page, limit, total) {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
}
// ─── Custom Errors ────────────────────────────────────────────────────────────
class AppError extends Error {
    message;
    statusCode;
    code;
    constructor(message, statusCode = 400, code) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'You do not have permission to perform this action') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
class ValidationError extends AppError {
    constructor(message) {
        super(message, 422, 'VALIDATION_ERROR');
    }
}
exports.ValidationError = ValidationError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'DUPLICATE_ENTRY');
    }
}
exports.ConflictError = ConflictError;
//# sourceMappingURL=response.js.map