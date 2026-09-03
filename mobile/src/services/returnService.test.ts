import { describe, it, expect, beforeEach } from 'vitest';
import {
  processReturnTransaction,
  useReturnStore,
  resetReturnCounter,
} from './returnService';
import { useInventoryStore } from '../store/inventoryStore';
import { useMemberStore } from '../store/memberStore';
import { SaleRecord } from './checkoutService';
import { DiscountType } from '../../../shared/src';

const makeMockOriginalSale = (overrides: Partial<SaleRecord> = {}): SaleRecord => ({
  id: 'orig-sale-1',
  invoiceNumber: 'BR-001-T1-20260903-0042',
  branchCode: '001',
  terminalNumber: '1',
  cashierId: 'c1',
  cashierName: 'Maria Santos',
  items: [
    {
      id: 'item-1',
      productId: 'p1',
      sku: 'BEV-001',
      barcode: '4800016601011',
      productName: 'Fresh Whole Milk 1L',
      costPrice: 72.0,
      unitPrice: 95.0,
      quantity: 2,
      discountAmount: 0.0,
      taxAmount: 20.36,
      totalAmount: 190.0,
    },
    {
      id: 'item-2',
      productId: 'p2',
      sku: 'BEV-002',
      barcode: '4800016601028',
      productName: 'Orange Juice 1L Pure',
      costPrice: 85.0,
      unitPrice: 110.0,
      quantity: 1,
      discountAmount: 0.0,
      taxAmount: 11.79,
      totalAmount: 110.0,
    },
  ],
  subtotalAmount: 300.0,
  discountType: DiscountType.NONE,
  discountValue: 0,
  discountAmount: 0.0,
  vatableAmount: 267.86,
  vatExemptAmount: 0.0,
  taxAmount: 32.14,
  totalAmount: 300.0,
  payments: [
    {
      id: 'pay-1',
      method: 'CASH',
      amount: 300.0,
      amountTendered: 300.0,
      changeAmount: 0.0,
    },
  ],
  totalTendered: 300.0,
  totalChange: 0.0,
  status: 'COMPLETED',
  createdAt: '2026-09-03T10:00:00Z',
  ...overrides,
});

describe('ReturnService', () => {
  beforeEach(() => {
    useReturnStore.getState().resetToDefaults();
    useInventoryStore.getState().resetToDefaults();
    useMemberStore.getState().resetToDefaults();
    resetReturnCounter();
  });

  it('successfully processes restock return and increases sellable stock', () => {
    const sale = makeMockOriginalSale();
    const initialMilkStock = useInventoryStore.getState().getStockQuantity('p1'); // 42

    const result = processReturnTransaction(
      sale,
      [
        {
          productId: 'p1',
          productName: 'Fresh Whole Milk 1L',
          quantity: 1,
          unitPrice: 95.0,
          refundAmount: 95.0,
          reason: 'CUSTOMER_CHANGE_OF_MIND',
          disposition: 'RESTOCK',
        },
      ],
      'CASH',
      'Cashier Maria'
    );

    expect(result.success).toBe(true);
    expect(result.returnRecord).toBeDefined();
    expect(result.returnRecord?.returnNumber).toMatch(/^RET-001-T1-\d{8}-0001$/);
    expect(result.returnRecord?.totalRefundAmount).toBe(95.0);

    // Stock should increase by 1
    expect(useInventoryStore.getState().getStockQuantity('p1')).toBe(initialMilkStock + 1);
  });

  it('processes damaged return write-off without increasing sellable stock', () => {
    const sale = makeMockOriginalSale();
    const initialJuiceStock = useInventoryStore.getState().getStockQuantity('p2'); // 8

    const result = processReturnTransaction(
      sale,
      [
        {
          productId: 'p2',
          productName: 'Orange Juice 1L Pure',
          quantity: 1,
          unitPrice: 110.0,
          refundAmount: 110.0,
          reason: 'DEFECTIVE_EXPIRED',
          disposition: 'SCRAP_WASTE',
        },
      ],
      'CASH',
      'Cashier Maria'
    );

    expect(result.success).toBe(true);
    // Stock should NOT increase because it is scrap waste
    expect(useInventoryStore.getState().getStockQuantity('p2')).toBe(initialJuiceStock);

    const movements = useInventoryStore.getState().getMovements('p2');
    expect(movements[0].movementType).toBe('RETURN_DAMAGE');
  });

  it('re-credits member allowance points on points refund', () => {
    // Maria Santos starts with 1500 points. Deduct 110.
    useMemberStore.getState().deductPoints('mem-1', 110.0);
    expect(useMemberStore.getState().findMemberById('mem-1')?.currentPointsBalance).toBe(1390.0);

    const sale = makeMockOriginalSale({
      memberBarcode: '990001001',
    });

    const result = processReturnTransaction(
      sale,
      [
        {
          productId: 'p2',
          productName: 'Orange Juice 1L Pure',
          quantity: 1,
          unitPrice: 110.0,
          refundAmount: 110.0,
          reason: 'WRONG_ITEM',
          disposition: 'RESTOCK',
        },
      ],
      'POINTS',
      'Cashier Maria'
    );

    expect(result.success).toBe(true);
    // Points restored back to 1500
    expect(useMemberStore.getState().findMemberById('mem-1')?.currentPointsBalance).toBe(1500.0);
  });

  it('rejects return if quantity exceeds original purchased quantity', () => {
    const sale = makeMockOriginalSale(); // Purchased 2 milks

    const result = processReturnTransaction(
      sale,
      [
        {
          productId: 'p1',
          productName: 'Fresh Whole Milk 1L',
          quantity: 5, // Try to return 5!
          unitPrice: 95.0,
          refundAmount: 475.0,
          reason: 'CUSTOMER_CHANGE_OF_MIND',
          disposition: 'RESTOCK',
        },
      ],
      'CASH',
      'Cashier Maria'
    );

    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toContain('Maximum purchased was 2');
  });
});

