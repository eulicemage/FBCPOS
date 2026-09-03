import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Member {
  id: string;
  memberNumber: string;
  barcode: string;
  fullName: string;
  department?: string;
  monthlyAllowance: number; // e.g. 1500 per month
  currentPointsBalance: number; // 1 point = 1.00 PHP
  consumedThisMonth: number;
  lastResetDate: string;
  isActive: boolean;
}

export interface AddMemberInput {
  fullName: string;
  barcode?: string;
  department?: string;
  monthlyAllowance?: number;
  initialBalance?: number;
}

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'mem-1',
    memberNumber: 'MEM-1001',
    barcode: '990001001',
    fullName: 'Maria Santos',
    department: 'Warehouse Operations',
    monthlyAllowance: 1500.0,
    currentPointsBalance: 1500.0,
    consumedThisMonth: 0.0,
    lastResetDate: new Date().toISOString().slice(0, 10),
    isActive: true,
  },
  {
    id: 'mem-2',
    memberNumber: 'MEM-1002',
    barcode: '990001002',
    fullName: 'Juan Dela Cruz',
    department: 'Logistics & Fleet',
    monthlyAllowance: 1500.0,
    currentPointsBalance: 1250.0,
    consumedThisMonth: 250.0,
    lastResetDate: new Date().toISOString().slice(0, 10),
    isActive: true,
  },
  {
    id: 'mem-3',
    memberNumber: 'MEM-1003',
    barcode: '990001003',
    fullName: 'Roberto Gomez',
    department: 'Store Management',
    monthlyAllowance: 2000.0,
    currentPointsBalance: 850.0,
    consumedThisMonth: 1150.0,
    lastResetDate: new Date().toISOString().slice(0, 10),
    isActive: true,
  },
  {
    id: 'mem-4',
    memberNumber: 'MEM-1004',
    barcode: '990001004',
    fullName: 'Ana Reyes',
    department: 'Accounting & Finance',
    monthlyAllowance: 1500.0,
    currentPointsBalance: 1500.0,
    consumedThisMonth: 0.0,
    lastResetDate: new Date().toISOString().slice(0, 10),
    isActive: true,
  },
];

interface MemberStoreState {
  members: Member[];
  selectedMember: Member | null;
  defaultMonthlyAllowance: number; // Configurable store-wide default allowance

  setDefaultMonthlyAllowance: (amount: number) => void;
  selectMember: (member: Member | null) => void;
  findMemberByBarcode: (barcode: string) => Member | undefined;
  findMemberById: (id: string) => Member | undefined;
  searchMembers: (query: string) => Member[];
  addMember: (input: AddMemberInput) => Member;
  updateMember: (id: string, updates: Partial<Member>) => void;
  topUpPoints: (id: string, amount: number) => { success: boolean; newBalance: number };
  deleteMember: (id: string) => void;
  deductPoints: (id: string, amount: number) => { success: boolean; newBalance: number; error?: string };
  resetMemberPoints: (id: string, customAmount?: number) => void;
  resetAllMonthlyAllowances: () => void;
  resetToDefaults: () => void;
}

export const useMemberStore = create<MemberStoreState>((set, get) => ({
  members: INITIAL_MEMBERS,
  selectedMember: null,
  defaultMonthlyAllowance: 1500.0,

  setDefaultMonthlyAllowance: (amount: number) => {
    if (amount > 0) {
      set({ defaultMonthlyAllowance: amount });
    }
  },

  selectMember: (member) => set({ selectedMember: member }),

  findMemberByBarcode: (barcode: string) => {
    const cleaned = barcode.trim();
    return get().members.find(
      (m) => (m.barcode === cleaned || m.memberNumber === cleaned) && m.isActive
    );
  },

  findMemberById: (id: string) => {
    return get().members.find((m) => m.id === id);
  },

  searchMembers: (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return get().members.filter((m) => m.isActive);
    return get().members.filter(
      (m) =>
        m.isActive &&
        (m.fullName.toLowerCase().includes(q) ||
          m.barcode.includes(q) ||
          m.memberNumber.toLowerCase().includes(q) ||
          (m.department && m.department.toLowerCase().includes(q)))
    );
  },

  addMember: (input: AddMemberInput) => {
    const id = uuidv4();
    const count = get().members.length + 1;
    const memberNumber = `MEM-${(1000 + count).toString()}`;
    const barcode = input.barcode?.trim() || `99000${(1000 + count).toString()}`;
    const allowance =
      input.monthlyAllowance !== undefined ? input.monthlyAllowance : get().defaultMonthlyAllowance;
    const balance = input.initialBalance !== undefined ? input.initialBalance : allowance;

    const newMember: Member = {
      id,
      memberNumber,
      barcode,
      fullName: input.fullName.trim(),
      department: input.department?.trim() || 'General Staff',
      monthlyAllowance: allowance,
      currentPointsBalance: balance,
      consumedThisMonth: 0,
      lastResetDate: new Date().toISOString().slice(0, 10),
      isActive: true,
    };

    set((state) => ({
      members: [newMember, ...state.members],
    }));

    return newMember;
  },

  updateMember: (id: string, updates: Partial<Member>) => {
    set((state) => ({
      members: state.members.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
      selectedMember:
        state.selectedMember?.id === id
          ? { ...state.selectedMember, ...updates }
          : state.selectedMember,
    }));
  },

  topUpPoints: (id: string, amount: number) => {
    const member = get().findMemberById(id);
    if (!member) {
      return { success: false, newBalance: 0 };
    }
    const newBal = Math.round((member.currentPointsBalance + amount) * 100) / 100;
    get().updateMember(id, { currentPointsBalance: newBal });
    return { success: true, newBalance: newBal };
  },

  deleteMember: (id: string) => {
    set((state) => ({
      members: state.members.map((m) => (m.id === id ? { ...m, isActive: false } : m)),
      selectedMember: state.selectedMember?.id === id ? null : state.selectedMember,
    }));
  },

  deductPoints: (id: string, amount: number) => {
    const member = get().findMemberById(id);
    if (!member) {
      return { success: false, newBalance: 0, error: 'Member not found.' };
    }

    if (amount <= 0) {
      return { success: false, newBalance: member.currentPointsBalance, error: 'Amount must be greater than zero.' };
    }

    if (member.currentPointsBalance < amount) {
      return {
        success: false,
        newBalance: member.currentPointsBalance,
        error: `Insufficient points balance. Available: P${member.currentPointsBalance.toFixed(2)}, Required: P${amount.toFixed(2)}.`,
      };
    }

    const newBalance = Math.round((member.currentPointsBalance - amount) * 100) / 100;
    const newConsumed = Math.round((member.consumedThisMonth + amount) * 100) / 100;

    set((state) => ({
      members: state.members.map((m) =>
        m.id === id
          ? { ...m, currentPointsBalance: newBalance, consumedThisMonth: newConsumed }
          : m
      ),
      selectedMember:
        state.selectedMember?.id === id
          ? { ...state.selectedMember, currentPointsBalance: newBalance, consumedThisMonth: newConsumed }
          : state.selectedMember,
    }));

    return { success: true, newBalance };
  },

  resetMemberPoints: (id: string, customAmount?: number) => {
    set((state) => ({
      members: state.members.map((m) => {
        if (m.id === id) {
          const balance = customAmount !== undefined ? customAmount : m.monthlyAllowance;
          return {
            ...m,
            currentPointsBalance: balance,
            consumedThisMonth: 0,
            lastResetDate: new Date().toISOString().slice(0, 10),
          };
        }
        return m;
      }),
    }));
  },

  resetAllMonthlyAllowances: () => {
    const today = new Date().toISOString().slice(0, 10);
    set((state) => ({
      members: state.members.map((m) => ({
        ...m,
        currentPointsBalance: m.monthlyAllowance,
        consumedThisMonth: 0,
        lastResetDate: today,
      })),
    }));
  },

  resetToDefaults: () => {
    set({
      members: INITIAL_MEMBERS,
      selectedMember: null,
      defaultMonthlyAllowance: 1500.0,
    });
  },
}));
