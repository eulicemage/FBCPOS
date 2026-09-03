import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { SaleRecord } from './checkoutService';
import { useInventoryStore } from '../store/inventoryStore';
import { useMemberStore } from '../store/memberStore';

export type ReturnReason =
  | 'DEFECTIVE_EXPIRED'
  | 'WRONG_ITEM'
  | 'CUSTOMER_CHANGE_OF_MIND'
  | 'OTHER';

export type ItemDisposition = 'RESTOCK' | 'SCRAP_WASTE';
export type RefundTender = 'CASH' | 'POINTS' | 'ORIGINAL_PAYMENT';

export interface ReturnItemInput {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  reason: ReturnReason;
  disposition: ItemDisposition;
}

export interface ReturnRecord {
  id: string;
  returnNumber: string;
  originalInvoiceNumber: string;
  originalSaleId: string;
  cashierName: string;
  customerName?: string;
  memberBarcode?: string;
  items: ReturnItemInput[];
  totalRefundAmount: number;
  refundTender: RefundTender;
  createdAt: string;
}

// ─── Return Number Generator ─────────────────────────────────

let returnCounter = 1;

export function generateReturnNumber(branchCode: string, terminalNumber: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = (returnCounter++).toString().padStart(4, '0');
  return `RET-${branchCode}-T${terminalNumber}-${dateStr}-${seq}`;
}

export function resetReturnCounter(): void {
  returnCounter = 1;
}

// ─── Return Store (Local Archive) ────────────────────────────

interface ReturnStoreState {
  returns: ReturnRecord[];
  salesArchive: SaleRecord[];

  archiveSale: (sale: SaleRecord) => void;
  findSaleByInvoice: (invoiceNumber: string) => SaleRecord | undefined;
  recordReturn: (returnRecord: ReturnRecord) => void;
  getReturns: () => ReturnRecord[];
  resetToDefaults: () => void;
}

export const useReturnStore = create<ReturnStoreState>((set, get) => ({
  returns: [],
  salesArchive: [],

  archiveSale: (sale: SaleRecord) => {
    set((state) => ({
      salesArchive: [sale, ...state.salesArchive.filter((s) => s.id !== sale.id)],
    }));
  },

  findSaleByInvoice: (invoiceNumber: string) => {
    const cleaned = invoiceNumber.trim().toUpperCase();
    return get().salesArchive.find(
      (s) => s.invoiceNumber.toUpperCase() === cleaned
    );
  },

  recordReturn: (returnRecord: ReturnRecord) => {
    set((state) => ({
      returns: [returnRecord, ...state.returns],
    }));
  },

  getReturns: () => get().returns,

  resetToDefaults: () => {
    resetReturnCounter();
    set({ returns: [], salesArchive: [] });
  },
}));

// ─── Process Return Execution ────────────────────────────────

export interface ProcessReturnResult {
  success: boolean;
  returnRecord?: ReturnRecord;
  errors?: string[];
}

export function processReturnTransaction(
  originalSale: SaleRecord,
  returnItems: ReturnItemInput[],
  refundTender: RefundTender,
  cashierName: string,
  branchCode = '001',
  terminalNumber = '1'
): ProcessReturnResult {
  const errors: string[] = [];

  if (returnItems.length === 0) {
    return { success: false, errors: ['No items selected for return.'] };
  }

  // Verify item quantities against original sale
  for (const retItem of returnItems) {
    if (retItem.quantity <= 0) {
      errors.push(`Return quantity for ${retItem.productName} must be greater than zero.`);
    }

    const origItem = originalSale.items.find((i) => i.productId === retItem.productId);
    if (!origItem) {
      errors.push(`Item ${retItem.productName} was not found in original sale.`);
    } else if (retItem.quantity > origItem.quantity) {
      errors.push(
        `Cannot return ${retItem.quantity} of ${retItem.productName}. Maximum purchased was ${origItem.quantity}.`
      );
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const totalRefund = Math.round(
    returnItems.reduce((sum, item) => sum + item.refundAmount, 0) * 100
  ) / 100;

  const returnNumber = generateReturnNumber(branchCode, terminalNumber);

  // 1. Process Inventory Adjustments based on Disposition
  for (const item of returnItems) {
    if (item.disposition === 'RESTOCK') {
      useInventoryStore.getState().recordMovement({
        productId: item.productId,
        productName: item.productName,
        quantityChange: item.quantity,
        movementType: 'RETURN_RESTOCK',
        referenceId: returnNumber,
        reason: `Customer Return: ${item.reason} (Restocked)`,
        performedBy: cashierName,
      });
    } else {
      useInventoryStore.getState().recordMovement({
        productId: item.productId,
        productName: item.productName,
        quantityChange: item.quantity,
        movementType: 'RETURN_DAMAGE',
        referenceId: returnNumber,
        reason: `Customer Return: ${item.reason} (Scrap Write-Off)`,
        performedBy: cashierName,
      });
    }
  }

  // 2. Process Member Points Re-Credit if refunding to Points
  if (refundTender === 'POINTS') {
    const memberBarcode = originalSale.memberBarcode;
    if (memberBarcode) {
      const member = useMemberStore.getState().findMemberByBarcode(memberBarcode);
      if (member) {
        useMemberStore.getState().topUpPoints(member.id, totalRefund);
      }
    }
  }

  // 3. Build & Save Return Record
  const returnRecord: ReturnRecord = {
    id: uuidv4(),
    returnNumber,
    originalInvoiceNumber: originalSale.invoiceNumber,
    originalSaleId: originalSale.id,
    cashierName,
    customerName: originalSale.customerName,
    memberBarcode: originalSale.memberBarcode,
    items: returnItems,
    totalRefundAmount: totalRefund,
    refundTender,
    createdAt: new Date().toISOString(),
  };

  useReturnStore.getState().recordReturn(returnRecord);

  return { success: true, returnRecord };
}
