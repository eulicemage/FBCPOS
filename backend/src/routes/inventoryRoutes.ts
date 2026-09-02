import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';
import { authenticate, authorize } from '../middleware/authMiddleware';

export const inventoryRouter = Router();

// Read operations
inventoryRouter.get('/:branchId', InventoryController.getBranchInventory);
inventoryRouter.get('/reorder-alerts/:branchId', InventoryController.getReorderAlerts);
inventoryRouter.get('/movements/:branchId', authenticate, InventoryController.getMovements);

// Operations requiring Authentication & Roles
inventoryRouter.use(authenticate);

// Stock In & Out (Admin & Manager)
inventoryRouter.post('/stock-in', authorize(['ADMIN', 'MANAGER']), InventoryController.stockIn);
inventoryRouter.post('/stock-out', authorize(['ADMIN', 'MANAGER']), InventoryController.stockOut);

// Adjustments & Damage (Admin, Manager, Auditor)
inventoryRouter.post('/adjust', authorize(['ADMIN', 'MANAGER', 'AUDITOR']), InventoryController.adjust);
inventoryRouter.post('/damage', authorize(['ADMIN', 'MANAGER']), InventoryController.recordDamage);

// Generic movement endpoint
inventoryRouter.post('/movement', authorize(['ADMIN', 'MANAGER']), InventoryController.recordMovement);
