import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export interface MemberGroup {
  id: string;
  name: string; // e.g. "IT Employees", "Production Staff"
  description?: string;
  pointsAllowance: number; // monthly points allocated to all in this group
  createdAt: string;
}

export interface GroupDiscount {
  id: string;
  groupId: string;
  groupName: string;
  percentage: number; // e.g. 5 = 5%
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface MemberTopUp {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  reason: string;
  performedBy: string;
  timestamp: string;
}

const INITIAL_GROUPS: MemberGroup[] = [
  { id: "grp-1", name: "IT Department", description: "Information Technology staff", pointsAllowance: 1500, createdAt: new Date().toISOString() },
  { id: "grp-2", name: "Warehouse Operations", description: "Warehouse and logistics staff", pointsAllowance: 1500, createdAt: new Date().toISOString() },
  { id: "grp-3", name: "Store Management", description: "Store managers and supervisors", pointsAllowance: 2000, createdAt: new Date().toISOString() },
];

const INITIAL_DISCOUNTS: GroupDiscount[] = [
  { id: "disc-1", groupId: "grp-1", groupName: "IT Department", percentage: 5, startDate: new Date().toISOString().slice(0,10), isActive: true, createdAt: new Date().toISOString() },
];

interface MemberGroupStoreState {
  groups: MemberGroup[];
  groupDiscounts: GroupDiscount[];
  topUpHistory: MemberTopUp[];

  addGroup: (name: string, description: string, pointsAllowance: number) => MemberGroup;
  updateGroup: (id: string, data: Partial<MemberGroup>) => void;
  deleteGroup: (id: string) => void;

  addGroupDiscount: (groupId: string, percentage: number, startDate: string, endDate?: string) => GroupDiscount;
  updateGroupDiscount: (id: string, data: Partial<GroupDiscount>) => void;
  deactivateGroupDiscount: (id: string) => void;

  getActiveDiscountForGroup: (groupId: string) => GroupDiscount | undefined;
  getGroupByName: (name: string) => MemberGroup | undefined;

  recordTopUp: (memberId: string, memberName: string, amount: number, reason: string, performedBy: string) => MemberTopUp;
  getTopUpHistoryForMember: (memberId: string) => MemberTopUp[];
}

export const useMemberGroupStore = create<MemberGroupStoreState>((set, get) => ({
  groups: INITIAL_GROUPS,
  groupDiscounts: INITIAL_DISCOUNTS,
  topUpHistory: [],

  addGroup: (name, description, pointsAllowance) => {
    const group: MemberGroup = { id: uuidv4(), name, description, pointsAllowance, createdAt: new Date().toISOString() };
    set((s) => ({ groups: [...s.groups, group] }));
    return group;
  },
  updateGroup: (id, data) => {
    set((s) => ({ groups: s.groups.map((g) => g.id === id ? { ...g, ...data } : g) }));
  },
  deleteGroup: (id) => {
    set((s) => ({ groups: s.groups.filter((g) => g.id !== id) }));
  },

  addGroupDiscount: (groupId, percentage, startDate, endDate) => {
    const group = get().groups.find((g) => g.id === groupId);
    const discount: GroupDiscount = {
      id: uuidv4(),
      groupId,
      groupName: group?.name ?? "Unknown Group",
      percentage,
      startDate,
      endDate,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ groupDiscounts: [...s.groupDiscounts, discount] }));
    return discount;
  },
  updateGroupDiscount: (id, data) => {
    set((s) => ({ groupDiscounts: s.groupDiscounts.map((d) => d.id === id ? { ...d, ...data } : d) }));
  },
  deactivateGroupDiscount: (id) => {
    set((s) => ({ groupDiscounts: s.groupDiscounts.map((d) => d.id === id ? { ...d, isActive: false } : d) }));
  },

  getActiveDiscountForGroup: (groupId) => {
    const today = new Date().toISOString().slice(0,10);
    return get().groupDiscounts.find(
      (d) => d.groupId === groupId && d.isActive && d.startDate <= today && (!d.endDate || d.endDate >= today)
    );
  },

  getGroupByName: (name) => get().groups.find((g) => g.name.toLowerCase() === name.toLowerCase()),

  recordTopUp: (memberId, memberName, amount, reason, performedBy) => {
    const topUp: MemberTopUp = {
      id: uuidv4(),
      memberId,
      memberName,
      amount,
      reason,
      performedBy,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ topUpHistory: [...s.topUpHistory, topUp] }));
    return topUp;
  },
  getTopUpHistoryForMember: (memberId) => get().topUpHistory.filter((t) => t.memberId === memberId),
}));
