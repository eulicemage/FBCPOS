import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export interface PaymentMethod {
  id: string;
  name: string; // e.g. "GCash", "Maya", "Bank Transfer"
  code: string; // e.g. "GCASH", "MAYA"
  requiresReference: boolean; // prompt for ref# on payment
  isActive: boolean;
  isBuiltIn: boolean;
  createdAt: string;
}

const BUILT_IN_METHODS: PaymentMethod[] = [
  { id: "pm-cash",  name: "Cash",          code: "CASH",    requiresReference: false, isActive: true, isBuiltIn: true, createdAt: new Date().toISOString() },
  { id: "pm-card",  name: "Credit/Debit Card", code: "CARD", requiresReference: true,  isActive: true, isBuiltIn: true, createdAt: new Date().toISOString() },
  { id: "pm-gcash", name: "GCash",          code: "GCASH",   requiresReference: true,  isActive: true, isBuiltIn: true, createdAt: new Date().toISOString() },
  { id: "pm-maya",  name: "Maya",           code: "MAYA",    requiresReference: true,  isActive: true, isBuiltIn: true, createdAt: new Date().toISOString() },
  { id: "pm-bank",  name: "Bank Transfer",  code: "BANK",    requiresReference: true,  isActive: true, isBuiltIn: true, createdAt: new Date().toISOString() },
  { id: "pm-pts",   name: "Company Points", code: "POINTS",  requiresReference: false, isActive: true, isBuiltIn: true, createdAt: new Date().toISOString() },
];

interface PaymentMethodStoreState {
  methods: PaymentMethod[];
  addMethod: (name: string, code: string, requiresReference: boolean) => PaymentMethod;
  toggleMethod: (id: string) => void;
  updateMethod: (id: string, data: Partial<PaymentMethod>) => void;
  deleteMethod: (id: string) => void;
  getActiveMethods: () => PaymentMethod[];
}

export const usePaymentMethodStore = create<PaymentMethodStoreState>((set, get) => ({
  methods: BUILT_IN_METHODS,

  addMethod: (name, code, requiresReference) => {
    const method: PaymentMethod = {
      id: uuidv4(),
      name,
      code: code.toUpperCase(),
      requiresReference,
      isActive: true,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ methods: [...s.methods, method] }));
    return method;
  },

  toggleMethod: (id) => {
    set((s) => ({
      methods: s.methods.map((m) =>
        m.id === id && !m.isBuiltIn ? { ...m, isActive: !m.isActive } : m
      ),
    }));
  },

  updateMethod: (id, data) => {
    set((s) => ({
      methods: s.methods.map((m) => (m.id === id ? { ...m, ...data } : m)),
    }));
  },

  deleteMethod: (id) => {
    set((s) => ({ methods: s.methods.filter((m) => m.id !== id || m.isBuiltIn) }));
  },

  getActiveMethods: () => get().methods.filter((m) => m.isActive),
}));
