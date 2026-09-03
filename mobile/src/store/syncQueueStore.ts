import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type SyncEntityType =
  | 'SALE'
  | 'STOCK_MOVEMENT'
  | 'SHIFT'
  | 'RETURN'
  | 'CASH_TX';

export type SyncOperation = 'INSERT' | 'UPDATE';
export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface SyncQueueItem {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: any;
  status: SyncStatus;
  retryCount: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  createdAt: string;
}

interface SyncQueueStoreState {
  queue: SyncQueueItem[];
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncedCount: number;
  failedCount: number;

  enqueue: (
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperation,
    payload: any
  ) => SyncQueueItem;
  getPendingItems: (limit?: number) => SyncQueueItem[];
  getPendingCount: () => number;
  markItemsSyncing: (ids: string[]) => void;
  markItemsSynced: (ids: string[]) => void;
  markItemsFailed: (errors: Array<{ id: string; error: string }>) => void;
  setSimulatedOffline: (offline: boolean) => void;
  setOnline: (online: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: string) => void;
  clearSynced: () => void;
  resetToDefaults: () => void;
}

export const useSyncQueueStore = create<SyncQueueStoreState>((set, get) => ({
  queue: [],
  isOnline: true,
  isSimulatedOffline: false,
  isSyncing: false,
  lastSyncTime: null,
  syncedCount: 0,
  failedCount: 0,

  enqueue: (entityType, entityId, operation, payload) => {
    const newItem: SyncQueueItem = {
      id: uuidv4(),
      entityType,
      entityId,
      operation,
      payload,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      queue: [newItem, ...state.queue],
    }));

    return newItem;
  },

  getPendingItems: (limit = 25) => {
    return get()
      .queue.filter((item) => item.status === 'PENDING' || item.status === 'FAILED')
      .slice(0, limit);
  },

  getPendingCount: () => {
    return get().queue.filter(
      (item) => item.status === 'PENDING' || item.status === 'FAILED'
    ).length;
  },

  markItemsSyncing: (ids: string[]) => {
    const idSet = new Set(ids);
    set((state) => ({
      queue: state.queue.map((item) =>
        idSet.has(item.id) ? { ...item, status: 'SYNCING' as SyncStatus } : item
      ),
      isSyncing: true,
    }));
  },

  markItemsSynced: (ids: string[]) => {
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    set((state) => ({
      queue: state.queue.map((item) =>
        idSet.has(item.id)
          ? {
              ...item,
              status: 'SYNCED' as SyncStatus,
              lastAttemptAt: now,
              errorMessage: undefined,
            }
          : item
      ),
      syncedCount: state.syncedCount + ids.length,
      lastSyncTime: now,
      isSyncing: false,
    }));
  },

  markItemsFailed: (errors: Array<{ id: string; error: string }>) => {
    const errorMap = new Map(errors.map((e) => [e.id, e.error]));
    const now = new Date().toISOString();
    set((state) => ({
      queue: state.queue.map((item) => {
        if (errorMap.has(item.id)) {
          return {
            ...item,
            status: 'FAILED' as SyncStatus,
            retryCount: item.retryCount + 1,
            lastAttemptAt: now,
            errorMessage: errorMap.get(item.id),
          };
        }
        return item;
      }),
      failedCount: state.failedCount + errors.length,
      isSyncing: false,
    }));
  },

  setSimulatedOffline: (offline: boolean) => {
    set({ isSimulatedOffline: offline });
  },

  setOnline: (online: boolean) => {
    set({ isOnline: online });
  },

  setIsSyncing: (syncing: boolean) => {
    set({ isSyncing: syncing });
  },

  setLastSyncTime: (time: string) => {
    set({ lastSyncTime: time });
  },

  clearSynced: () => {
    set((state) => ({
      queue: state.queue.filter((item) => item.status !== 'SYNCED'),
    }));
  },

  resetToDefaults: () => {
    set({
      queue: [],
      isOnline: true,
      isSimulatedOffline: false,
      isSyncing: false,
      lastSyncTime: null,
      syncedCount: 0,
      failedCount: 0,
    });
  },
}));

