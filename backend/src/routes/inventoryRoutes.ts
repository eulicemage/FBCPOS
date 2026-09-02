import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';
import { authenticate } from '../middleware/authMiddleware';

export const inventoryRouter = Router();

inventoryRouter.get('/:branchId', InventoryController.getBranchInventory);
inventoryRouter.post('/movement', authenticate, InventoryController.recordMovement);
