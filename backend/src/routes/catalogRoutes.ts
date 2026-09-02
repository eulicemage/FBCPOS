import { Router } from 'express';
import { CatalogController } from '../controllers/catalogController';

export const catalogRouter = Router();

catalogRouter.get('/sync', CatalogController.sync);
catalogRouter.get('/search', CatalogController.search);
catalogRouter.get('/barcode/:barcode', CatalogController.getByBarcode);
