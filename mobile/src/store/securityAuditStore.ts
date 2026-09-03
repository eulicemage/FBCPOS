import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type SecurityEventType =
  | 'BYPASS_ACTIVATED'
  | 'BYPASS_DEACTIVATED'
  | 'MANUAL_DRAWER_KICK'
  | 'HIGH_VALUE_VOID'
  | 'SUPERVISOR_PIN_VERIFIED'
  | 'MEMBER_ALLOWANCE_OVERRIDE'
  | 'DATABASE_RESTORE';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityAuditEvent {
  id: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  userId: string;
  userName: string;
  terminalId: string;
  details: string;
  timestamp: string;
}

const INITIAL_SECURITY_EVENTS: SecurityAuditEvent[] = [
  {
    id: 'sec-init-1',
    eventType: 'BYPASS_ACTIVATED',
    severity: 'MEDIUM',
    userId: 'user-default',
    userName: 'Cashier Maria',
    terminalId: 'T1',
    details: 'Master Bypass Mode enabled from top header',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
];

interface SecurityAuditStoreState {
  events: SecurityAuditEvent[];

  logEvent: (
    eventType: SecurityEventType,
    severity: SecuritySeverity,
    details: string,
    userName?: string,
    userId?: string,
    terminalId?: string
  ) => SecurityAuditEvent;
  getEvents: (limit?: number) => SecurityAuditEvent[];
  resetToDefaults: () => void;
}

export const useSecurityAuditStore = create<SecurityAuditStoreState>((set, get) => ({
  events: INITIAL_SECURITY_EVENTS,

  logEvent: (eventType, severity, details, userName = 'Cashier', userId = 'usr-current', terminalId = 'T1') => {
    const newEvent: SecurityAuditEvent = {
      id: uuidv4(),
      eventType,
      severity,
      userId,
      userName,
      terminalId,
      details,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      events: [newEvent, ...state.events],
    }));

    return newEvent;
  },

  getEvents: (limit = 100) => {
    return get().events.slice(0, limit);
  },

  resetToDefaults: () => {
    set({ events: INITIAL_SECURITY_EVENTS });
  },
}));

