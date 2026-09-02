import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cartStore';
import { Product, DiscountType } from '../../../shared/src';

const testProduct: Product = {
  id: 'prod-1',
  categoryId: 'cat-1',
  sku: 'TEST-001',
  barcode: '1234567890123',
  name: 'Test Bread',
  costPrice: 40.0,
  sellingPrice: 50.0,
  isTaxable: true,
  taxRate: 0.12,
  unitOfMeasure: 'PCS',
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

describe('Mobile Cart Store', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('adds product to cart and updates subtotal and totals', () => {
    const store = useCartStore.getState();
    store.addItem(testProduct, 2);

    const updated = useCartStore.getState();
    expect(updated.items.length).toBe(1);
    expect(updated.items[0].quantity).toBe(2);
    expect(updated.getSubtotal()).toBe(100.0);
    expect(updated.getTotalAmount()).toBe(100.0);
  });

  it('increments quantity when adding same product', () => {
    const store = useCartStore.getState();
    store.addItem(testProduct, 1);
    store.addItem(testProduct, 3);

    const updated = useCartStore.getState();
    expect(updated.items.length).toBe(1);
    expect(updated.items[0].quantity).toBe(4);
    expect(updated.getTotalAmount()).toBe(200.0);
  });

  it('applies percentage discount to all cart items', () => {
    const store = useCartStore.getState();
    store.addItem(testProduct, 2); // 100.00
    store.applyDiscount(DiscountType.PERCENTAGE, 10);

    const updated = useCartStore.getState();
    expect(updated.getSubtotal()).toBe(100.0);
    expect(updated.getDiscountAmount()).toBe(10.0);
    expect(updated.getTotalAmount()).toBe(90.0);
  });
});
