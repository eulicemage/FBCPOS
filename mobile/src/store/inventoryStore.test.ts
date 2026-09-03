import { describe, it, expect, beforeEach } from 'vitest';
import { useInventoryStore } from './inventoryStore';

describe('InventoryStore', () => {
  beforeEach(() => {
    useInventoryStore.getState().resetToDefaults();
  });

  it('retrieves initial stock levels', () => {
    expect(useInventoryStore.getState().getStockQuantity('p1')).toBe(42);
    expect(useInventoryStore.getState().getStockQuantity('p2')).toBe(8);
  });

  it('records STOCK_IN movement and updates stock level', () => {
    const mov = useInventoryStore.getState().recordMovement({
      productId: 'p1',
      productName: 'Fresh Whole Milk 1L',
      quantityChange: 10,
      movementType: 'STOCK_IN',
      reason: 'New delivery',
    });

    expect(mov.previousQuantity).toBe(42);
    expect(mov.newQuantity).toBe(52);
    expect(useInventoryStore.getState().getStockQuantity('p1')).toBe(52);
  });

  it('handles customer RETURN_RESTOCK by returning item to sellable inventory', () => {
    const mov = useInventoryStore.getState().recordMovement({
      productId: 'p2',
      productName: 'Orange Juice 1L Pure',
      quantityChange: 2,
      movementType: 'RETURN_RESTOCK',
      reason: 'Customer return (sealed)',
    });

    expect(mov.previousQuantity).toBe(8);
    expect(mov.newQuantity).toBe(10);
    expect(useInventoryStore.getState().getStockQuantity('p2')).toBe(10);
  });

  it('handles customer RETURN_DAMAGE by recording write-off without increasing stock', () => {
    const mov = useInventoryStore.getState().recordMovement({
      productId: 'p2',
      productName: 'Orange Juice 1L Pure',
      quantityChange: 1,
      movementType: 'RETURN_DAMAGE',
      reason: 'Customer return (broken seal)',
    });

    expect(mov.movementType).toBe('RETURN_DAMAGE');
    // Balance should remain unchanged
    expect(useInventoryStore.getState().getStockQuantity('p2')).toBe(8);
  });

  it('maintains full chronological audit history', () => {
    useInventoryStore.getState().recordMovement({
      productId: 'p3',
      productName: 'Whole Wheat Loaf 500g',
      quantityChange: 5,
      movementType: 'STOCK_IN',
      reason: 'Bakery batch',
    });

    const movements = useInventoryStore.getState().getMovements('p3');
    expect(movements.length).toBe(1);
    expect(movements[0].reason).toBe('Bakery batch');
  });
});
