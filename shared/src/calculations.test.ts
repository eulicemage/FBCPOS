import { describe, it, expect } from 'vitest';
import { calculateLineItem, calculateChange, roundTo2Decimals } from './calculations';
import { DiscountType } from './enums';

describe('Calculations Engine', () => {
  it('correctly calculates standard 12% VAT-inclusive line items', () => {
    // 1 item @ 112.00
    const result = calculateLineItem(112.0, 1, true, 0.12, DiscountType.NONE);
    expect(result.grossAmount).toBe(112.0);
    expect(result.discountAmount).toBe(0);
    expect(result.vatableAmount).toBe(100.0);
    expect(result.vatAmount).toBe(12.0);
    expect(result.totalAmount).toBe(112.0);
  });

  it('correctly calculates percentage discounts', () => {
    // 2 items @ 100.00 with 10% discount
    const result = calculateLineItem(100.0, 2, true, 0.12, DiscountType.PERCENTAGE, 10);
    expect(result.grossAmount).toBe(200.0);
    expect(result.discountAmount).toBe(20.0);
    expect(result.netAmount).toBe(180.0);
    expect(result.totalAmount).toBe(180.0);
  });

  it('correctly calculates Senior Citizen / PWD 20% discount with VAT exemption', () => {
    // 1 item @ 112.00 (Standard VAT inclusive)
    // Base VAT-exempt = 100.00
    // 20% discount = 20.00
    // Total Payable = 80.00
    const result = calculateLineItem(112.0, 1, true, 0.12, DiscountType.SENIOR_PWD);
    expect(result.grossAmount).toBe(112.0);
    expect(result.vatExemptAmount).toBe(100.0);
    expect(result.discountAmount).toBe(20.0);
    expect(result.vatableAmount).toBe(0);
    expect(result.vatAmount).toBe(0);
    expect(result.totalAmount).toBe(80.0);
  });

  it('correctly calculates change for cash payments', () => {
    expect(calculateChange(500.0, 413.25)).toBe(86.75);
    expect(calculateChange(100.0, 100.0)).toBe(0);
    expect(calculateChange(50.0, 100.0)).toBe(0);
  });
});
