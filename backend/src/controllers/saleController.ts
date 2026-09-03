import { Request, Response, NextFunction } from 'express';
import { SaleService } from '../services/saleService';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';
import { SaleStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

export class SaleController {
  static async listSales(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        branchId: req.query.branchId as string,
        terminalId: req.query.terminalId as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        cashierId: req.query.cashierId as string,
        status: req.query.status as SaleStatus,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const result = await SaleService.listSales(filters);
      return sendSuccess(res, result);
    } catch (err: any) {
      return next(err);
    }
  }

  static async getSaleById(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await SaleService.getSaleById(req.params.id);
      return sendSuccess(res, sale);
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }

  static async getDailySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const date = req.query.date as string;
      const summary = await SaleService.getDailySummary(branchId, date);
      return sendSuccess(res, summary);
    } catch (err: any) {
      return next(err);
    }
  }

  static async cancelSale(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cancelSchema = z.object({
        reason: z.string().min(1),
      });
      const data = cancelSchema.parse(req.body);

      const userId = req.user?.id || 'system';
      const sale = await SaleService.cancelSale(req.params.id, data.reason, userId);
      return sendSuccess(res, sale, 'Sale cancelled successfully');
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendError(res, 'Validation error', 400, err.errors);
      }
      return sendError(res, err.message, 400);
    }
  }
}
