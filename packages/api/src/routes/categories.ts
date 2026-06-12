import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { successResponse, NotFoundError, buildPagination } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { categorySchema } from '@inventory/shared';

export const categoriesRouter = Router();

categoriesRouter.use(authenticate);

categoriesRouter.get('/', async (_req: Request, res: Response, next) => {
  try {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  successResponse(res, categories, 'Categories retrieved');
  } catch (err) {
    next(err);
  }
});

categoriesRouter.post('/', requireAdmin, validate(categorySchema), async (req: Request, res: Response, next) => {
  try {
  const category = await prisma.category.create({ data: req.body });
  successResponse(res, category, 'Category created', 201);
  } catch (err) {
    next(err);
  }
});

categoriesRouter.put('/:id', requireAdmin, validate(categorySchema), async (req: Request, res: Response, next) => {
  try {
  const category = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
  successResponse(res, category, 'Category updated');
  } catch (err) {
    next(err);
  }
});

categoriesRouter.delete('/:id', requireAdmin, async (req: Request, res: Response, next) => {
  try {
  await prisma.category.delete({ where: { id: req.params.id } });
  successResponse(res, null, 'Category deleted');
  } catch (err) {
    next(err);
  }
});
