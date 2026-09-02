import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { ExcelService } from '../services/excelService';
import { sendSuccess, sendError } from '../utils/response';

export class ExcelController {
  /**
   * GET /excel/templates/products
   */
  static async downloadProductTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const buffer = await ExcelService.generateProductTemplate();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="FBCPOS_Product_Import_Template.xlsx"'
      );
      return res.send(buffer);
    } catch (err: any) {
      return next(err);
    }
  }

  /**
   * POST /excel/import/products
   */
  static async importProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, 'No Excel spreadsheet file uploaded', 400);
      }

      const result = await ExcelService.importProductsFromExcel(req.file.buffer);
      return sendSuccess(res, result, `Bulk product import processed: ${result.successful} successful, ${result.errors.length} errors.`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  /**
   * GET /excel/export/products
   */
  static async exportProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const buffer = await ExcelService.exportProductsToExcel();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="FBCPOS_Product_Catalog_${new Date().toISOString().split('T')[0]}.xlsx"`
      );
      return res.send(buffer);
    } catch (err: any) {
      return next(err);
    }
  }

  /**
   * GET /excel/templates/inventory-delivery
   */
  static async downloadInventoryDeliveryTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const buffer = await ExcelService.generateInventoryDeliveryTemplate();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="FBCPOS_Delivery_Report_Template.xlsx"'
      );
      return res.send(buffer);
    } catch (err: any) {
      return next(err);
    }
  }

  /**
   * POST /excel/import/inventory-delivery
   */
  static async importInventoryDelivery(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, 'No Excel delivery report spreadsheet uploaded', 400);
      }

      const userId = req.user?.id || 'SYSTEM';
      const result = await ExcelService.importInventoryDeliveryFromExcel(req.file.buffer, userId);
      return sendSuccess(
        res,
        result,
        `Inventory delivery processed: ${result.successful} items received (${result.totalQuantity} units), ${result.errors.length} errors.`
      );
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  /**
   * GET /excel/export/inventory/:branchId
   */
  static async exportInventory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const branchId = req.params.branchId;
      const buffer = await ExcelService.exportInventoryToExcel(branchId);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="FBCPOS_Inventory_Stock_${new Date().toISOString().split('T')[0]}.xlsx"`
      );
      return res.send(buffer);
    } catch (err: any) {
      return next(err);
    }
  }
}
