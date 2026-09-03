import { useProductStore } from '../store/productStore';
import { useMemberStore } from '../store/memberStore';
import { useShiftStore } from '../store/shiftStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useReturnStore } from './returnService';

export interface BackupRecordCounts {
  products: number;
  categories: number;
  members: number;
  sales: number;
  shifts: number;
  returns: number;
  movements: number;
}

export interface BackupSnapshot {
  id: string;
  version: string;
  timestamp: string;
  terminalNumber: string;
  branchCode: string;
  recordCounts: BackupRecordCounts;
  data: {
    products: any[];
    categories: any[];
    members: any[];
    salesArchive: any[];
    completedShifts: any[];
    zReadings: any[];
    returns: any[];
    stocks: Record<string, any>;
    movements: any[];
  };
  checksum: string;
}

// In-memory backup snapshots archive
let localBackupHistory: BackupSnapshot[] = [];

/**
 * Computes a fast string hash for backup integrity verification.
 */
function computeChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `CHK-${Math.abs(hash).toString(16).toUpperCase()}`;
}

export class BackupService {
  /**
   * Captures an instant local backup snapshot of all stores and tables.
   */
  static createBackupSnapshot(branchCode = '001', terminalNumber = 'T1'): BackupSnapshot {
    const products = useProductStore.getState().products;
    const categories = useProductStore.getState().categories;
    const members = useMemberStore.getState().members;
    const salesArchive = useReturnStore.getState().salesArchive;
    const completedShifts = useShiftStore.getState().completedShifts;
    const zReadings = useShiftStore.getState().zReadings;
    const returns = useReturnStore.getState().returns;
    const stocks = useInventoryStore.getState().stocks;
    const movements = useInventoryStore.getState().movements;

    const recordCounts: BackupRecordCounts = {
      products: products.length,
      categories: categories.length,
      members: members.length,
      sales: salesArchive.length,
      shifts: completedShifts.length,
      returns: returns.length,
      movements: movements.length,
    };

    const dataPayload = {
      products,
      categories,
      members,
      salesArchive,
      completedShifts,
      zReadings,
      returns,
      stocks,
      movements,
    };

    const payloadString = JSON.stringify(dataPayload);
    const checksum = computeChecksum(payloadString);
    const now = new Date().toISOString();
    const id = `BCK-${now.slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

    const snapshot: BackupSnapshot = {
      id,
      version: '1.0.0',
      timestamp: now,
      terminalNumber,
      branchCode,
      recordCounts,
      data: dataPayload,
      checksum,
    };

    localBackupHistory = [snapshot, ...localBackupHistory];
    return snapshot;
  }

  /**
   * Returns list of stored local backups.
   */
  static getBackupHistory(): BackupSnapshot[] {
    return localBackupHistory;
  }

  /**
   * Restores system stores from a verified backup snapshot.
   */
  static restoreFromSnapshot(snapshot: BackupSnapshot): {
    success: boolean;
    message: string;
    restoredCounts?: BackupRecordCounts;
  } {
    try {
      // Validate checksum
      const currentChecksum = computeChecksum(JSON.stringify(snapshot.data));
      if (currentChecksum !== snapshot.checksum) {
        return { success: false, message: 'Backup checksum mismatch: File may be corrupted.' };
      }

      const { data } = snapshot;

      // 1. Restore Products & Categories
      if (Array.isArray(data.products)) {
        useProductStore.setState({
          products: data.products,
          categories: data.categories || [],
        });
      }

      // 2. Restore Members
      if (Array.isArray(data.members)) {
        useMemberStore.setState({
          members: data.members,
        });
      }

      // 3. Restore Shifts & Z-Readings
      if (Array.isArray(data.completedShifts)) {
        useShiftStore.setState({
          completedShifts: data.completedShifts,
          zReadings: data.zReadings || [],
        });
      }

      // 4. Restore Inventory & Movements
      if (data.stocks && typeof data.stocks === 'object') {
        useInventoryStore.setState({
          stocks: data.stocks,
          movements: data.movements || [],
        });
      }

      // 5. Restore Returns & Sales Archive
      if (Array.isArray(data.returns)) {
        useReturnStore.setState({
          returns: data.returns,
          salesArchive: data.salesArchive || [],
        });
      }

      return {
        success: true,
        message: `Database restored from snapshot ${snapshot.id} (${snapshot.timestamp.slice(0, 16).replace('T', ' ')}).`,
        restoredCounts: snapshot.recordCounts,
      };
    } catch (e: any) {
      return { success: false, message: `Restore error: ${e.message}` };
    }
  }

  static clearHistory(): void {
    localBackupHistory = [];
  }
}
