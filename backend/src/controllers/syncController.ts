import { Request, Response, NextFunction } from 'express';
import { SyncService } from '../services/syncService';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

const syncPushSchema = z.object({
  terminalId: z.string().min(1),
  branchId: z.string().min(1),
  batch: z.array(
    z.object({
      id: z.string().min(1),
      entityType: z.enum(['SALE', 'STOCK_MOVEMENT', 'SHIFT', 'RETURN', 'CASH_TX']),
      entityId: z.string().min(1),
      operation: z.enum(['INSERT', 'UPDATE']),
      payload: z.any(),
    })
  ),
});

export class SyncController {
  static async push(req: Request, res: Response, next: NextFunction) {
    try {
      const { terminalId, branchId, batch } = syncPushSchema.parse(req.body);
      const result = await SyncService.processBatch(terminalId, branchId, batch as any);
      return sendSuccess(res, result, 'Batch processed');
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendError(res, 'Invalid sync payload format', 400, err.errors);
      }
      return next(err);
    }
  }
}
