import { useSyncQueueStore, SyncQueueItem } from '../store/syncQueueStore';
import { useProductStore } from '../store/productStore';
import { AppConfig } from '../config';

export interface SyncPushResult {
  success: boolean;
  syncedCount: number;
  errors?: Array<{ id: string; error: string }>;
  reason?: string;
}

export class SyncService {
  private static autoSyncTimer: any = null;

  /**
   * Pushes up to batchSize pending records from the local outbox to the cloud API.
   */
  static async pushOutboxBatch(
    branchId = '001',
    terminalId = 'T1',
    batchSize = 25
  ): Promise<SyncPushResult> {
    const queueStore = useSyncQueueStore.getState();

    // 1. Check if terminal is simulated offline or offline
    if (queueStore.isSimulatedOffline || !queueStore.isOnline) {
      return { success: false, syncedCount: 0, reason: 'Terminal is currently in OFFLINE mode.' };
    }

    // 2. Fetch pending items
    const pendingItems = queueStore.getPendingItems(batchSize);
    if (pendingItems.length === 0) {
      return { success: true, syncedCount: 0, reason: 'No pending items to sync.' };
    }

    const itemIds = pendingItems.map((i) => i.id);
    queueStore.markItemsSyncing(itemIds);

    // 3. Format batch payload matching backend SyncPushSchema
    const batchPayload = {
      branchId,
      terminalId,
      batch: pendingItems.map((item) => ({
        id: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation,
        payload: item.payload,
      })),
    };

    try {
      const url = `${AppConfig.defaultApiBaseUrl}/sync/push`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(batchPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Network error');
        queueStore.markItemsFailed(
          pendingItems.map((i) => ({ id: i.id, error: `HTTP ${response.status}: ${errText}` }))
        );
        return {
          success: false,
          syncedCount: 0,
          reason: `Server error: HTTP ${response.status}`,
        };
      }

      const json = await response.json();
      const syncedIds: string[] = json.data?.syncedIds || itemIds;
      const errors: Array<{ id: string; error: string }> = json.data?.errors || [];

      // Acknowledge synced records
      if (syncedIds.length > 0) {
        queueStore.markItemsSynced(syncedIds);
      }

      // Record any individual item failures
      if (errors.length > 0) {
        queueStore.markItemsFailed(errors);
      }

      return {
        success: errors.length === 0,
        syncedCount: syncedIds.length,
        errors,
      };
    } catch (err: any) {
      // Offline / network failure: mark items as failed for backoff retry
      const errMsg = err.name === 'AbortError' ? 'Sync request timed out (6s)' : err.message || 'Network unreachable';
      queueStore.markItemsFailed(
        pendingItems.map((i) => ({ id: i.id, error: errMsg }))
      );
      return { success: false, syncedCount: 0, reason: errMsg };
    }
  }

  /**
   * Pulls delta product updates from cloud into local productStore.
   */
  static async pullCatalogDelta(): Promise<{ success: boolean; updatedCount: number }> {
    const queueStore = useSyncQueueStore.getState();
    if (queueStore.isSimulatedOffline || !queueStore.isOnline) {
      return { success: false, updatedCount: 0 };
    }

    try {
      const url = `${AppConfig.defaultApiBaseUrl}/catalog`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const serverProducts = json.data;
        if (Array.isArray(serverProducts) && serverProducts.length > 0) {
          // Merge server products into local productStore
          const localProducts = useProductStore.getState().products;
          const merged = [...localProducts];

          for (const sp of serverProducts) {
            const idx = merged.findIndex((p) => p.id === sp.id || p.sku === sp.sku);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...sp };
            } else {
              merged.push(sp);
            }
          }

          useProductStore.setState({ products: merged });
          return { success: true, updatedCount: serverProducts.length };
        }
      }
      return { success: true, updatedCount: 0 };
    } catch {
      return { success: false, updatedCount: 0 };
    }
  }

  /**
   * Executes a full push-and-pull sync pass.
   */
  static async triggerFullSync(branchId = '001', terminalId = 'T1'): Promise<SyncPushResult> {
    const pushRes = await this.pushOutboxBatch(branchId, terminalId);
    await this.pullCatalogDelta();
    return pushRes;
  }

  /**
   * Starts background auto-sync polling loop.
   */
  static startAutoSync(intervalMs = 15000): void {
    if (this.autoSyncTimer) return;
    this.autoSyncTimer = setInterval(() => {
      this.pushOutboxBatch().catch(() => {});
    }, intervalMs);
  }

  static stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }
}
