import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type StockMovementType =
  | 'STOCK_IN'
  | 'SALE'
  | 'RETURN_RESTOCK'
  | 'RETURN_DAMAGE'
  | 'ADJUSTMENT_DAMAGE'
  | 'ADJUSTMENT_AUDIT';

export interface StockMovementEntry {
  id: string;
  productId: string;
  productName: string;
  movementType: StockMovementType;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  referenceId?: string;
  reason?: string;
  performedBy: string;
  createdAt: string;
}

export interface InventoryStock {
  productId: string;
  productName: string;
  stockQuantity: number;
  reorderLevel: number;
  lastUpdated: string;
}

export interface StockMovementInput {
  productId: string;
  productName: string;
  quantityChange: number;
  movementType: StockMovementType;
  referenceId?: string;
  reason?: string;
  performedBy?: string;
}

export const INITIAL_INVENTORY_STOCKS: Record<string, InventoryStock> = {
  p1: {
    productId: 'p1',
    productName: 'Fresh Whole Milk 1L',
    stockQuantity: 42,
    reorderLevel: 20,
    lastUpdated: new Date().toISOString(),
  },
  p2: {
    productId: 'p2',
    productName: 'Orange Juice 1L Pure',
    stockQuantity: 8,
    reorderLevel: 15,
    lastUpdated: new Date().toISOString(),
  },
  p3: {
    productId: 'p3',
    productName: 'Whole Wheat Loaf 500g',
    stockQuantity: 24,
    reorderLevel: 10,
    lastUpdated: new Date().toISOString(),
  },
  p4: {
    productId: 'p4',
    productName: 'Organic Brown Eggs 12s',
    stockQuantity: 25,
    reorderLevel: 10,
    lastUpdated: new Date().toISOString(),
  },
  p5: {
    productId: 'p5',
    productName: 'Canned Tuna Flakes 180g',
    stockQuantity: 150,
    reorderLevel: 30,
    lastUpdated: new Date().toISOString(),
  },
  p6: {
    productId: 'p6',
    productName: 'Potato Crisps Salted 100g',
    stockQuantity: 80,
    reorderLevel: 25,
    lastUpdated: new Date().toISOString(),
  },
};

export const INITIAL_MOVEMENTS: StockMovementEntry[] = [
  {
    id: 'mov-init-1',
    productId: 'p1',
    productName: 'Fresh Whole Milk 1L',
    movementType: 'STOCK_IN',
    quantityChange: 50,
    previousQuantity: 0,
    newQuantity: 50,
    referenceId: 'PO-2026-001',
    reason: 'Initial delivery from supplier',
    performedBy: 'System Setup',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'mov-init-2',
    productId: 'p1',
    productName: 'Fresh Whole Milk 1L',
    movementType: 'SALE',
    quantityChange: -8,
    previousQuantity: 50,
    newQuantity: 42,
    referenceId: 'BR-001-T1-20260902-0001',
    reason: 'POS Counter Sale',
    performedBy: 'Maria Santos',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
];

interface InventoryStoreState {
  stocks: Record<string, InventoryStock>;
  movements: StockMovementEntry[];

  getStock: (productId: string) => InventoryStock | undefined;
  getStockQuantity: (productId: string) => number;
  recordMovement: (input: StockMovementInput) => StockMovementEntry;
  setReorderLevel: (productId: string, level: number) => void;
  getMovements: (productId?: string) => StockMovementEntry[];
  resetToDefaults: () => void;
}

export const useInventoryStore = create<InventoryStoreState>((set, get) => ({
  stocks: INITIAL_INVENTORY_STOCKS,
  movements: INITIAL_MOVEMENTS,

  getStock: (productId: string) => {
    return get().stocks[productId];
  },

  getStockQuantity: (productId: string) => {
    return get().stocks[productId]?.stockQuantity ?? 0;
  },

  recordMovement: (input: StockMovementInput) => {
    const currentStock = get().stocks[input.productId];
    const prevQty = currentStock ? currentStock.stockQuantity : 0;
    const change = input.quantityChange;

    // For damage write-offs that don't increase inventory (e.g. RETURN_DAMAGE), qty doesn't increase
    let newQty = prevQty;
    if (input.movementType !== 'RETURN_DAMAGE') {
      newQty = Math.max(0, Math.round((prevQty + change) * 1000) / 1000);
    }

    const movement: StockMovementEntry = {
      id: uuidv4(),
      productId: input.productId,
      productName: input.productName,
      movementType: input.movementType,
      quantityChange: change,
      previousQuantity: prevQty,
      newQuantity: newQty,
      referenceId: input.referenceId,
      reason: input.reason || 'Inventory Adjustment',
      performedBy: input.performedBy || 'Cashier',
      createdAt: new Date().toISOString(),
    };

    const updatedStock: InventoryStock = {
      productId: input.productId,
      productName: input.productName,
      stockQuantity: newQty,
      reorderLevel: currentStock?.reorderLevel ?? 10,
      lastUpdated: new Date().toISOString(),
    };

    set((state) => ({
      stocks: {
        ...state.stocks,
        [input.productId]: updatedStock,
      },
      movements: [movement, ...state.movements],
    }));

    return movement;
  },

  setReorderLevel: (productId: string, level: number) => {
    set((state) => {
      const existing = state.stocks[productId];
      if (!existing) return state;
      return {
        stocks: {
          ...state.stocks,
          [productId]: { ...existing, reorderLevel: level },
        },
      };
    });
  },

  getMovements: (productId?: string) => {
    if (!productId) return get().movements;
    return get().movements.filter((m) => m.productId === productId);
  },

  resetToDefaults: () => {
    set({
      stocks: INITIAL_INVENTORY_STOCKS,
      movements: INITIAL_MOVEMENTS,
    });
  },
}));

