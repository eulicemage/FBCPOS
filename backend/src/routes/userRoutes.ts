import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/authMiddleware';

export const userRouter = Router();

// All user routes require authentication
userRouter.use(authenticate);

// List users (Admin, Manager, Auditor)
userRouter.get('/', authorize(['ADMIN', 'MANAGER', 'AUDITOR']), UserController.list);

// Create user (Admin, Manager)
userRouter.post('/', authorize(['ADMIN', 'MANAGER']), UserController.create);

// Update user details or deactivate (Admin, Manager)
userRouter.put('/:id', authorize(['ADMIN', 'MANAGER']), UserController.update);

// Reset password (Admin, Manager)
userRouter.post('/:id/reset-password', authorize(['ADMIN', 'MANAGER']), UserController.resetPassword);

// Change own or managed PIN
userRouter.post('/:id/change-pin', UserController.changePin);

// Supervisor PIN verification for POS terminal overrides
userRouter.post('/supervisor/verify-pin', UserController.verifySupervisorOverride);
