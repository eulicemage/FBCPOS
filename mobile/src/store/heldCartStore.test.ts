import { describe, it, expect, beforeEach } from 'vitest';
import { useHeldCartStore } from './heldCartStore';
import { DiscountType } from '../../../shared/src';

describe('Held Cart Store (Queue Management)', () => {
  beforeEach(() => {
    useHeldCartStore.setState({ heldCarts: [] });
  });

  it('holds a valid cart and returns a ticket number', () => {
    const store = useHeldCartStore.getState();
    const dummyItems = [
      {
        productId: 'p1',
        sku: 'BEV-001',
        barcode: '4800016601011',
        name: 'Fresh Whole Milk 1L',
        quantity: 2,
        costPrice: 72.0,
        unitPrice: 95.0,
        subtotal: 190.0,
        discountAmount: 0,
        taxAmount: 20.36,
        total: 190.0,
        isTaxable: true,
        taxRate: 0.12,
      },
    ];

    const held = store.holdCart(dummyItems, 190.0, DiscountType.NONE, 0, 'Customer Juan');
    expect(held).toBeDefined();
    expect(held?.ticketNumber).toMatch(/^HOLD-\d{4}$/);
    expect(held?.itemCount).toBe(2);
    expect(useHeldCartStore.getState().heldCarts.length).toBe(1);
  });

  it('recalls a held cart and removes it from the held queue', () => {
    const store = useHeldCartStore.getState();
    const dummyItems = [
      {
        productId: 'p2',
        sku: 'BAK-001',
        barcode: '4800026602012',
        name: 'Whole Wheat Loaf',
        quantity: 1,
        costPrice: 48.0,
        unitPrice: 65.0,
        subtotal: 65.0,
        discountAmount: 0,
        taxAmount: 6.96,
        total: 65.0,
        isTaxable: true,
        taxRate: 0.12,
      },
    ];

    const held = store.holdCart(dummyItems, 65.0, DiscountType.NONE, 0);
    expect(held).not.toBeNull();

    const recalled = useHeldCartStore.getState().recallCart(held!.id);
    expect(recalled).toBeDefined();
    expect(recalled?.items.length).toBe(1);
    expect(useHeldCartStore.getState().heldCarts.length).toBe(0);
  });
});
