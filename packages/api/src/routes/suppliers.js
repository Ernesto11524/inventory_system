"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.suppliersRouter = void 0;
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@inventory/shared");
exports.suppliersRouter = (0, express_1.Router)();
exports.suppliersRouter.use(auth_1.authenticate);
exports.suppliersRouter.get('/', async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    const where = search ? {
        OR: [
            { name: { contains: String(search), mode: 'insensitive' } },
            { email: { contains: String(search), mode: 'insensitive' } },
        ],
    } : {};
    const [suppliers, total] = await client_1.default.$transaction([
        client_1.default.supplier.findMany({ where, skip, take: limitNum, orderBy: { name: 'asc' } }),
        client_1.default.supplier.count({ where }),
    ]);
    (0, response_1.successResponse)(res, suppliers, 'Suppliers retrieved', 200, (0, response_1.buildPagination)(pageNum, limitNum, total));
});
exports.suppliersRouter.get('/:id', async (req, res) => {
    const supplier = await client_1.default.supplier.findUnique({
        where: { id: req.params.id },
        include: { purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!supplier)
        throw new response_1.NotFoundError('Supplier');
    (0, response_1.successResponse)(res, supplier, 'Supplier retrieved');
});
exports.suppliersRouter.post('/', auth_1.requireAdmin, (0, validate_1.validate)(shared_1.supplierSchema), async (req, res) => {
    const supplier = await client_1.default.supplier.create({ data: req.body });
    (0, response_1.successResponse)(res, supplier, 'Supplier created', 201);
});
exports.suppliersRouter.put('/:id', auth_1.requireAdmin, (0, validate_1.validate)(shared_1.supplierSchema.partial()), async (req, res) => {
    const supplier = await client_1.default.supplier.update({ where: { id: req.params.id }, data: req.body });
    (0, response_1.successResponse)(res, supplier, 'Supplier updated');
});
exports.suppliersRouter.delete('/:id', auth_1.requireAdmin, async (req, res) => {
    await client_1.default.supplier.delete({ where: { id: req.params.id } });
    (0, response_1.successResponse)(res, null, 'Supplier deleted');
});
//# sourceMappingURL=suppliers.js.map