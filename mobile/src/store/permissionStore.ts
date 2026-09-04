import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type FeatureKey =
  | 'ORDER_NEW'
  | 'DISCOUNT_TRANSACTION'
  | 'DISCOUNT_ITEM'
  | 'VOID_ITEM'
  | 'CUSTOMER_ASSIGN'
  | 'QUANTITY_CHANGE'
  | 'HOLD_CART'
  | 'RETRIEVE_CART'
  | 'REFUND'
  | 'CANCEL_TRANSACTION'
  | 'PAY_IN_OUT'
  | 'DELIVER'
  | 'SWITCH_CASHIER'
  | 'CALCULATOR'
  | 'RECORDS_VIEW'
  | 'MEMBERSHIP_VIEW'
  | 'PRODUCTS_MANAGE'
  | 'INVENTORY_MANAGE'
  | 'CLOSE_STORE'
  | 'PAYMENT_METHODS'
  | 'DATABASE_MANAGEMENT'
  | 'SETTINGS_STORE'
  | 'SETTINGS_STAFF'
  | 'SETTINGS_BACKUP'
  | 'PRICE_MODE_WHOLESALE'
  | 'REDEEM_POINTS';

export const ALL_FEATURES: FeatureKey[] = [
  'ORDER_NEW','DISCOUNT_TRANSACTION','DISCOUNT_ITEM','VOID_ITEM','CUSTOMER_ASSIGN',
  'QUANTITY_CHANGE','HOLD_CART','RETRIEVE_CART','REFUND','CANCEL_TRANSACTION',
  'PAY_IN_OUT','DELIVER','SWITCH_CASHIER','CALCULATOR','RECORDS_VIEW','MEMBERSHIP_VIEW',
  'PRODUCTS_MANAGE','INVENTORY_MANAGE','CLOSE_STORE','PAYMENT_METHODS','DATABASE_MANAGEMENT',
  'SETTINGS_STORE','SETTINGS_STAFF','SETTINGS_BACKUP','PRICE_MODE_WHOLESALE','REDEEM_POINTS',
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  ORDER_NEW: 'New Order',
  DISCOUNT_TRANSACTION: 'Apply Transaction Discount',
  DISCOUNT_ITEM: 'Apply Item Discount',
  VOID_ITEM: 'Void Item',
  CUSTOMER_ASSIGN: 'Assign Customer / Member',
  QUANTITY_CHANGE: 'Change Item Quantity',
  HOLD_CART: 'Hold Cart',
  RETRIEVE_CART: 'Retrieve Held Cart',
  REFUND: 'Process Refund',
  CANCEL_TRANSACTION: 'Cancel Transaction',
  PAY_IN_OUT: 'Pay In / Pay Out',
  DELIVER: 'Mark as Delivery',
  SWITCH_CASHIER: 'Switch Cashier (X-Read)',
  CALCULATOR: 'Calculator',
  RECORDS_VIEW: 'View Records & Reports',
  MEMBERSHIP_VIEW: 'Customer & Membership',
  PRODUCTS_MANAGE: 'Manage Products',
  INVENTORY_MANAGE: 'Manage Inventory',
  CLOSE_STORE: 'Close Store (Z-Read)',
  PAYMENT_METHODS: 'Manage Payment Methods',
  DATABASE_MANAGEMENT: 'Database Import / Export',
  SETTINGS_STORE: 'Store Settings',
  SETTINGS_STAFF: 'Staff & Role Settings',
  SETTINGS_BACKUP: 'Database Backup Settings',
  PRICE_MODE_WHOLESALE: 'Wholesale Price Mode',
  REDEEM_POINTS: 'Redeem Member Points',
};

export interface StaffRole {
  id: string;
  name: string;
  allowedFeatures: FeatureKey[];
  isBuiltIn: boolean;
}

export interface StaffAccount {
  id: string;
  fullName: string;
  username: string;
  pin: string;
  roleId: string;
  isActive: boolean;
  createdAt: string;
}

const DEFAULT_CASHIER_FEATURES: FeatureKey[] = [
  'ORDER_NEW','DISCOUNT_TRANSACTION','DISCOUNT_ITEM','CUSTOMER_ASSIGN','QUANTITY_CHANGE',
  'HOLD_CART','RETRIEVE_CART','CANCEL_TRANSACTION','PAY_IN_OUT','DELIVER','SWITCH_CASHIER',
  'CALCULATOR','RECORDS_VIEW','MEMBERSHIP_VIEW','REDEEM_POINTS',
];

const DEFAULT_ROLES: StaffRole[] = [
  { id: 'role-cashier', name: 'Cashier', allowedFeatures: DEFAULT_CASHIER_FEATURES, isBuiltIn: true },
  {
    id: 'role-supervisor', name: 'Supervisor',
    allowedFeatures: [...DEFAULT_CASHIER_FEATURES,'VOID_ITEM','REFUND','PRODUCTS_MANAGE','INVENTORY_MANAGE','PRICE_MODE_WHOLESALE'],
    isBuiltIn: true,
  },
  { id: 'role-manager', name: 'Manager', allowedFeatures: ALL_FEATURES, isBuiltIn: true },
  { id: 'role-programmer', name: 'Programmer', allowedFeatures: ALL_FEATURES, isBuiltIn: true },
];

const DEFAULT_ACCOUNTS: StaffAccount[] = [
  { id: 'staff-001', fullName: 'Maria Santos', username: 'maria.santos', pin: '1234', roleId: 'role-cashier', isActive: true, createdAt: new Date().toISOString() },
  { id: 'staff-002', fullName: 'Branch Manager', username: 'manager', pin: '5678', roleId: 'role-manager', isActive: true, createdAt: new Date().toISOString() },
];

interface PermissionStoreState {
  roles: StaffRole[];
  accounts: StaffAccount[];
  sessionBypassActive: boolean;
  addRole: (name: string, features: FeatureKey[]) => StaffRole;
  updateRoleFeatures: (roleId: string, features: FeatureKey[]) => void;
  deleteRole: (roleId: string) => void;
  addAccount: (data: Omit<StaffAccount, 'id' | 'createdAt'>) => StaffAccount;
  updateAccount: (id: string, data: Partial<StaffAccount>) => void;
  deactivateAccount: (id: string) => void;
  findAccountByPin: (pin: string) => StaffAccount | null;
  getRoleById: (roleId: string) => StaffRole | undefined;
  canAccess: (roleId: string, feature: FeatureKey) => boolean;
  activateSessionBypass: () => void;
  deactivateSessionBypass: () => void;
}

export const usePermissionStore = create<PermissionStoreState>((set, get) => ({
  roles: DEFAULT_ROLES,
  accounts: DEFAULT_ACCOUNTS,
  sessionBypassActive: false,

  addRole: (name, features) => {
    const role: StaffRole = { id: uuidv4(), name, allowedFeatures: features, isBuiltIn: false };
    set((s) => ({ roles: [...s.roles, role] }));
    return role;
  },
  updateRoleFeatures: (roleId, features) => {
    set((s) => ({ roles: s.roles.map((r) => r.id === roleId ? { ...r, allowedFeatures: features } : r) }));
  },
  deleteRole: (roleId) => {
    set((s) => ({ roles: s.roles.filter((r) => r.id !== roleId || r.isBuiltIn) }));
  },
  addAccount: (data) => {
    const account: StaffAccount = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
    set((s) => ({ accounts: [...s.accounts, account] }));
    return account;
  },
  updateAccount: (id, data) => {
    set((s) => ({ accounts: s.accounts.map((a) => a.id === id ? { ...a, ...data } : a) }));
  },
  deactivateAccount: (id) => {
    set((s) => ({ accounts: s.accounts.map((a) => a.id === id ? { ...a, isActive: false } : a) }));
  },
  findAccountByPin: (pin) => get().accounts.find((a) => a.pin === pin && a.isActive) ?? null,
  getRoleById: (roleId) => get().roles.find((r) => r.id === roleId),
  canAccess: (roleId, feature) => {
    if (get().sessionBypassActive) return true;
    const role = get().getRoleById(roleId);
    return role ? role.allowedFeatures.includes(feature) : false;
  },
  activateSessionBypass: () => set({ sessionBypassActive: true }),
  deactivateSessionBypass: () => set({ sessionBypassActive: false }),
}));
