import { Router } from 'express';
import { CatalogController } from '../controllers/catalogController';
import { authenticate, authorize } from '../middleware/authMiddleware';

export const catalogRouter = Router();

// Public / Cashier queries
catalogRouter.get('/sync', CatalogController.sync);
catalogRouter.get('/search', CatalogController.search);
catalogRouter.get('/barcode/:barcode', CatalogController.getByBarcode);
catalogRouter.get('/:id', CatalogController.getById);

// Admin & Manager product modifications
catalogRouter.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), CatalogController.create);
catalogRouter.put('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), CatalogController.update);
catalogRouter.delete('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), CatalogController.deactivate);
