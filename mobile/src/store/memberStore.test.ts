import { describe, it, expect, beforeEach } from 'vitest';
import { useMemberStore } from './memberStore';

describe('MemberStore', () => {
  beforeEach(() => {
    useMemberStore.getState().resetToDefaults();
  });

  it('finds member by barcode', () => {
    const member = useMemberStore.getState().findMemberByBarcode('990001001');
    expect(member).toBeDefined();
    expect(member?.fullName).toBe('Maria Santos');
    expect(member?.monthlyAllowance).toBe(1500.0);
    expect(member?.currentPointsBalance).toBe(1500.0);
  });

  it('deducts points on transaction', () => {
    const res = useMemberStore.getState().deductPoints('mem-1', 450.0);
    expect(res.success).toBe(true);
    expect(res.newBalance).toBe(1050.0);

    const updated = useMemberStore.getState().findMemberById('mem-1');
    expect(updated?.currentPointsBalance).toBe(1050.0);
    expect(updated?.consumedThisMonth).toBe(450.0);
  });

  it('rejects deduction when points balance is insufficient', () => {
    const res = useMemberStore.getState().deductPoints('mem-3', 1500.0); // Roberto has 850
    expect(res.success).toBe(false);
    expect(res.error).toContain('Insufficient points balance');

    const unchanged = useMemberStore.getState().findMemberById('mem-3');
    expect(unchanged?.currentPointsBalance).toBe(850.0);
  });

  it('dynamically adds a new member with custom allowance', () => {
    const newMember = useMemberStore.getState().addMember({
      fullName: 'Carlos Mendoza',
      barcode: '990001005',
      department: 'IT Infrastructure',
      monthlyAllowance: 2500.0,
    });

    expect(newMember.id).toBeDefined();
    expect(newMember.fullName).toBe('Carlos Mendoza');
    expect(newMember.currentPointsBalance).toBe(2500.0);

    const found = useMemberStore.getState().findMemberByBarcode('990001005');
    expect(found).toBeDefined();
    expect(found?.monthlyAllowance).toBe(2500.0);
  });

  it('tops up member points dynamically on the fly', () => {
    const res = useMemberStore.getState().topUpPoints('mem-1', 500.0);
    expect(res.success).toBe(true);
    expect(res.newBalance).toBe(2000.0);

    const updated = useMemberStore.getState().findMemberById('mem-1');
    expect(updated?.currentPointsBalance).toBe(2000.0);
  });

  it('configures global default monthly allowance', () => {
    useMemberStore.getState().setDefaultMonthlyAllowance(3000.0);
    expect(useMemberStore.getState().defaultMonthlyAllowance).toBe(3000.0);

    const newMember = useMemberStore.getState().addMember({
      fullName: 'David Lee',
    });
    expect(newMember.monthlyAllowance).toBe(3000.0);
    expect(newMember.currentPointsBalance).toBe(3000.0);
  });

  it('deactivates member', () => {
    useMemberStore.getState().deleteMember('mem-2');
    const found = useMemberStore.getState().findMemberByBarcode('990001002');
    expect(found).toBeUndefined();
  });

  it('resets all monthly allowances', () => {
    useMemberStore.getState().deductPoints('mem-1', 500.0);
    expect(useMemberStore.getState().findMemberById('mem-1')?.currentPointsBalance).toBe(1000.0);

    useMemberStore.getState().resetAllMonthlyAllowances();
    expect(useMemberStore.getState().findMemberById('mem-1')?.currentPointsBalance).toBe(1500.0);
  });
});
