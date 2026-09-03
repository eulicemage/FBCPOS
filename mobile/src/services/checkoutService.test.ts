import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateInvoiceNumber,
  resetInvoiceSequence,
  validatePayments,
  finalizeCheckout,
  TenderEntry,
} from './checkoutService';
import { CartItem, DiscountType } from '../../../shared/src';

const makeTender = (overrides: Partial<TenderEntry> = {}): TenderEntry => ({
  id: 'pay-1',
  method: 'CASH',
  amount: 100,
  amountTendered: 100,
  changeAmount: 0,
  ...overrides,
});

const makeCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  productId: 'p1',
  sku: 'BEV-001',
  barcode: '4800016601011',
  name: 'Fresh Whole Milk 1L',
  costPrice: 72,
  unitPrice: 95,
  quantity: 1,
  discountAmount: 0,
  taxAmount: 10.18,
  subtotal: 95,
  total: 95,
  isTaxable: true,
  taxRate: 0.12,
  ...overrides,
});

describe('CheckoutService', () => {
  beforeEach(() => {
    resetInvoiceSequence();
  });

  describe('generateInvoiceNumber', () => {
    it('generates sequential invoice numbers', () => {
      const inv1 = generateInvoiceNumber('001', '1');
      const inv2 = generateInvoiceNumber('001', '1');

      expect(inv1).toMatch(/^BR-001-T1-\d{8}-0001$/);
      expect(inv2).toMatch(/^BR-001-T1-\d{8}-0002$/);
    });

    it('different terminals have independent sequences', () => {
      const inv1 = generateInvoiceNumber('001', '1');
      const inv2 = generateInvoiceNumber('001', '2');

      expect(inv1).toContain('-T1-');
      expect(inv2).toContain('-T2-');
      expect(inv1).toContain('-0001');
      expect(inv2).toContain('-0001');
    });
  });

  describe('validatePayments', () => {
    it('accepts valid cash payment', () => {
      const result = validatePayments([makeTender({ amountTendered: 100 })], 95);
      expect(result.isValid).toBe(true);
      expect(result.totalChange).toBe(5);
    });

    it('rejects insufficient payment', () => {
      const result = validatePayments([makeTender({ amountTendered: 50 })], 95);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('rejects card payment without reference', () => {
      const result = validatePayments(
        [makeTender({ method: 'CARD', amountTendered: 95, referenceNumber: undefined })],
        95
      );
      expect(result.isValid).toBe(false);
    });

    it('accepts card payment with reference', () => {
      const result = validatePayments(
        [makeTender({ method: 'CARD', amountTendered: 95, referenceNumber: 'AUTH-12345' })],
        95
      );
      expect(result.isValid).toBe(true);
    });

    it('validates split tender totals', () => {
      const payments = [
        makeTender({ id: 'p1', method: 'CASH', amount: 50, amountTendered: 50 }),
        makeTender({ id: 'p2', method: 'EWALLET_GCASH', amount: 50, amountTendered: 50, referenceNumber: '123456789012' }),
      ];
      const result = validatePayments(payments, 95);
      expect(result.isValid).toBe(true);
      expect(result.totalTendered).toBe(100);
      expect(result.totalChange).toBe(5);
    });
  });

  describe('finalizeCheckout', () => {
    it('creates a complete sale record for cash payment', () => {
      const items = [makeCartItem()];
      const payments = [makeTender({ amount: 95, amountTendered: 100, changeAmount: 5 })];

      const result = finalizeCheckout(
        items,
        payments,
        {
          subtotalAmount: 95,
          discountType: DiscountType.NONE,
          discountValue: 0,
          discountAmount: 0,
          vatableAmount: 84.82,
          vatExemptAmount: 0,
          taxAmount: 10.18,
          totalAmount: 95,
        },
        {},
        {
          branchCode: '001',
          terminalNumber: '1',
          cashierId: 'user-1',
          cashierName: 'Juan Dela Cruz',
        }
      );

      expect(result.success).toBe(true);
      expect(result.sale).toBeDefined();
      expect(result.sale!.invoiceNumber).toMatch(/^BR-001-T1-\d{8}-0001$/);
      expect(result.sale!.items).toHaveLength(1);
      expect(result.sale!.payments).toHaveLength(1);
      expect(result.sale!.totalAmount).toBe(95);
      expect(result.sale!.totalTendered).toBe(100);
      expect(result.sale!.totalChange).toBe(5);
      expect(result.sale!.status).toBe('COMPLETED');
    });

    it('rejects empty cart', () => {
      const result = finalizeCheckout(
        [],
        [makeTender()],
        {
          subtotalAmount: 0,
          discountType: DiscountType.NONE,
          discountValue: 0,
          discountAmount: 0,
          vatableAmount: 0,
          vatExemptAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
        },
        {},
        { branchCode: '001', terminalNumber: '1', cashierId: 'u1', cashierName: 'Test' }
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cart is empty.');
    });

    it('handles Senior/PWD discount checkout', () => {
      const items = [makeCartItem({ discountAmount: 16.96, taxAmount: 0, total: 67.86 })];
      const payments = [makeTender({ amount: 67.86, amountTendered: 100, changeAmount: 32.14 })];

      const result = finalizeCheckout(
        items,
        payments,
        {
          subtotalAmount: 95,
          discountType: DiscountType.SENIOR_PWD,
          discountValue: 20,
          discountAmount: 16.96,
          vatableAmount: 0,
          vatExemptAmount: 84.82,
          taxAmount: 0,
          totalAmount: 67.86,
        },
        { customerName: 'Maria Santos', seniorIdNumber: 'OSCA-2024-001' },
        { branchCode: '001', terminalNumber: '1', cashierId: 'u1', cashierName: 'Test' }
      );

      expect(result.success).toBe(true);
      expect(result.sale!.discountType).toBe(DiscountType.SENIOR_PWD);
      expect(result.sale!.seniorIdNumber).toBe('OSCA-2024-001');
      expect(result.sale!.customerName).toBe('Maria Santos');
    });
  });
});
