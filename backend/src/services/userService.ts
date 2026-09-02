import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

export class UserService {
  static async listUsers(requestingUser: { role: string; branchId?: string }, branchIdFilter?: string) {
    let whereClause: any = {};

    if (requestingUser.role === UserRole.ADMIN || requestingUser.role === UserRole.AUDITOR) {
      if (branchIdFilter) {
        whereClause.branchId = branchIdFilter;
      }
    } else if (requestingUser.role === UserRole.MANAGER) {
      // Branch managers can only view users in their own branch
      whereClause.branchId = requestingUser.branchId;
    } else {
      throw new Error('Unauthorized to view user list');
    }

    return await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
  }

  static async createUser(
    requestingUser: { role: string; branchId?: string },
    data: {
      username: string;
      fullName: string;
      role: UserRole;
      password?: string;
      pin?: string;
      branchId?: string;
    }
  ) {
    // Permission validation:
    // Managers can only create Cashiers in their own branch
    if (requestingUser.role === UserRole.MANAGER) {
      if (data.role !== UserRole.CASHIER) {
        throw new Error('Branch Managers can only create Cashier accounts');
      }
      data.branchId = requestingUser.branchId;
    }

    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      throw new Error(`Username '${data.username}' is already taken`);
    }

    const initialPassword = data.password || 'Fbc@123456';
    const initialPin = data.pin || '1234';

    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const pinHash = hashPin(initialPin);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        fullName: data.fullName,
        role: data.role,
        branchId: data.branchId || null,
        passwordHash,
        pinHash,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  static async updateUser(
    requestingUser: { role: string; branchId?: string },
    userId: string,
    data: {
      fullName?: string;
      role?: UserRole;
      branchId?: string;
      isActive?: boolean;
    }
  ) {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new Error('User not found');
    }

    if (requestingUser.role === UserRole.MANAGER) {
      if (targetUser.branchId !== requestingUser.branchId || targetUser.role !== UserRole.CASHIER) {
        throw new Error('Branch Managers can only update Cashiers in their own branch');
      }
      if (data.role && data.role !== UserRole.CASHIER) {
        throw new Error('Branch Managers cannot elevate roles');
      }
      // Cannot move cashier to another branch
      delete data.branchId;
    }

    return await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        branchId: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  static async resetPassword(userId: string, newPassword?: string) {
    const password = newPassword || 'Fbc@123456';
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password reset successfully', temporaryPassword: password };
  }

  static async changePin(userId: string, newPin: string) {
    if (!/^\d{4,6}$/.test(newPin)) {
      throw new Error('PIN must be 4 to 6 numeric digits');
    }

    const pinHash = hashPin(newPin);

    await prisma.user.update({
      where: { id: userId },
      data: { pinHash },
    });

    return { message: 'PIN code updated successfully' };
  }

  /**
   * Verify Manager / Supervisor PIN override for sensitive operations on POS terminal.
   */
  static async verifySupervisorPin(branchId: string, pin: string) {
    const hashed = hashPin(pin);

    // Find any active Manager or Admin who has this PIN
    const supervisor = await prisma.user.findFirst({
      where: {
        pinHash: hashed,
        isActive: true,
        OR: [
          { role: UserRole.ADMIN },
          { role: UserRole.MANAGER, branchId },
        ],
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        branchId: true,
      },
    });

    if (!supervisor) {
      throw new Error('Invalid Supervisor PIN or insufficient privileges');
    }

    return {
      authorized: true,
      supervisor,
    };
  }
}
