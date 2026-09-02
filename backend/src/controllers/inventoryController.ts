import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventoryService';
import { sendSuccess, sendError } from '../utils/response';
import { MovementType } from '@prisma/client';
import { z } from 'zod';

const movementSchema = z.object({
  branchId: z.string().min(1),
  productId: z.string().min(1),
  movementType: z.nativeEnum(MovementType),
  quantityChange: z.number(),
  userId: z.string().min(1),
  reason: z.string().optional(),
  referenceId: z.string().optional(),
});

export class InventoryController {
  static async getBranchInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.params.branchId;
      const inventory = await InventoryService.getBranchInventory(branchId);
      return sendSuccess(res, inventory);
    } catch (err: any) {
      return next(err);
    }
  }

  static async recordMovement(req: Request, res: Response, next: NextFunction) {
    try {
      const data = movementSchema.parse(req.body);
      const result = await InventoryService.recordMovement(
        data.branchId,
        data.productId,
        data.movementType,
        data.quantityChange,
        data.userId,
        data.reason,
        data.referenceId
      );
      return sendSuccess(res, result, 'Stock movement recorded successfully');
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendError(res, 'Validation error', 400, err.errors);
      }
      return next(err);
    }
  }
}
