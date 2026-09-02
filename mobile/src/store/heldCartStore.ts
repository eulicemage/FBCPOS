import { create } from 'zustand';
import { CartItem, DiscountType } from '../../../shared/src';
import { v4 as uuidv4 } from 'uuid';

export interface HeldCart {
  id: string;
  ticketNumber: string;
  heldAt: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  customerName?: string;
  customerTinId?: string;
}

interface HeldCartState {
  heldCarts: HeldCart[];
  holdCart: (
    items: CartItem[],
    subtotal: number,
    discountType: DiscountType,
    discountValue: number,
    customerName?: string,
    customerTinId?: string
  ) => HeldCart | null;
  recallCart: (id: string) => HeldCart | null;
  removeHeldCart: (id: string) => void;
}

export const useHeldCartStore = create<HeldCartState>((set, get) => ({
  heldCarts: [],

  holdCart: (items, subtotal, discountType, discountValue, customerName, customerTinId) => {
    if (items.length === 0) return null;

    const ticketNumber = `HOLD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newHold: HeldCart = {
      id: uuidv4(),
      ticketNumber,
      heldAt: new Date().toISOString(),
      items: [...items],
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      discountType,
      discountValue,
      customerName,
      customerTinId,
    };

    set((state) => ({
      heldCarts: [newHold, ...state.heldCarts],
    }));

    return newHold;
  },

  recallCart: (id: string) => {
    const target = get().heldCarts.find((c) => c.id === id);
    if (!target) return null;

    set((state) => ({
      heldCarts: state.heldCarts.filter((c) => c.id !== id),
    }));

    return target;
  },

  removeHeldCart: (id: string) => {
    set((state) => ({
      heldCarts: state.heldCarts.filter((c) => c.id !== id),
    }));
  },
}));

