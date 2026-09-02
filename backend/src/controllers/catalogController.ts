import { Request, Response, NextFunction } from 'express';
import { CatalogService } from '../services/catalogService';
import { sendSuccess, sendError } from '../utils/response';

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
}
