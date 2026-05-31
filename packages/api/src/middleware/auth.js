"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireAdmin = requireAdmin;
exports.requireRole = requireRole;
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
function authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        throw new response_1.UnauthorizedError('No token provided');
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = payload;
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new response_1.UnauthorizedError('Token expired');
        }
        throw new response_1.UnauthorizedError('Invalid token');
    }
}
function requireAdmin(req, _res, next) {
    if (!req.user) {
        throw new response_1.UnauthorizedError();
    }
    if (req.user.role !== 'admin') {
        throw new response_1.ForbiddenError('Admin access required');
    }
    next();
}
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            throw new response_1.UnauthorizedError();
        }
        if (!roles.includes(req.user.role)) {
            throw new response_1.ForbiddenError();
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map