import { describe, it, expect, vi } from 'vitest';
import { CategoryService } from './categoryService';

describe('Category Service', () => {
  it('validates duplicate category codes are rejected', async () => {
    // Attempting to create category with invalid or duplicate code
    await expect(
      CategoryService.createCategory({
        name: 'Beverages Duplicate',
        code: 'BEV', // Already seeded in database
      })
    ).rejects.toThrow();
  });
});
