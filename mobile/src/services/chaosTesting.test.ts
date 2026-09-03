import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DraftCartService } from './draftCartService';
import { useCartStore } from '../store/cartStore';
import { useSyncQueueStore } from '../store/syncQueueStore';
import { SyncService } from './syncService';
import { BackupService } from './backupService';
import { HardwareManager, NetworkTransport } from './hardwareTransport';
import { DiscountType } from '../../../shared/src';

describe('Chaos & Fault Injection Suite (Production Hardening)', () => {
  beforeEach(() => {
    DraftCartService.clearDraft();
    useCartStore.getState().clearCart();
    useSyncQueueStore.getState().resetToDefaults();
    BackupService.clearHistory();
    vi.restoreAllMocks();
  });

  it('CHAOS 1: Sudden tablet power loss mid-transaction preserves and recovers draft cart', () => {
    // 1. Cashier adds items
    const testItem = {
      productId: 'p1',
      sku: 'MILK-001',
      barcode: '480000000001',
      name: 'Fresh Whole Milk 1L',
      costPrice: 75.0,
      unitPrice: 95.0,
      quantity: 3,
      discountAmount: 0,
      taxAmount: 30.54,
      subtotal: 285.0,
      total: 285.0,
      isTaxable: true,
      taxRate: 0.12,
    };

    // 2. Draft service captures state before power cut
    DraftCartService.saveDraft(
      [testItem],
      DiscountType.NONE,
      0,
      'Recovered Customer',
      undefined,
      undefined,
      285.0
    );

    // 3. Simulate sudden OS death (cart store memory wiped)
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items.length).toBe(0);

    // 4. App restarts: detect pending draft
    const draft = DraftCartService.getPendingDraft();
    expect(draft).not.toBeNull();
    expect(draft?.items.length).toBe(1);
    expect(draft?.customerName).toBe('Recovered Customer');
    expect(draft?.totalAmount).toBe(285.0);

    // 5. Restore cart
    useCartStore.getState().loadCart(
      draft!.items,
      draft!.discountType,
      draft!.discountValue,
      draft!.customerName
    );

    expect(useCartStore.getState().items.length).toBe(1);
    expect(useCartStore.getState().getTotalAmount()).toBe(285.0);
  });

  it('CHAOS 2: Rapid network flapping queues transactions and recovers without duplicate loss', async () => {
    const queueStore = useSyncQueueStore.getState();

    // 1. Terminal is online, process 1st sale
    const sale1 = queueStore.enqueue('SALE', 'sale-flap-1', 'INSERT', { total: 100 });
    expect(queueStore.getPendingCount()).toBe(1);

    // 2. Network flaps to OFFLINE
    queueStore.setSimulatedOffline(true);
    const sale2 = queueStore.enqueue('SALE', 'sale-flap-2', 'INSERT', { total: 200 });
    const sale3 = queueStore.enqueue('SALE', 'sale-flap-3', 'INSERT', { total: 300 });
    expect(queueStore.getPendingCount()).toBe(3);

    // Push attempt while offline fails gracefully
    const offlineAttempt = await SyncService.pushOutboxBatch('001', 'T1');
    expect(offlineAttempt.success).toBe(false);
    expect(queueStore.getPendingCount()).toBe(3);

    // 3. Network flaps back to ONLINE
    queueStore.setSimulatedOffline(false);

    // Mock successful batch acknowledgment from server
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          status: 'SUCCESS',
          syncedCount: 3,
          syncedIds: [sale1.id, sale2.id, sale3.id],
          errors: [],
        },
      }),
    } as any);

    const onlineAttempt = await SyncService.pushOutboxBatch('001', 'T1');
    expect(onlineAttempt.success).toBe(true);
    expect(onlineAttempt.syncedCount).toBe(3);
    expect(queueStore.getPendingCount()).toBe(0);
  });

  it('CHAOS 3: Corrupted database snapshot tamper detection aborts restore', () => {
    // 1. Create valid snapshot
    const validSnapshot = BackupService.createBackupSnapshot('001', 'T1');

    // 2. Adversary or bad disk alters snapshot data
    const tamperedSnapshot = {
      ...validSnapshot,
      data: {
        ...validSnapshot.data,
        products: [{ id: 'injected', name: 'Malicious Injected Item' }],
      },
    };

    // 3. Restore must fail due to checksum mismatch
    const result = BackupService.restoreFromSnapshot(tamperedSnapshot);
    expect(result.success).toBe(false);
    expect(result.message).toContain('checksum mismatch');
  });

  it('CHAOS 4: Thermal printer disconnection or network socket failure fails gracefully', async () => {
    // Configure network printer
    HardwareManager.setTransport(new NetworkTransport('192.168.99.99', 9100));

    // Send print buffer
    const result = await HardwareManager.printBuffer(new Uint8Array([0x1b, 0x40]));
    // Should return result with transport info rather than throwing unhandled exception
    expect(result.transportType).toContain('NETWORK');
  });
});
