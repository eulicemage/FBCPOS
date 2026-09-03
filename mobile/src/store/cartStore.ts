import { create } from 'zustand';
import { CartItem, Product, DiscountType } from '../../../shared/src';
import { calculateLineItem, roundTo2Decimals } from '../../../shared/src/calculations';

export type { CartItem };

interface CartState {
  items: CartItem[];
  discountType: DiscountType;
  discountValue: number;
  customerName?: string;
  customerTinId?: string;
  seniorIdNumber?: string;
  notes?: string;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  applyDiscount: (type: DiscountType, value: number) => void;
  applySeniorDiscount: (seniorId: string, customerName: string) => void;
  setCustomerInfo: (name?: string, tinId?: string, notes?: string) => void;
  loadCart: (items: CartItem[], discountType: DiscountType, discountValue: number, customerName?: string, customerTinId?: string, seniorIdNumber?: string) => void;
  clearCart: () => void;

  // Computed Totals & Tax Breakdown
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getVatableAmount: () => number;
  getVatExemptAmount: () => number;
  getTaxAmount: () => number;
  getTotalAmount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discountType: DiscountType.NONE,
  discountValue: 0,
  customerName: undefined,
  customerTinId: undefined,
  seniorIdNumber: undefined,
  notes: undefined,

  addItem: (product: Product, quantity = 1) => {
    set((state) => {
      const existingIndex = state.items.findIndex((item) => item.productId === product.id);
      let updatedItems: CartItem[];

      if (existingIndex > -1) {
        const existing = state.items[existingIndex];
        const newQty = existing.quantity + quantity;
        const calc = calculateLineItem(
          existing.unitPrice,
          newQty,
          existing.isTaxable,
          existing.taxRate,
          state.discountType,
          state.discountValue
        );

        const updatedItem: CartItem = {
          ...existing,
          quantity: newQty,
          discountAmount: calc.discountAmount,
          taxAmount: calc.vatAmount,
          subtotal: calc.grossAmount,
          total: calc.totalAmount,
        };

        updatedItems = [...state.items];
        updatedItems[existingIndex] = updatedItem;
      } else {
        const calc = calculateLineItem(
          product.sellingPrice,
          quantity,
          product.isTaxable,
          product.taxRate,
          state.discountType,
          state.discountValue
        );

        const newItem: CartItem = {
          productId: product.id,
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          costPrice: product.costPrice,
          unitPrice: product.sellingPrice,
          quantity,
          discountAmount: calc.discountAmount,
          taxAmount: calc.vatAmount,
          subtotal: calc.grossAmount,
          total: calc.totalAmount,
          isTaxable: product.isTaxable,
          taxRate: product.taxRate,
        };

        updatedItems = [...state.items, newItem];
      }

      return { items: updatedItems };
    });
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set((state) => {
      const updatedItems = state.items.map((item) => {
        if (item.productId === productId) {
          const calc = calculateLineItem(
            item.unitPrice,
            quantity,
            item.isTaxable,
            item.taxRate,
            state.discountType,
            state.discountValue
          );
          return {
            ...item,
            quantity,
            discountAmount: calc.discountAmount,
            taxAmount: calc.vatAmount,
            subtotal: calc.grossAmount,
            total: calc.totalAmount,
          };
        }
        return item;
      });

      return { items: updatedItems };
    });
  },

  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    }));
  },

  applyDiscount: (type: DiscountType, value: number) => {
    set((state) => {
      const updatedItems = state.items.map((item) => {
        const calc = calculateLineItem(
          item.unitPrice,
          item.quantity,
          item.isTaxable,
          item.taxRate,
          type,
          value
        );
        return {
          ...item,
          discountAmount: calc.discountAmount,
          taxAmount: calc.vatAmount,
          subtotal: calc.grossAmount,
          total: calc.totalAmount,
        };
      });

      return {
        discountType: type,
        discountValue: value,
        items: updatedItems,
      };
    });
  },

  applySeniorDiscount: (seniorId: string, customerName: string) => {
    get().applyDiscount(DiscountType.SENIOR_PWD, 20);
    set({
      seniorIdNumber: seniorId,
      customerName,
    });
  },

  setCustomerInfo: (name?: string, tinId?: string, notes?: string) => {
    set({
      customerName: name,
      customerTinId: tinId,
      notes,
    });
  },

  loadCart: (
    items: CartItem[],
    discountType: DiscountType,
    discountValue: number,
    customerName?: string,
    customerTinId?: string,
    seniorIdNumber?: string
  ) => {
    set({
      items,
      discountType,
      discountValue,
      customerName,
      customerTinId,
      seniorIdNumber,
    });
  },

  clearCart: () => {
    set({
      items: [],
      discountType: DiscountType.NONE,
      discountValue: 0,
      customerName: undefined,
      customerTinId: undefined,
      seniorIdNumber: undefined,
      notes: undefined,
    });
  },

  getSubtotal: () => {
    return roundTo2Decimals(get().items.reduce((sum, item) => sum + item.subtotal, 0));
  },

  getDiscountAmount: () => {
    return roundTo2Decimals(get().items.reduce((sum, item) => sum + item.discountAmount, 0));
  },

  getVatableAmount: () => {
    const isSenior = get().discountType === DiscountType.SENIOR_PWD;
    if (isSenior) return 0;
    const subtotalNet = get().getSubtotal() - get().getDiscountAmount();
    return roundTo2Decimals(subtotalNet / 1.12);
  },

  getVatExemptAmount: () => {
    const isSenior = get().discountType === DiscountType.SENIOR_PWD;
    if (isSenior) {
      return roundTo2Decimals(get().getSubtotal() / 1.12);
    }
    return 0;
  },

  getTaxAmount: () => {
    const isSenior = get().discountType === DiscountType.SENIOR_PWD;
    if (isSenior) return 0;
    const net = get().getSubtotal() - get().getDiscountAmount();
    const vatable = roundTo2Decimals(net / 1.12);
    return roundTo2Decimals(net - vatable);
  },

  getTotalAmount: () => {
    return roundTo2Decimals(get().items.reduce((sum, item) => sum + item.total, 0));
  },
}));
