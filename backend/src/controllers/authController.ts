import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().optional(),
  pin: z.string().optional(),
  terminalId: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const registerTerminalSchema = z.object({
  deviceUid: z.string().min(1),
  activationToken: z.string().min(1),
});

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password, pin, terminalId } = loginSchema.parse(req.body);
      const result = await AuthService.login(username, password, pin, terminalId);
      return sendSuccess(res, result, 'Login successful');
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await AuthService.refreshToken(refreshToken);
      return sendSuccess(res, result, 'Token refreshed');
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }

  static async registerTerminal(req: Request, res: Response, next: NextFunction) {
    try {
      const { deviceUid, activationToken } = registerTerminalSchema.parse(req.body);
      const result = await AuthService.registerTerminal(deviceUid, activationToken);
      return sendSuccess(res, result, 'Terminal registered successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
