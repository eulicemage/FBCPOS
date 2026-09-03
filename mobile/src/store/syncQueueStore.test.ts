import { describe, it, expect, beforeEach } from 'vitest';
import { useSyncQueueStore } from './syncQueueStore';

describe('SyncQueueStore', () => {
  beforeEach(() => {
    useSyncQueueStore.getState().resetToDefaults();
  });

  it('enqueues a new item with PENDING status', () => {
    const item = useSyncQueueStore.getState().enqueue('SALE', 'sale-1', 'INSERT', {
      invoiceNumber: 'BR-001-T1-20260903-0001',
      totalAmount: 190.0,
    });

    expect(item.id).toBeDefined();
    expect(item.entityType).toBe('SALE');
    expect(item.status).toBe('PENDING');
    expect(item.retryCount).toBe(0);
    expect(useSyncQueueStore.getState().getPendingCount()).toBe(1);
  });

  it('retrieves pending items up to batch limit', () => {
    for (let i = 1; i <= 5; i++) {
      useSyncQueueStore.getState().enqueue('STOCK_MOVEMENT', `mov-${i}`, 'INSERT', { qty: i });
    }

    const batch = useSyncQueueStore.getState().getPendingItems(3);
    expect(batch.length).toBe(3);
    expect(useSyncQueueStore.getState().getPendingCount()).toBe(5);
  });

  it('marks items as SYNCING and SYNCED upon acknowledgment', () => {
    const item1 = useSyncQueueStore.getState().enqueue('SALE', 'sale-1', 'INSERT', {});
    const item2 = useSyncQueueStore.getState().enqueue('SALE', 'sale-2', 'INSERT', {});

    useSyncQueueStore.getState().markItemsSyncing([item1.id]);
    expect(useSyncQueueStore.getState().queue.find((i) => i.id === item1.id)?.status).toBe('SYNCING');

    useSyncQueueStore.getState().markItemsSynced([item1.id]);
    expect(useSyncQueueStore.getState().queue.find((i) => i.id === item1.id)?.status).toBe('SYNCED');
    expect(useSyncQueueStore.getState().syncedCount).toBe(1);
    expect(useSyncQueueStore.getState().getPendingCount()).toBe(1);
  });

  it('records retry count and error message on failed sync item', () => {
    const item = useSyncQueueStore.getState().enqueue('RETURN', 'ret-1', 'INSERT', {});

    useSyncQueueStore.getState().markItemsFailed([
      { id: item.id, error: 'Network timeout (504 Gateway)' },
    ]);

    const failedItem = useSyncQueueStore.getState().queue.find((i) => i.id === item.id);
    expect(failedItem?.status).toBe('FAILED');
    expect(failedItem?.retryCount).toBe(1);
    expect(failedItem?.errorMessage).toBe('Network timeout (504 Gateway)');
    expect(useSyncQueueStore.getState().failedCount).toBe(1);
  });

  it('toggles simulated offline mode', () => {
    expect(useSyncQueueStore.getState().isSimulatedOffline).toBe(false);
    useSyncQueueStore.getState().setSimulatedOffline(true);
    expect(useSyncQueueStore.getState().isSimulatedOffline).toBe(true);
  });
});

