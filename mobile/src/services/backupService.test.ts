import { describe, it, expect, beforeEach } from 'vitest';
import { BackupService } from './backupService';
import { useProductStore } from '../store/productStore';

describe('BackupService', () => {
  beforeEach(() => {
    BackupService.clearHistory();
    useProductStore.getState().resetToDefaults();
  });

  it('creates backup snapshot with record counts and checksum', () => {
    const snapshot = BackupService.createBackupSnapshot('001', 'T1');

    expect(snapshot.id).toMatch(/^BCK-\d{8}-\d{6}$/);
    expect(snapshot.branchCode).toBe('001');
    expect(snapshot.terminalNumber).toBe('T1');
    expect(snapshot.recordCounts.products).toBeGreaterThan(0);
    expect(snapshot.checksum).toMatch(/^CHK-[0-9A-F]+$/);
    expect(BackupService.getBackupHistory().length).toBe(1);
  });

  it('restores stores successfully from a valid backup snapshot', () => {
    // 1. Snapshot initial state (6 products)
    const initialSnapshot = BackupService.createBackupSnapshot('001', 'T1');
    const initialProductCount = initialSnapshot.recordCounts.products;

    // 2. Add a new product to modify state
    useProductStore.getState().addProduct({
      name: 'Temporary Test Product',
      sku: 'TEST-999',
      sellingPrice: 99.0,
      costPrice: 50.0,
    });
    expect(useProductStore.getState().products.length).toBe(initialProductCount + 1);

    // 3. Restore from snapshot
    const restoreResult = BackupService.restoreFromSnapshot(initialSnapshot);
    expect(restoreResult.success).toBe(true);
    expect(useProductStore.getState().products.length).toBe(initialProductCount);
  });

  it('rejects restoring from corrupted snapshot with altered checksum', () => {
    const snapshot = BackupService.createBackupSnapshot('001', 'T1');
    const corruptedSnapshot = {
      ...snapshot,
      checksum: 'CHK-BADBAD00',
    };

    const restoreResult = BackupService.restoreFromSnapshot(corruptedSnapshot);
    expect(restoreResult.success).toBe(false);
    expect(restoreResult.message).toContain('checksum mismatch');
  });
});
