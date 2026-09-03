import { describe, it, expect, beforeEach } from 'vitest';
import { useShiftStore } from './shiftStore';
import { SaleRecord } from '../services/checkoutService';
import { DiscountType } from '../../../shared/src';

const makeMockSale = (overrides: Partial<SaleRecord> = {}): SaleRecord => ({
  id: 'sale-test-1',
  invoiceNumber: 'BR-001-T1-20260903-0001',
  branchCode: '001',
  terminalNumber: 'T1',
  cashierId: 'c1',
  cashierName: 'Maria Santos',
  items: [],
  subtotalAmount: 100.0,
  discountType: DiscountType.NONE,
  discountValue: 0,
  discountAmount: 0.0,
  vatableAmount: 89.29,
  vatExemptAmount: 0.0,
  taxAmount: 10.71,
  totalAmount: 100.0,
  payments: [
    {
      id: 'pay-1',
      method: 'CASH',
      amount: 100.0,
      amountTendered: 100.0,
      changeAmount: 0.0,
    },
  ],
  totalTendered: 100.0,
  totalChange: 0.0,
  status: 'COMPLETED',
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('ShiftStore', () => {
  beforeEach(() => {
    useShiftStore.getState().resetToDefaults();
  });

  it('tracks sales in active shift', () => {
    const sale = makeMockSale();
    useShiftStore.getState().recordSale(sale);

    const shift = useShiftStore.getState().currentShift;
    expect(shift?.grossSales).toBe(100.0);
    expect(shift?.netSales).toBe(100.0);
    expect(shift?.cashCollected).toBe(100.0);
    expect(shift?.transactionCount).toBe(1);
  });

  it('generates X-reading and closes shift (handover)', () => {
    const sale = makeMockSale();
    useShiftStore.getState().recordSale(sale);

    // Opening cash was 2000. Cash collected is 100. Expected is 2100.
    // Cashier declares 2100 -> Difference is 0.
    const xRead = useShiftStore.getState().closeShiftWithXReading(2100.0);

    expect(xRead.status).toBe('CLOSED');
    expect(xRead.declaredCash).toBe(2100.0);
    expect(xRead.cashDifference).toBe(0.0);
    expect(useShiftStore.getState().currentShift).toBeNull();
    expect(useShiftStore.getState().completedShifts.length).toBe(1);
  });

  it('starts a new shift for the incoming cashier', () => {
    useShiftStore.getState().closeShiftWithXReading(2000.0);

    const newShift = useShiftStore.getState().startShift('Roberto Gomez', 1500.0, 'T1');
    expect(newShift.cashierName).toBe('Roberto Gomez');
    expect(newShift.openingCash).toBe(1500.0);
    expect(newShift.status).toBe('OPEN');
    expect(useShiftStore.getState().currentShift?.cashierName).toBe('Roberto Gomez');
  });

  it('generates Z-reading across multiple shifts and updates cumulative grand total', () => {
    // Shift 1: 100 sale
    useShiftStore.getState().recordSale(makeMockSale({ subtotalAmount: 100, totalAmount: 100 }));
    useShiftStore.getState().closeShiftWithXReading();

    // Shift 2: 250 sale
    useShiftStore.getState().startShift('Roberto Gomez', 1500.0);
    useShiftStore.getState().recordSale(makeMockSale({ subtotalAmount: 250, totalAmount: 250 }));

    // Generate Z-reading (Store Close)
    const zRead = useShiftStore.getState().generateZReading('Manager Juan');

    expect(zRead.todaysGrossSales).toBe(350.0);
    expect(zRead.todaysNetSales).toBe(350.0);
    expect(zRead.previousGrandTotal).toBe(154200.0);
    expect(zRead.newGrandTotal).toBe(154550.0);
    expect(zRead.totalTransactions).toBe(2);
    expect(useShiftStore.getState().isStoreOpen).toBe(false);
  });
});
