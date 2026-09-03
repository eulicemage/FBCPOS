import { CartItem } from '../store/cartStore';
import { DiscountType } from '../../../shared/src';

export interface DraftCartSnapshot {
  items: CartItem[];
  discountType: DiscountType;
  discountValue: number;
  customerName?: string;
  customerTinId?: string;
  seniorIdNumber?: string;
  savedAt: string;
  itemCount: number;
  totalAmount: number;
}

let activeDraft: DraftCartSnapshot | null = null;

export class DraftCartService {
  /**
   * Persists the active cart state.
   */
  static saveDraft(
    items: CartItem[],
    discountType: DiscountType,
    discountValue: number,
    customerName?: string,
    customerTinId?: string,
    seniorIdNumber?: string,
    totalAmount = 0
  ): void {
    if (items.length === 0) {
      activeDraft = null;
      return;
    }

    activeDraft = {
      items,
      discountType,
      discountValue,
      customerName,
      customerTinId,
      seniorIdNumber,
      savedAt: new Date().toISOString(),
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      totalAmount,
    };
  }

  /**
   * Retrieves any unfinalized draft cart from a previous session.
   */
  static getPendingDraft(): DraftCartSnapshot | null {
    return activeDraft;
  }

  /**
   * Clears the active draft (e.g. after successful checkout or explicit void).
   */
  static clearDraft(): void {
    activeDraft = null;
  }
}
