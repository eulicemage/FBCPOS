import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { CategoryService } from '../services/categoryService';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
  colorHex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  sortOrder: z.number().int().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(2).max(20).optional(),
  colorHex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export class CategoryController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await CategoryService.listCategories(includeInactive);
      return sendSuccess(res, categories);
    } catch (err: any) {
      return next(err);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.getCategoryById(req.params.id);
      return sendSuccess(res, category);
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createCategorySchema.parse(req.body);
      const category = await CategoryService.createCategory(data);
      return sendSuccess(res, category, 'Category created successfully', 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendError(res, 'Validation error', 400, err.errors);
      }
      return sendError(res, err.message, 400);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateCategorySchema.parse(req.body);
      const category = await CategoryService.updateCategory(req.params.id, data);
      return sendSuccess(res, category, 'Category updated successfully');
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendError(res, 'Validation error', 400, err.errors);
      }
      return sendError(res, err.message, 400);
    }
  }

  static async deactivate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.deactivateCategory(req.params.id);
      return sendSuccess(res, category, 'Category deactivated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}

