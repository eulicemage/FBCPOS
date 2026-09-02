import { DiscountType } from './enums';

export interface CalculationResult {
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  vatableAmount: number;
  vatExemptAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export function roundTo2Decimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates item totals, discounts, and VAT (12% inclusive standard Philippine VAT).
 */
export function calculateLineItem(
  unitPrice: number,
  quantity: number,
  isTaxable: boolean = true,
  taxRate: number = 0.12,
  discountType: DiscountType = DiscountType.NONE,
  discountValue: number = 0
): CalculationResult {
  const grossAmount = roundTo2Decimals(unitPrice * quantity);
  let discountAmount = 0;
  let vatableAmount = 0;
  let vatExemptAmount = 0;
  let vatAmount = 0;
  let netAmount = grossAmount;

  if (discountType === DiscountType.SENIOR_PWD) {
    // Senior Citizen / PWD: VAT-Exempt base + 20% discount on base
    const baseExempt = isTaxable ? roundTo2Decimals(grossAmount / (1 + taxRate)) : grossAmount;
    discountAmount = roundTo2Decimals(baseExempt * 0.20);
    vatExemptAmount = baseExempt;
    vatableAmount = 0;
    vatAmount = 0;
    netAmount = roundTo2Decimals(baseExempt - discountAmount);
  } else if (discountType === DiscountType.PERCENTAGE) {
    discountAmount = roundTo2Decimals(grossAmount * (discountValue / 100));
    netAmount = roundTo2Decimals(grossAmount - discountAmount);
    if (isTaxable) {
      vatableAmount = roundTo2Decimals(netAmount / (1 + taxRate));
      vatAmount = roundTo2Decimals(netAmount - vatableAmount);
    } else {
      vatExemptAmount = netAmount;
    }
  } else if (discountType === DiscountType.FIXED) {
    discountAmount = Math.min(grossAmount, roundTo2Decimals(discountValue));
    netAmount = roundTo2Decimals(grossAmount - discountAmount);
    if (isTaxable) {
      vatableAmount = roundTo2Decimals(netAmount / (1 + taxRate));
      vatAmount = roundTo2Decimals(netAmount - vatableAmount);
    } else {
      vatExemptAmount = netAmount;
    }
  } else {
    // No discount
    if (isTaxable) {
      vatableAmount = roundTo2Decimals(grossAmount / (1 + taxRate));
      vatAmount = roundTo2Decimals(grossAmount - vatableAmount);
    } else {
      vatExemptAmount = grossAmount;
    }
  }

  return {
    grossAmount,
    discountAmount,
    netAmount,
    vatableAmount,
    vatExemptAmount,
    vatAmount,
    totalAmount: netAmount,
  };
}

/**
 * Calculates change amount given amount tendered and total due.
 */
export function calculateChange(amountTendered: number, totalDue: number): number {
  if (amountTendered < totalDue) {
    return 0;
  }
  return roundTo2Decimals(amountTendered - totalDue);
}
