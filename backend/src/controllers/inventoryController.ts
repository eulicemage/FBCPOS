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

  static async stockIn(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        branchId: z.string().min(1),
        productId: z.string().min(1),
        quantity: z.number().positive(),
        userId: z.string().min(1),
        referenceId: z.string().optional(),
        notes: z.string().optional(),
      });
      const data = schema.parse(req.body);
      const result = await InventoryService.recordStockIn(
        data.branchId,
        data.productId,
        data.quantity,
        data.userId,
        data.referenceId,
        data.notes
      );
      return sendSuccess(res, result, 'Stock in recorded successfully', 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendError(res, 'Validation error', 400, err.errors);
      return sendError(res, err.message, 400);
    }
  }

  static async stockOut(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        branchId: z.string().min(1),
        productId: z.string().min(1),
        quantity: z.number().positive(),
        userId: z.string().min(1),
        referenceId: z.string().optional(),
        reason: z.string().optional(),
      });
      const data = schema.parse(req.body);
      const result = await InventoryService.recordStockOut(
        data.branchId,
        data.productId,
        data.quantity,
        data.userId,
        data.referenceId,
        data.reason
      );
      return sendSuccess(res, result, 'Stock out recorded successfully', 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendError(res, 'Validation error', 400, err.errors);
      return sendError(res, err.message, 400);
    }
  }

  static async adjust(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        branchId: z.string().min(1),
        productId: z.string().min(1),
        countedQuantity: z.number().nonnegative(),
        userId: z.string().min(1),
        reason: z.string().min(3),
      });
      const data = schema.parse(req.body);
      const result = await InventoryService.recordAdjustment(
        data.branchId,
        data.productId,
        data.countedQuantity,
        data.userId,
        data.reason
      );
      return sendSuccess(res, result, 'Stock count adjusted successfully');
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendError(res, 'Validation error', 400, err.errors);
      return sendError(res, err.message, 400);
    }
  }

  static async recordDamage(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        branchId: z.string().min(1),
        productId: z.string().min(1),
        quantity: z.number().positive(),
        userId: z.string().min(1),
        damageReason: z.string().min(3),
      });
      const data = schema.parse(req.body);
      const result = await InventoryService.recordDamage(
        data.branchId,
        data.productId,
        data.quantity,
        data.userId,
        data.damageReason
      );
      return sendSuccess(res, result, 'Damage write-off recorded successfully');
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendError(res, 'Validation error', 400, err.errors);
      return sendError(res, err.message, 400);
    }
  }

  static async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.params.branchId;
      const { productId, movementType, startDate, endDate, page, limit } = req.query;
      const result = await InventoryService.getMovementHistory(branchId, {
        productId: productId as string,
        movementType: movementType as MovementType,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      return sendSuccess(res, result);
    } catch (err: any) {
      return next(err);
    }
  }

  static async getReorderAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.params.branchId;
      const alerts = await InventoryService.getReorderAlerts(branchId);
      return sendSuccess(res, alerts);
    } catch (err: any) {
      return next(err);
    }
  }
}
