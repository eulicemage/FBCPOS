import { create } from 'zustand';
import { User, Branch, Terminal, UserRole } from '../../../shared/src';

interface AuthState {
  currentUser: User | null;
  currentBranch: Branch | null;
  currentTerminal: Terminal | null;
  isAuthenticated: boolean;
  isOnline: boolean;

  setAuth: (user: User, branch: Branch, terminal: Terminal) => void;
  logout: () => void;
  setOnlineStatus: (status: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: {
    id: 'USR-DEV-001',
    username: 'cashier.001',
    fullName: 'Maria Santos',
    role: UserRole.CASHIER,
    branchId: 'BR-001',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  currentBranch: {
    id: 'BR-001',
    code: 'BR-001',
    name: 'Branch 001 - Downtown Flagship',
    address: '123 Rizal Ave, Manila',
    taxId: '100-001-000-000',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  currentTerminal: {
    id: 'TERM-001-A',
    branchId: 'BR-001',
    terminalNumber: 'T1',
    deviceUid: 'DEV-BR-001-T1',
    name: 'Downtown Flagship - Register 1',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  isAuthenticated: true,
  isOnline: true,

  setAuth: (user, branch, terminal) =>
    set({
      currentUser: user,
      currentBranch: branch,
      currentTerminal: terminal,
      isAuthenticated: true,
    }),

  logout: () =>
    set({
      currentUser: null,
      isAuthenticated: false,
    }),

  setOnlineStatus: (isOnline: boolean) => set({ isOnline }),
}));
