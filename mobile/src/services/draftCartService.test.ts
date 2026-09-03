import { describe, it, expect, beforeEach } from 'vitest';
import { DraftCartService } from './draftCartService';
import { DiscountType, CartItem } from '../../../shared/src';

describe('DraftCartService', () => {
  beforeEach(() => {
    DraftCartService.clearDraft();
  });

  const sampleItem: CartItem = {
    productId: 'p1',
    sku: 'MILK-001',
    barcode: '480000000001',
    name: 'Fresh Whole Milk 1L',
    costPrice: 75.0,
    unitPrice: 95.0,
    quantity: 2,
    discountAmount: 0,
    taxAmount: 20.36,
    subtotal: 190.0,
    total: 190.0,
    isTaxable: true,
    taxRate: 0.12,
  };

  it('saves and restores draft cart', () => {
    DraftCartService.saveDraft(
      [sampleItem],
      DiscountType.NONE,
      0,
      'Juan Dela Cruz',
      undefined,
      undefined,
      190.0
    );

    const draft = DraftCartService.getPendingDraft();
    expect(draft).not.toBeNull();
    expect(draft?.customerName).toBe('Juan Dela Cruz');
    expect(draft?.itemCount).toBe(2);
    expect(draft?.totalAmount).toBe(190.0);
  });

  it('clears draft cart', () => {
    DraftCartService.saveDraft(
      [sampleItem],
      DiscountType.NONE,
      0
    );
    expect(DraftCartService.getPendingDraft()).not.toBeNull();

    DraftCartService.clearDraft();
    expect(DraftCartService.getPendingDraft()).toBeNull();
  });
});
