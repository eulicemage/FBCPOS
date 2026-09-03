import { v4 as uuidv4 } from 'uuid';
import { CartItem, DiscountType } from '../../../shared/src';
import { roundTo2Decimals } from '../../../shared/src/calculations';

// ─── Types ───────────────────────────────────────────────────

export type PaymentMethod = 'CASH' | 'CARD' | 'EWALLET_GCASH' | 'EWALLET_MAYA' | 'POINTS' | 'OTHER';

export interface TenderEntry {
  id: string;
  method: PaymentMethod;
  amount: number;
  amountTendered: number;
  changeAmount: number;
  referenceNumber?: string;
  cardBrand?: string;
  cardLastFour?: string;
  memberBarcode?: string;
  memberPointsBalance?: number;
}

export interface SaleRecord {
  id: string;
  invoiceNumber: string;
  branchCode: string;
  terminalNumber: string;
  cashierId: string;
  cashierName: string;

  // Items
  items: SaleItemRecord[];

  // Financials
  subtotalAmount: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  vatableAmount: number;
  vatExemptAmount: number;
  taxAmount: number;
  totalAmount: number;

  // Customer & Member
  customerName?: string;
  customerTinId?: string;
  seniorIdNumber?: string;
  memberBarcode?: string;
  memberPointsBalance?: number;

  // Payments
  payments: TenderEntry[];
  totalTendered: number;
  totalChange: number;

  // Metadata
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  createdAt: string;
}

export interface SaleItemRecord {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  productName: string;
  costPrice: number;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface CheckoutConfig {
  branchCode: string;
  terminalNumber: string;
  cashierId: string;
  cashierName: string;
}

// ─── Invoice Sequence (In-Memory for Now, SQLite in Production) ───

const invoiceSequences: Record<string, number> = {};

function getSequenceKey(branchCode: string, terminalNumber: string): string {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, '0') +
    today.getDate().toString().padStart(2, '0');
  return `${branchCode}-${terminalNumber}-${dateStr}`;
}

/**
 * Generates a deterministic, collision-free invoice number.
 * Format: BR-001-T1-20260903-0001
 * Sequence resets daily per terminal.
 */
export function generateInvoiceNumber(branchCode: string, terminalNumber: string): string {
  const key = getSequenceKey(branchCode, terminalNumber);

  if (!invoiceSequences[key]) {
    invoiceSequences[key] = 0;
  }
  invoiceSequences[key]++;

  const seq = invoiceSequences[key].toString().padStart(4, '0');
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, '0') +
    today.getDate().toString().padStart(2, '0');

  return `BR-${branchCode}-T${terminalNumber}-${dateStr}-${seq}`;
}

/**
 * Resets the invoice sequence (for testing).
 */
export function resetInvoiceSequence(): void {
  Object.keys(invoiceSequences).forEach((key) => delete invoiceSequences[key]);
}

// ─── Payment Validation ──────────────────────────────────────

export interface PaymentValidationResult {
  isValid: boolean;
  totalTendered: number;
  totalChange: number;
  errors: string[];
}

/**
 * Validates that payments cover the total due.
 * - Total tendered must be >= total due
 * - Each payment must have a positive amount
 * - Card/E-wallet payments must have reference numbers
 */
export function validatePayments(
  payments: TenderEntry[],
  totalDue: number
): PaymentValidationResult {
  const errors: string[] = [];

  if (payments.length === 0) {
    errors.push('At least one payment is required.');
  }

  for (const payment of payments) {
    if (payment.amount <= 0) {
      errors.push(`Payment amount must be greater than zero.`);
    }

    if (
      (payment.method === 'CARD' ||
        payment.method === 'EWALLET_GCASH' ||
        payment.method === 'EWALLET_MAYA') &&
      !payment.referenceNumber
    ) {
      errors.push(`Reference number is required for ${payment.method} payment.`);
    }
  }

  const totalTendered = roundTo2Decimals(
    payments.reduce((sum, p) => sum + p.amountTendered, 0)
  );

  if (totalTendered < totalDue) {
    errors.push(
      `Insufficient payment. Tendered ₱${totalTendered.toFixed(2)} but total due is ₱${totalDue.toFixed(2)}.`
    );
  }

  const totalChange = roundTo2Decimals(Math.max(0, totalTendered - totalDue));

  return {
    isValid: errors.length === 0,
    totalTendered,
    totalChange,
    errors,
  };
}

// ─── Finalize Checkout ───────────────────────────────────────

export interface CheckoutResult {
  success: boolean;
  sale?: SaleRecord;
  errors?: string[];
}

/**
 * Finalizes a checkout transaction.
 *
 * This is the core atomic operation that:
 * 1. Generates a deterministic invoice number
 * 2. Builds Sale + SaleItem + Payment records
 * 3. In production: writes to SQLite in a single transaction
 *    (Sale, SaleItems, Payments, StockMovements, SyncQueue)
 *
 * Currently runs in-memory for Expo Go testing.
 */
export function finalizeCheckout(
  cartItems: CartItem[],
  payments: TenderEntry[],
  totals: {
    subtotalAmount: number;
    discountType: DiscountType;
    discountValue: number;
    discountAmount: number;
    vatableAmount: number;
    vatExemptAmount: number;
    taxAmount: number;
    totalAmount: number;
  },
  customerInfo: {
    customerName?: string;
    customerTinId?: string;
    seniorIdNumber?: string;
    memberBarcode?: string;
    memberPointsBalance?: number;
  },
  config: CheckoutConfig
): CheckoutResult {
  // Validate cart
  if (cartItems.length === 0) {
    return { success: false, errors: ['Cart is empty.'] };
  }

  // Validate payments
  const paymentValidation = validatePayments(payments, totals.totalAmount);
  if (!paymentValidation.isValid) {
    return { success: false, errors: paymentValidation.errors };
  }

  // Generate invoice
  const invoiceNumber = generateInvoiceNumber(config.branchCode, config.terminalNumber);

  // Build sale item records
  const saleItems: SaleItemRecord[] = cartItems.map((item) => ({
    id: uuidv4(),
    productId: item.productId,
    sku: item.sku,
    barcode: item.barcode,
    productName: item.name,
    costPrice: item.costPrice,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    discountAmount: item.discountAmount,
    taxAmount: item.taxAmount,
    totalAmount: item.total,
  }));

  // Build sale record
  const sale: SaleRecord = {
    id: uuidv4(),
    invoiceNumber,
    branchCode: config.branchCode,
    terminalNumber: config.terminalNumber,
    cashierId: config.cashierId,
    cashierName: config.cashierName,

    items: saleItems,

    subtotalAmount: totals.subtotalAmount,
    discountType: totals.discountType,
    discountValue: totals.discountValue,
    discountAmount: totals.discountAmount,
    vatableAmount: totals.vatableAmount,
    vatExemptAmount: totals.vatExemptAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,

    customerName: customerInfo.customerName,
    customerTinId: customerInfo.customerTinId,
    seniorIdNumber: customerInfo.seniorIdNumber,
    memberBarcode: customerInfo.memberBarcode,
    memberPointsBalance: customerInfo.memberPointsBalance,

    payments,
    totalTendered: paymentValidation.totalTendered,
    totalChange: paymentValidation.totalChange,

    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  };

  // TODO: In production, this will be an atomic SQLite transaction:
  // BEGIN TRANSACTION;
  //   INSERT INTO sales (...) VALUES (...);
  //   INSERT INTO sale_items (...) VALUES (...); -- for each item
  //   INSERT INTO payments (...) VALUES (...);   -- for each payment
  //   INSERT INTO stock_movements (...) VALUES (...); -- SALE_OUT for each item
  //   INSERT INTO sync_queue (...) VALUES (...); -- outbox record
  // COMMIT;

  return { success: true, sale };
}
