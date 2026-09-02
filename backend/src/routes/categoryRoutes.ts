import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';
import { authenticate, authorize } from '../middleware/authMiddleware';

export const categoryRouter = Router();

// Categories can be read by all authenticated users
categoryRouter.use(authenticate);
categoryRouter.get('/', CategoryController.list);
categoryRouter.get('/:id', CategoryController.getById);

// Modifications restricted to Admin and Branch Managers
categoryRouter.post('/', authorize(['ADMIN', 'MANAGER']), CategoryController.create);
categoryRouter.put('/:id', authorize(['ADMIN', 'MANAGER']), CategoryController.update);
categoryRouter.delete('/:id', authorize(['ADMIN', 'MANAGER']), CategoryController.deactivate);

