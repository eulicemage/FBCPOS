import { describe, it, expect } from 'vitest';
import { InventoryService } from './inventoryService';

describe('Inventory Service Validation & Movement Rules', () => {
  it('rejects stock in with non-positive quantity', async () => {
    await expect(
      InventoryService.recordStockIn('BR-001', 'p1', 0, 'USR-001')
    ).rejects.toThrow('Quantity must be positive');

    await expect(
      InventoryService.recordStockIn('BR-001', 'p1', -5, 'USR-001')
    ).rejects.toThrow('Quantity must be positive');
  });

  it('rejects stock out with non-positive quantity', async () => {
    await expect(
      InventoryService.recordStockOut('BR-001', 'p1', -10, 'USR-001')
    ).rejects.toThrow('Quantity must be positive');
  });

  it('rejects physical count adjustment with negative quantity', async () => {
    await expect(
      InventoryService.recordAdjustment('BR-001', 'p1', -1, 'USR-001', 'Test')
    ).rejects.toThrow('Counted physical stock cannot be negative');
  });
});

