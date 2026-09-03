import { describe, it, expect, beforeEach } from 'vitest';
import { useSecurityAuditStore } from './securityAuditStore';

describe('SecurityAuditStore', () => {
  beforeEach(() => {
    useSecurityAuditStore.getState().resetToDefaults();
  });

  it('logs security audit events with severity and user metadata', () => {
    const event = useSecurityAuditStore.getState().logEvent(
      'MANUAL_DRAWER_KICK',
      'HIGH',
      'No-sale cash drawer opened manually by cashier',
      'Maria Santos',
      'usr-101',
      'T1'
    );

    expect(event.id).toBeDefined();
    expect(event.eventType).toBe('MANUAL_DRAWER_KICK');
    expect(event.severity).toBe('HIGH');
    expect(event.userName).toBe('Maria Santos');
    expect(useSecurityAuditStore.getState().events[0].id).toBe(event.id);
  });

  it('retrieves events chronologically', () => {
    useSecurityAuditStore.getState().logEvent('BYPASS_ACTIVATED', 'MEDIUM', 'Bypass ON');
    useSecurityAuditStore.getState().logEvent('BYPASS_DEACTIVATED', 'LOW', 'Bypass OFF');

    const events = useSecurityAuditStore.getState().getEvents(2);
    expect(events.length).toBe(2);
    expect(events[0].eventType).toBe('BYPASS_DEACTIVATED');
  });
});
