import { create } from 'zustand';
import {
  PrinterService,
  PaperWidth,
  DrawerPin,
  PrintReceiptParams,
  XReadingParams,
  ZReadingParams,
  ReturnSlipParams,
} from '../services/printerService';
import {
  HardwareManager,
  VirtualTransport,
  NetworkTransport,
  PrintResult,
} from '../services/hardwareTransport';

export type PrinterInterface = 'VIRTUAL' | 'NETWORK' | 'BLUETOOTH';

interface HardwareState {
  printerType: PrinterInterface;
  paperWidth: PaperWidth; // Default '70MM' for Xprinter 70x50mm
  printerIp: string;
  printerPort: number;
  autoPrintOnCheckout: boolean;
  autoKickDrawerOnCash: boolean;
  drawerPin: DrawerPin;
  lastPrintResult: PrintResult | null;
  isPrinting: boolean;

  setPrinterConfig: (updates: Partial<{
    printerType: PrinterInterface;
    paperWidth: PaperWidth;
    printerIp: string;
    printerPort: number;
    autoPrintOnCheckout: boolean;
    autoKickDrawerOnCash: boolean;
    drawerPin: DrawerPin;
  }>) => void;

  sendTestPrint: () => Promise<PrintResult>;
  kickCashDrawer: () => Promise<PrintResult>;
  printReceipt: (params: PrintReceiptParams) => Promise<PrintResult>;
  printXReading: (params: XReadingParams) => Promise<PrintResult>;
  printZReading: (params: ZReadingParams) => Promise<PrintResult>;
  printReturnSlip: (params: ReturnSlipParams) => Promise<PrintResult>;
  printRaw: (bytes: Uint8Array) => Promise<PrintResult>;
}

export const useHardwareStore = create<HardwareState>((set, get) => ({
  printerType: 'VIRTUAL',
  paperWidth: '70MM', // Default configured for user's Xprinter 70x50mm paper
  printerIp: '192.168.2.100',
  printerPort: 9100,
  autoPrintOnCheckout: true,
  autoKickDrawerOnCash: true,
  drawerPin: 'PIN_2',
  lastPrintResult: null,
  isPrinting: false,

  setPrinterConfig: (updates) => {
    set((state) => {
      const newState = { ...state, ...updates };

      if (newState.printerType === 'NETWORK') {
        HardwareManager.setTransport(new NetworkTransport(newState.printerIp, newState.printerPort));
      } else {
        HardwareManager.setTransport(new VirtualTransport());
      }

      return newState;
    });
  },

  sendTestPrint: async () => {
    set({ isPrinting: true });
    try {
      const bytes = PrinterService.formatTestReceipt({
        paperWidth: get().paperWidth,
      });
      const result = await HardwareManager.printBuffer(bytes);
      set({ lastPrintResult: result, isPrinting: false });
      return result;
    } catch (e: any) {
      const errResult: PrintResult = {
        success: false,
        bytesSent: 0,
        transportType: get().printerType,
        error: e.message || 'Print error',
      };
      set({ lastPrintResult: errResult, isPrinting: false });
      return errResult;
    }
  },

  kickCashDrawer: async () => {
    const bytes = PrinterService.formatDrawerKick(get().drawerPin);
    const result = await HardwareManager.printBuffer(bytes);
    set({ lastPrintResult: result });
    return result;
  },

  printReceipt: async (params: PrintReceiptParams) => {
    set({ isPrinting: true });
    try {
      const bytes = PrinterService.formatReceipt(params, {
        paperWidth: get().paperWidth,
        kickDrawer: get().autoKickDrawerOnCash,
        drawerPin: get().drawerPin,
      });
      const result = await HardwareManager.printBuffer(bytes);
      set({ lastPrintResult: result, isPrinting: false });
      return result;
    } catch (e: any) {
      const errResult: PrintResult = {
        success: false,
        bytesSent: 0,
        transportType: get().printerType,
        error: e.message,
      };
      set({ lastPrintResult: errResult, isPrinting: false });
      return errResult;
    }
  },

  printXReading: async (params: XReadingParams) => {
    set({ isPrinting: true });
    try {
      const bytes = PrinterService.formatXReading(params, {
        paperWidth: get().paperWidth,
      });
      const result = await HardwareManager.printBuffer(bytes);
      set({ lastPrintResult: result, isPrinting: false });
      return result;
    } catch (e: any) {
      const errResult: PrintResult = {
        success: false,
        bytesSent: 0,
        transportType: get().printerType,
        error: e.message,
      };
      set({ lastPrintResult: errResult, isPrinting: false });
      return errResult;
    }
  },

  printZReading: async (params: ZReadingParams) => {
    set({ isPrinting: true });
    try {
      const bytes = PrinterService.formatZReading(params, {
        paperWidth: get().paperWidth,
      });
      const result = await HardwareManager.printBuffer(bytes);
      set({ lastPrintResult: result, isPrinting: false });
      return result;
    } catch (e: any) {
      const errResult: PrintResult = {
        success: false,
        bytesSent: 0,
        transportType: get().printerType,
        error: e.message,
      };
      set({ lastPrintResult: errResult, isPrinting: false });
      return errResult;
    }
  },

  printReturnSlip: async (params: ReturnSlipParams) => {
    set({ isPrinting: true });
    try {
      const bytes = PrinterService.formatReturnSlip(params, {
        paperWidth: get().paperWidth,
        drawerPin: get().drawerPin,
      });
      const result = await HardwareManager.printBuffer(bytes);
      set({ lastPrintResult: result, isPrinting: false });
      return result;
    } catch (e: any) {
      const errResult: PrintResult = {
        success: false,
        bytesSent: 0,
        transportType: get().printerType,
        error: e.message,
      };
      set({ lastPrintResult: errResult, isPrinting: false });
      return errResult;
    }
  },

  printRaw: async (bytes: Uint8Array) => {
    set({ isPrinting: true });
    try {
      const result = await HardwareManager.printBuffer(bytes);
      set({ lastPrintResult: result, isPrinting: false });
      return result;
    } catch (e: any) {
      const errResult: PrintResult = {
        success: false,
        bytesSent: 0,
        transportType: get().printerType,
        error: e.message,
      };
      set({ lastPrintResult: errResult, isPrinting: false });
      return errResult;
    }
  },
}));

