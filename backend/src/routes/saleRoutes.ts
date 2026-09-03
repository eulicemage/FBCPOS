import { Router } from 'express';
import { SaleController } from '../controllers/saleController';
import { authenticate, authorize } from '../middleware/authMiddleware';

export const saleRouter = Router();

saleRouter.use(authenticate);

saleRouter.get('/', SaleController.listSales);
saleRouter.get('/daily-summary', SaleController.getDailySummary);
saleRouter.get('/:id', SaleController.getSaleById);
saleRouter.post('/:id/cancel', authorize(['ADMIN', 'MANAGER']), SaleController.cancelSale);
