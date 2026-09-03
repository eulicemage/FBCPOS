import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncService } from './syncService';
import { useSyncQueueStore } from '../store/syncQueueStore';

describe('SyncService', () => {
  beforeEach(() => {
    useSyncQueueStore.getState().resetToDefaults();
    vi.restoreAllMocks();
  });

  it('aborts push immediately when terminal is in simulated offline mode', async () => {
    useSyncQueueStore.getState().setSimulatedOffline(true);
    useSyncQueueStore.getState().enqueue('SALE', 'sale-1', 'INSERT', { total: 100 });

    const result = await SyncService.pushOutboxBatch('001', 'T1');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('OFFLINE mode');
    expect(useSyncQueueStore.getState().queue[0].status).toBe('PENDING');
  });

  it('returns success 0 when queue has no pending items', async () => {
    const result = await SyncService.pushOutboxBatch('001', 'T1');
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(0);
  });

  it('successfully pushes batch when backend returns 200 with synced IDs', async () => {
    const item = useSyncQueueStore.getState().enqueue('SALE', 'sale-1', 'INSERT', { total: 200 });

    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          status: 'SUCCESS',
          syncedCount: 1,
          syncedIds: [item.id],
          errors: [],
        },
      }),
    } as any);

    const result = await SyncService.pushOutboxBatch('001', 'T1');
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(1);
    expect(useSyncQueueStore.getState().queue[0].status).toBe('SYNCED');
  });

  it('marks items as FAILED with error message when network fails', async () => {
    const item = useSyncQueueStore.getState().enqueue('STOCK_MOVEMENT', 'mov-1', 'INSERT', { qty: 5 });

    // Mock network error
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const result = await SyncService.pushOutboxBatch('001', 'T1');
    expect(result.success).toBe(false);
    expect(useSyncQueueStore.getState().queue[0].status).toBe('FAILED');
    expect(useSyncQueueStore.getState().queue[0].errorMessage).toBe('Connection refused');
    expect(useSyncQueueStore.getState().queue[0].retryCount).toBe(1);
  });
});

