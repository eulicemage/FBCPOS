import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { SaleRecord } from '../services/checkoutService';
import { useSyncQueueStore } from './syncQueueStore';

export interface ShiftRecord {
  id: string;
  shiftNumber: string;
  terminalNumber: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  grossSales: number;
  discountAmount: number;
  netSales: number;
  vatableSales: number;
  vatExemptSales: number;
  vatAmount: number;
  cashCollected: number;
  cardTotal: number;
  gcashTotal: number;
  mayaTotal: number;
  pointsTotal: number;
  declaredCash?: number;
  cashDifference?: number;
  transactionCount: number;
  voidCount: number;
  status: 'OPEN' | 'CLOSED';
}

export interface ZReadingRecord {
  id: string;
  zCounter: number;
  date: string;
  terminalNumber: string;
  managerName: string;
  openedAt: string;
  closedAt: string;
  previousGrandTotal: number;
  todaysGrossSales: number;
  newGrandTotal: number;
  todaysDiscounts: number;
  todaysNetSales: number;
  vatableSales: number;
  vatExemptSales: number;
  vatAmount: number;
  cashTotal: number;
  cardTotal: number;
  gcashTotal: number;
  mayaTotal: number;
  pointsTotal: number;
  totalTransactions: number;
  totalVoids: number;
  shiftsIncluded: string[];
}

interface ShiftStoreState {
  currentShift: ShiftRecord | null;
  shiftCounter: number;
  zCounter: number;
  cumulativeGrandTotal: number;
  completedShifts: ShiftRecord[];
  zReadings: ZReadingRecord[];
  isStoreOpen: boolean;

  startShift: (cashierName: string, openingCash: number, terminalNumber?: string) => ShiftRecord;
  recordSale: (sale: SaleRecord) => void;
  recordVoid: () => void;
  closeShiftWithXReading: (declaredCash?: number) => ShiftRecord;
  generateZReading: (managerName: string) => ZReadingRecord;
  getDailySummary: () => {
    grossSales: number;
    discounts: number;
    netSales: number;
    vatableSales: number;
    vatExemptSales: number;
    vatAmount: number;
    cashTotal: number;
    cardTotal: number;
    gcashTotal: number;
    mayaTotal: number;
    pointsTotal: number;
    transactionCount: number;
    voidCount: number;
  };
  resetToDefaults: () => void;
}

const INITIAL_OPEN_SHIFT: ShiftRecord = {
  id: 'shift-init-1',
  shiftNumber: '101',
  terminalNumber: 'T1',
  cashierName: 'Maria Santos',
  openedAt: new Date().toISOString(),
  openingCash: 2000.0,
  grossSales: 0.0,
  discountAmount: 0.0,
  netSales: 0.0,
  vatableSales: 0.0,
  vatExemptSales: 0.0,
  vatAmount: 0.0,
  cashCollected: 0.0,
  cardTotal: 0.0,
  gcashTotal: 0.0,
  mayaTotal: 0.0,
  pointsTotal: 0.0,
  transactionCount: 0,
  voidCount: 0,
  status: 'OPEN',
};

export const useShiftStore = create<ShiftStoreState>((set, get) => ({
  currentShift: INITIAL_OPEN_SHIFT,
  shiftCounter: 101,
  zCounter: 1,
  cumulativeGrandTotal: 154200.0, // Historical lifetime store sales
  completedShifts: [],
  zReadings: [],
  isStoreOpen: true,

  startShift: (cashierName: string, openingCash: number, terminalNumber = 'T1') => {
    const nextShiftNum = get().shiftCounter + 1;
    const newShift: ShiftRecord = {
      id: uuidv4(),
      shiftNumber: nextShiftNum.toString(),
      terminalNumber,
      cashierName,
      openedAt: new Date().toISOString(),
      openingCash,
      grossSales: 0.0,
      discountAmount: 0.0,
      netSales: 0.0,
      vatableSales: 0.0,
      vatExemptSales: 0.0,
      vatAmount: 0.0,
      cashCollected: 0.0,
      cardTotal: 0.0,
      gcashTotal: 0.0,
      mayaTotal: 0.0,
      pointsTotal: 0.0,
      transactionCount: 0,
      voidCount: 0,
      status: 'OPEN',
    };

    set({
      currentShift: newShift,
      shiftCounter: nextShiftNum,
      isStoreOpen: true,
    });

    return newShift;
  },

  recordSale: (sale: SaleRecord) => {
    const shift = get().currentShift;
    if (!shift || shift.status !== 'OPEN') return;

    let cash = 0;
    let card = 0;
    let gcash = 0;
    let maya = 0;
    let points = 0;

    for (const p of sale.payments) {
      if (p.method === 'CASH') {
        cash += p.amount;
      } else if (p.method === 'CARD') {
        card += p.amount;
      } else if (p.method === 'EWALLET_GCASH') {
        gcash += p.amount;
      } else if (p.method === 'EWALLET_MAYA') {
        maya += p.amount;
      } else if (p.method === ('POINTS' as any) || (p.method as string) === 'MEMBERSHIP_POINTS') {
        points += p.amount;
      }
    }

    const updated: ShiftRecord = {
      ...shift,
      grossSales: Math.round((shift.grossSales + sale.subtotalAmount) * 100) / 100,
      discountAmount: Math.round((shift.discountAmount + sale.discountAmount) * 100) / 100,
      netSales: Math.round((shift.netSales + sale.totalAmount) * 100) / 100,
      vatableSales: Math.round((shift.vatableSales + sale.vatableAmount) * 100) / 100,
      vatExemptSales: Math.round((shift.vatExemptSales + sale.vatExemptAmount) * 100) / 100,
      vatAmount: Math.round((shift.vatAmount + sale.taxAmount) * 100) / 100,
      cashCollected: Math.round((shift.cashCollected + cash) * 100) / 100,
      cardTotal: Math.round((shift.cardTotal + card) * 100) / 100,
      gcashTotal: Math.round((shift.gcashTotal + gcash) * 100) / 100,
      mayaTotal: Math.round((shift.mayaTotal + maya) * 100) / 100,
      pointsTotal: Math.round((shift.pointsTotal + points) * 100) / 100,
      transactionCount: shift.transactionCount + 1,
    };

    set({ currentShift: updated });
  },

  recordVoid: () => {
    const shift = get().currentShift;
    if (!shift) return;
    set({
      currentShift: {
        ...shift,
        voidCount: shift.voidCount + 1,
      },
    });
  },

  closeShiftWithXReading: (declaredCash?: number) => {
    const shift = get().currentShift;
    if (!shift) {
      throw new Error('No active shift to close.');
    }

    const closedAt = new Date().toISOString();
    const expectedCash = Math.round((shift.openingCash + shift.cashCollected) * 100) / 100;
    const diff =
      declaredCash !== undefined
        ? Math.round((declaredCash - expectedCash) * 100) / 100
        : undefined;

    const closedShift: ShiftRecord = {
      ...shift,
      closedAt,
      declaredCash,
      cashDifference: diff,
      status: 'CLOSED',
    };

    set((state) => ({
      currentShift: null, // Ready for incoming cashier to log in
      completedShifts: [closedShift, ...state.completedShifts],
    }));

    // Enqueue SHIFT into Outbox Queue
    useSyncQueueStore.getState().enqueue('SHIFT', closedShift.id, 'UPDATE', closedShift);

    return closedShift;
  },

  getDailySummary: () => {
    const shifts = [...get().completedShifts];
    if (get().currentShift) {
      shifts.push(get().currentShift!);
    }

    return shifts.reduce(
      (acc, s) => ({
        grossSales: Math.round((acc.grossSales + s.grossSales) * 100) / 100,
        discounts: Math.round((acc.discounts + s.discountAmount) * 100) / 100,
        netSales: Math.round((acc.netSales + s.netSales) * 100) / 100,
        vatableSales: Math.round((acc.vatableSales + s.vatableSales) * 100) / 100,
        vatExemptSales: Math.round((acc.vatExemptSales + s.vatExemptSales) * 100) / 100,
        vatAmount: Math.round((acc.vatAmount + s.vatAmount) * 100) / 100,
        cashTotal: Math.round((acc.cashTotal + s.cashCollected) * 100) / 100,
        cardTotal: Math.round((acc.cardTotal + s.cardTotal) * 100) / 100,
        gcashTotal: Math.round((acc.gcashTotal + s.gcashTotal) * 100) / 100,
        mayaTotal: Math.round((acc.mayaTotal + s.mayaTotal) * 100) / 100,
        pointsTotal: Math.round((acc.pointsTotal + s.pointsTotal) * 100) / 100,
        transactionCount: acc.transactionCount + s.transactionCount,
        voidCount: acc.voidCount + s.voidCount,
      }),
      {
        grossSales: 0,
        discounts: 0,
        netSales: 0,
        vatableSales: 0,
        vatExemptSales: 0,
        vatAmount: 0,
        cashTotal: 0,
        cardTotal: 0,
        gcashTotal: 0,
        mayaTotal: 0,
        pointsTotal: 0,
        transactionCount: 0,
        voidCount: 0,
      }
    );
  },

  generateZReading: (managerName: string) => {
    // If there's an active shift, close it automatically as part of end-of-day
    if (get().currentShift && get().currentShift?.status === 'OPEN') {
      get().closeShiftWithXReading();
    }

    const todaySummary = get().getDailySummary();
    const prevGrandTotal = get().cumulativeGrandTotal;
    const newGrandTotal = Math.round((prevGrandTotal + todaySummary.grossSales) * 100) / 100;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const zCount = get().zCounter;

    const allShifts = get().completedShifts;
    const earliestOpened =
      allShifts.length > 0
        ? allShifts[allShifts.length - 1].openedAt
        : now.toISOString();

    const zRecord: ZReadingRecord = {
      id: uuidv4(),
      zCounter: zCount,
      date: dateStr,
      terminalNumber: 'T1',
      managerName,
      openedAt: earliestOpened,
      closedAt: now.toISOString(),
      previousGrandTotal: prevGrandTotal,
      todaysGrossSales: todaySummary.grossSales,
      newGrandTotal,
      todaysDiscounts: todaySummary.discounts,
      todaysNetSales: todaySummary.netSales,
      vatableSales: todaySummary.vatableSales,
      vatExemptSales: todaySummary.vatExemptSales,
      vatAmount: todaySummary.vatAmount,
      cashTotal: todaySummary.cashTotal,
      cardTotal: todaySummary.cardTotal,
      gcashTotal: todaySummary.gcashTotal,
      mayaTotal: todaySummary.mayaTotal,
      pointsTotal: todaySummary.pointsTotal,
      totalTransactions: todaySummary.transactionCount,
      totalVoids: todaySummary.voidCount,
      shiftsIncluded: allShifts.map((s) => s.shiftNumber),
    };

    set((state) => ({
      zReadings: [zRecord, ...state.zReadings],
      zCounter: state.zCounter + 1,
      cumulativeGrandTotal: newGrandTotal,
      isStoreOpen: false, // Store is officially closed
    }));

    return zRecord;
  },

  resetToDefaults: () => {
    set({
      currentShift: INITIAL_OPEN_SHIFT,
      shiftCounter: 101,
      zCounter: 1,
      cumulativeGrandTotal: 154200.0,
      completedShifts: [],
      zReadings: [],
      isStoreOpen: true,
    });
  },
}));

