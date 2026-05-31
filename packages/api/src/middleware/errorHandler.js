"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const response_1 = require("../utils/response");
function errorHandler(err, _req, res, _next) {
    if (err instanceof response_1.AppError) {
        res.status(err.statusCode).json({
            success: false,
            data: null,
            message: err.message,
            code: err.code,
        });
        return;
    }
    // Prisma unique constraint errors
    if (err.code === 'P2002') {
        const field = err.meta?.target?.[0] || 'field';
        res.status(409).json({
            success: false,
            data: null,
            message: `A record with this ${field} already exists`,
            code: 'DUPLICATE_ENTRY',
        });
        return;
    }
    // Prisma not found
    if (err.code === 'P2025') {
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
//# sourceMappingURL=errorHandler.js.map