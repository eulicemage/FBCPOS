import { describe, it, expect } from 'vitest';
import { PrinterService, ESCPOSBuilder } from './printerService';

describe('ESC/POS Printer Service', () => {
  it('correctly calculates columns for different paper widths', () => {
    expect(PrinterService.getColumns('80MM')).toBe(48);
    expect(PrinterService.getColumns('70MM')).toBe(40); // Xprinter 70x50mm
    expect(PrinterService.getColumns('58MM')).toBe(32);
  });

  it('generates 70mm receipt for Xprinter with member points', () => {
    const receiptBytes = PrinterService.formatReceipt(
      {
        branchName: 'Branch 001 - Downtown Flagship',
        branchAddress: '123 Rizal Ave, Manila',
        taxId: '100-001-000-000',
        invoiceNumber: 'BR-001-T1-20260903-0001',
        cashierName: 'Maria Santos',
        terminalNumber: 'T1',
        shiftNumber: '101',
        memberBarcode: '990001001',
        memberPointsBalance: 1250.0,
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
        amountReceived: 190.0,
        changeAmount: 0.0,
        paymentMethod: 'POINTS',
        date: '2026-09-03 17:15:00',
      },
      { paperWidth: '70MM' }
    );

    expect(receiptBytes).toBeInstanceOf(Uint8Array);
    expect(receiptBytes.length).toBeGreaterThan(100);
    // Init command ESC @ (0x1b, 0x40)
    expect(receiptBytes[0]).toBe(0x1b);
    expect(receiptBytes[1]).toBe(0x40);
  });

  it('generates official X-Reading Report (Switch Cashier)', () => {
    const xReadBytes = PrinterService.formatXReading(
      {
        branchName: 'Branch 001 - Downtown Flagship',
        branchAddress: '123 Rizal Ave, Manila',
        taxId: '100-001-000-000',
        terminalNumber: 'T1',
        shiftNumber: '101',
        cashierName: 'Maria Santos',
        openedAt: '2026-09-03 08:00:00',
        closedAt: '2026-09-03 12:00:00',
        openingCash: 2000.0,
        grossSales: 8450.0,
        discountAmount: 250.0,
        netSales: 8200.0,
        vatableSales: 7321.43,
        vatExemptSales: 0.0,
        vatAmount: 878.57,
        cashCollected: 5200.0,
        cardTotal: 1500.0,
        gcashTotal: 1000.0,
        mayaTotal: 0.0,
        pointsTotal: 500.0,
        declaredCash: 7200.0,
        cashDifference: 0.0,
        transactionCount: 28,
        voidCount: 1,
      },
      { paperWidth: '70MM' }
    );

    expect(xReadBytes).toBeInstanceOf(Uint8Array);
    expect(xReadBytes.length).toBeGreaterThan(200);
  });

  it('generates official Z-Reading Report (Store Close)', () => {
    const zReadBytes = PrinterService.formatZReading(
      {
        branchName: 'Branch 001 - Downtown Flagship',
        branchAddress: '123 Rizal Ave, Manila',
        taxId: '100-001-000-000',
        terminalNumber: 'T1',
        date: '2026-09-03',
        openedAt: '2026-09-03 08:00:00',
        closedAt: '2026-09-03 21:00:00',
        managerName: 'Juan Dela Cruz',
        zCounter: 42,
        previousGrandTotal: 154200.0,
        todaysGrossSales: 28650.0,
        newGrandTotal: 182850.0,
        todaysDiscounts: 850.0,
        todaysNetSales: 27800.0,
        vatableSales: 24821.43,
        vatExemptSales: 0.0,
        vatAmount: 2978.57,
        cashTotal: 18500.0,
        cardTotal: 5200.0,
        gcashTotal: 3100.0,
        mayaTotal: 0.0,
        pointsTotal: 1000.0,
        totalTransactions: 94,
        totalVoids: 3,
      },
      { paperWidth: '70MM' }
    );

    expect(zReadBytes).toBeInstanceOf(Uint8Array);
    expect(zReadBytes.length).toBeGreaterThan(250);
  });

  it('generates standalone drawer kick pulse', () => {
    const kickPin2 = PrinterService.formatDrawerKick('PIN_2');
    expect(kickPin2[0]).toBe(0x1b);
    expect(kickPin2[1]).toBe(0x40); // Init
    expect(kickPin2[2]).toBe(0x1b);
    expect(kickPin2[3]).toBe(0x70); // Kick
    expect(kickPin2[4]).toBe(0x00); // Pin 2
  });
});
