import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const prisma = new PrismaClient();

export class AuthService {
  static async login(username: string, password?: string, pin?: string, terminalId?: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: true },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid username or user is deactivated');
    }

    if (password) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }
    } else if (pin) {
      // Offline / PIN authentication verification
      const isPinValid = user.pinHash === pin;
      if (!isPinValid) {
        throw new Error('Invalid PIN code');
      }
    } else {
      throw new Error('Password or PIN required');
    }

    const payload = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      branchId: user.branchId,
      branchCode: user.branch?.code,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });

    const refreshToken = jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch?.name,
      },
    };
  }

  static async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { branch: true },
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      const payload = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId,
        branchCode: user.branch?.code,
      };

      const newAccessToken = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn as any,
      });

      return { accessToken: newAccessToken };
    } catch (err) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static async registerTerminal(deviceUid: string, activationCode: string) {
    const terminal = await prisma.terminal.findUnique({
      where: { deviceUid },
      include: { branch: true },
    });

    if (!terminal) {
      throw new Error(`Terminal with device UID ${deviceUid} not registered by administrator`);
    }

    return {
      terminalId: terminal.id,
      terminalNumber: terminal.terminalNumber,
      terminalName: terminal.name,
      branchId: terminal.branchId,
      branchCode: terminal.branch.code,
      branchName: terminal.branch.name,
      taxId: terminal.branch.taxId,
      address: terminal.branch.address,
    };
  }
}
