import { UserRole, MovementType, PaymentMethod, DiscountType, SyncStatus, ShiftStatus, SaleStatus } from './enums';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  phone?: string;
  taxId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Terminal {
  id: string;
  branchId: string;
  terminalNumber: string;
  deviceUid: string;
  name: string;
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
}

export interface User {
  id: string;
  branchId?: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  colorHex: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  sku: string;
  barcode: string;
  name: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  isTaxable: boolean;
  taxRate: number;
  unitOfMeasure: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  costPrice: number;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  isTaxable: boolean;
  taxRate: number;
}

export interface PaymentItem {
  id: string;
  paymentMethod: PaymentMethod;
  amount: number;
  amountTendered: number;
  changeAmount: number;
  referenceNumber?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  branchId: string;
  terminalId: string;
  cashierId: string;
  shiftId: string;
  invoiceNumber: string;
  subtotalAmount: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: SaleStatus;
  customerName?: string;
  customerTinId?: string;
  notes?: string;
  items: CartItem[];
  payments: PaymentItem[];
  createdAt: string;
  syncStatus: SyncStatus;
  syncedAt?: string;
}

export interface StockMovement {
  id: string;
  branchId: string;
  productId: string;
  terminalId?: string;
  userId: string;
  movementType: MovementType;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  referenceId?: string;
  reason?: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface Shift {
  id: string;
  branchId: string;
  terminalId: string;
  userId: string;
  shiftNumber: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  expectedCash?: number;
  actualCash?: number;
  cashDifference?: number;
  notes?: string;
  status: ShiftStatus;
  syncStatus: SyncStatus;
}

export interface SyncQueueRecord {
  id: string;
  entityType: 'SALE' | 'STOCK_MOVEMENT' | 'SHIFT' | 'RETURN' | 'CASH_TX';
  entityId: string;
  operation: 'INSERT' | 'UPDATE';
  payload: string; // JSON string
  retryCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
