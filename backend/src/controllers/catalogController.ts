import { Request, Response, NextFunction } from 'express';
import { CatalogService } from '../services/catalogService';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

export class CatalogController {
  static async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const lastPulledAt = req.query.last_pulled_at as string | undefined;
      const branchId = req.query.branch_id as string | undefined;
      const result = await CatalogService.getCatalogDelta(lastPulledAt, branchId);
      return sendSuccess(res, result);
    } catch (err: any) {
      return next(err);
    }
  }

  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req.query.q as string) || '';
      const categoryId = req.query.category_id as string | undefined;
      const results = await CatalogService.searchProducts(query, categoryId);
      return sendSuccess(res, results);
    } catch (err: any) {
      return next(err);
    }
  }

  static async getByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const barcode = req.params.barcode;
      const product = await CatalogService.getProductByBarcode(barcode);
      if (!product) {
        return sendError(res, 'Product not found', 404);
      }
      return sendSuccess(res, product);
    } catch (err: any) {
      return next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await CatalogService.getProductById(req.params.id);
      return sendSuccess(res, product);
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const createSchema = z.object({
        sku: z.string().min(1),
        barcode: z.string().min(1),
        name: z.string().min(2),
        categoryId: z.string().min(1),
        costPrice: z.number().nonnegative(),
        sellingPrice: z.number().nonnegative(),
        description: z.string().optional(),
        isTaxable: z.boolean().optional(),
        taxRate: z.number().optional(),
        unitOfMeasure: z.string().optional(),
      });
      const data = createSchema.parse(req.body);
      const product = await CatalogService.createProduct(data);
      return sendSuccess(res, product, 'Product created successfully', 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendError(res, 'Validation error', 400, err.errors);
      }
      return sendError(res, err.message, 400);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updateSchema = z.object({
        sku: z.string().min(1).optional(),
        barcode: z.string().min(1).optional(),
        name: z.string().min(2).optional(),
        categoryId: z.string().min(1).optional(),
        costPrice: z.number().nonnegative().optional(),
        sellingPrice: z.number().nonnegative().optional(),
        description: z.string().optional(),
        isTaxable: z.boolean().optional(),
        taxRate: z.number().optional(),
        unitOfMeasure: z.string().optional(),
        isActive: z.boolean().optional(),
      });
      const data = updateSchema.parse(req.body);
      const product = await CatalogService.updateProduct(req.params.id, data);
      return sendSuccess(res, product, 'Product updated successfully');
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendError(res, 'Validation error', 400, err.errors);
      }
      return sendError(res, err.message, 400);
    }
  }

  static async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await CatalogService.deactivateProduct(req.params.id);
      return sendSuccess(res, product, 'Product deactivated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
