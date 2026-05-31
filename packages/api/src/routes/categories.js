"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesRouter = void 0;
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@inventory/shared");
exports.categoriesRouter = (0, express_1.Router)();
exports.categoriesRouter.use(auth_1.authenticate);
exports.categoriesRouter.get('/', async (_req, res) => {
    const categories = await client_1.default.category.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
    });
    (0, response_1.successResponse)(res, categories, 'Categories retrieved');
});
exports.categoriesRouter.post('/', auth_1.requireAdmin, (0, validate_1.validate)(shared_1.categorySchema), async (req, res) => {
    const category = await client_1.default.category.create({ data: req.body });
    (0, response_1.successResponse)(res, category, 'Category created', 201);
});
exports.categoriesRouter.put('/:id', auth_1.requireAdmin, (0, validate_1.validate)(shared_1.categorySchema), async (req, res) => {
    const category = await client_1.default.category.update({ where: { id: req.params.id }, data: req.body });
    (0, response_1.successResponse)(res, category, 'Category updated');
});
exports.categoriesRouter.delete('/:id', auth_1.requireAdmin, async (req, res) => {
    await client_1.default.category.delete({ where: { id: req.params.id } });
    (0, response_1.successResponse)(res, null, 'Category deleted');
});
//# sourceMappingURL=categories.js.map