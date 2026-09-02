import { describe, it, expect } from 'vitest';
import { PrinterService, ESCPOSBuilder } from './printerService';

describe('ESC/POS Printer Service', () => {
  it('generates non-empty byte buffer with ESC/POS commands', () => {
    const receiptBytes = PrinterService.formatReceipt({
      branchName: 'Branch 001 - Downtown Flagship',
      branchAddress: '123 Rizal Ave, Manila',
      taxId: '100-001-000-000',
      invoiceNumber: 'BR-001-T1-20260902-0001',
      cashierName: 'Maria Santos',
      terminalNumber: 'T1',
      shiftNumber: '101',
      items: [
        {
          name: 'Fresh Whole Milk 1L',
          quantity: 2,
          unitPrice: 95.0,
          totalAmount: 190.0,
        },
      ],
      subtotal: 190.0,
      discountAmount: 0.0,
      vatableAmount: 169.64,
      vatAmount: 20.36,
      totalDue: 190.0,
      amountReceived: 200.0,
      changeAmount: 10.0,
      paymentMethod: 'CASH',
      date: '2026-09-02 17:15:00',
    });

    expect(receiptBytes).toBeInstanceOf(Uint8Array);
    expect(receiptBytes.length).toBeGreaterThan(50);
    // Verify ESC @ (0x1b, 0x40) init command at start
    expect(receiptBytes[0]).toBe(0x1b);
    expect(receiptBytes[1]).toBe(0x40);
  });
});
