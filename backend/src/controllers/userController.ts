import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserService } from '../services/userService';
import { sendSuccess, sendError } from '../utils/response';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  fullName: z.string().min(2).max(100),
  role: z.nativeEnum(UserRole),
  password: z.string().min(6).optional(),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits').optional(),
  branchId: z.string().optional(),
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  role: z.nativeEnum(UserRole).optional(),
  branchId: z.string().optional(),
  isActive: z.boolean().optional(),
});

const changePinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
});

const supervisorOverrideSchema = z.object({
  branchId: z.string().min(1),
  pin: z.string().min(4),
});

export class UserController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string | undefined;
      const users = await UserService.listUsers(req.user as any, branchId);
      return sendSuccess(res, users);
    } catch (err: any) {
      return sendError(res, err.message, 403);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await UserService.createUser(req.user as any, data);
      return sendSuccess(res, user, 'User created successfully', 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendError(res, 'Validation error', 400, err.errors);
      }
      return sendError(res, err.message, 400);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id;
      const data = updateUserSchema.parse(req.body);
      const user = await UserService.updateUser(req.user as any, userId, data);
      return sendSuccess(res, user, 'User updated successfully');
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendError(res, 'Validation error', 400, err.errors);
      }
      return sendError(res, err.message, 400);
    }
  }

  static async resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id;
      const { password } = req.body;
      const result = await UserService.resetPassword(userId, password);
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async changePin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id;
      const { pin } = changePinSchema.parse(req.body);
      const result = await UserService.changePin(userId, pin);
      return sendSuccess(res, result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendError(res, 'Validation error', 400, err.errors);
      }
      return sendError(res, err.message, 400);
    }
  }

  static async verifySupervisorOverride(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { branchId, pin } = supervisorOverrideSchema.parse(req.body);
      const result = await UserService.verifySupervisorPin(branchId, pin);
      return sendSuccess(res, result, 'Supervisor override verified');
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }
}
