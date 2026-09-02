import { describe, it, expect, vi } from 'vitest';
import { hashPin, UserService } from './userService';
import { UserRole } from '@prisma/client';

describe('User Service & RBAC Logic', () => {
  it('correctly hashes PIN codes with SHA-256', () => {
    const hash = hashPin('1234');
    expect(hash).toBe('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
  });

  it('enforces branch manager can only create Cashiers', async () => {
    const requestingManager = {
      role: UserRole.MANAGER,
      branchId: 'BR-001',
    };

    await expect(
      UserService.createUser(requestingManager, {
        username: 'test.admin',
        fullName: 'Test Admin',
        role: UserRole.ADMIN,
      })
    ).rejects.toThrow('Branch Managers can only create Cashier accounts');
  });
});
