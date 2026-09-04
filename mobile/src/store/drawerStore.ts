import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface DrawerEntry {
  id: string;
  type: 'PAY_IN' | 'PAY_OUT';
  amount: number;
  reason: string;
  cashierName: string;
  timestamp: string;
}

interface DrawerStoreState {
  openingFloat: number;
  entries: DrawerEntry[];
  setOpeningFloat: (amount: number) => void;
  addPayIn: (amount: number, reason: string, cashierName: string) => DrawerEntry;
  addPayOut: (amount: number, reason: string, cashierName: string) => DrawerEntry;
  getNetBalance: () => number;
  clearEntries: () => void;
}

export const useDrawerStore = create<DrawerStoreState>((set, get) => ({
  openingFloat: 0,
  entries: [],

  setOpeningFloat: (amount) => set({ openingFloat: amount }),

  addPayIn: (amount, reason, cashierName) => {
    const entry: DrawerEntry = {
      id: uuidv4(),
      type: 'PAY_IN',
      amount,
      reason,
      cashierName,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ entries: [...s.entries, entry] }));
    return entry;
  },

  addPayOut: (amount, reason, cashierName) => {
    const entry: DrawerEntry = {
      id: uuidv4(),
      type: 'PAY_OUT',
      amount,
      reason,
      cashierName,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ entries: [...s.entries, entry] }));
    return entry;
  },

  getNetBalance: () => {
    const { openingFloat, entries } = get();
    const ins = entries.filter((e) => e.type === 'PAY_IN').reduce((s, e) => s + e.amount, 0);
    const outs = entries.filter((e) => e.type === 'PAY_OUT').reduce((s, e) => s + e.amount, 0);
    return openingFloat + ins - outs;
  },

  clearEntries: () => set({ entries: [], openingFloat: 0 }),
}));
