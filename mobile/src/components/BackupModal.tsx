import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import {
  BackupService,
  BackupSnapshot,
} from '../services/backupService';
import { useProductStore } from '../store/productStore';
import { useMemberStore } from '../store/memberStore';
import { useShiftStore } from '../store/shiftStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useReturnStore } from '../services/returnService';

interface BackupModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ visible, onClose }) => {
  const [history, setHistory] = useState<BackupSnapshot[]>(
    BackupService.getBackupHistory()
  );

  const productCount = useProductStore((s) => s.products.length);
  const memberCount = useMemberStore((s) => s.members.length);
  const shiftCount = useShiftStore((s) => s.completedShifts.length);
  const salesCount = useReturnStore((s) => s.salesArchive.length);
  const returnCount = useReturnStore((s) => s.returns.length);
  const movementCount = useInventoryStore((s) => s.movements.length);

  const handleCreateBackup = () => {
    const snapshot = BackupService.createBackupSnapshot('001', 'T1');
    setHistory([...BackupService.getBackupHistory()]);
    Alert.alert(
      'Backup Created Successfully',
      `Snapshot ID: ${snapshot.id}\nChecksum: ${snapshot.checksum}\nRecords: ${snapshot.recordCounts.products} prods, ${snapshot.recordCounts.members} members, ${snapshot.recordCounts.sales} sales.`
    );
  };

  const handleRestore = (snapshot: BackupSnapshot) => {
    Alert.alert(
      'Restore Database Snapshot',
      `Are you sure you want to restore the local database from backup ${snapshot.id}?\n\nTimestamp: ${snapshot.timestamp.slice(0, 16).replace('T', ' ')}\n\nCurrent local data will be replaced by the snapshot.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Now',
          style: 'destructive',
          onPress: () => {
            const res = BackupService.restoreFromSnapshot(snapshot);
            if (res.success) {
              Alert.alert('Database Restored', res.message);
              onClose();
            } else {
              Alert.alert('Restore Error', res.message);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>💾 Local SQLite Backup & Disaster Recovery</Text>
              <Text style={styles.subtitle}>
                Offline database snapshots, checksum verification & 1-click restore
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Active Local Database Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Current Live Database Records:</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{productCount}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{memberCount}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{salesCount}</Text>
                <Text style={styles.statLabel}>Sales</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{shiftCount}</Text>
                <Text style={styles.statLabel}>Shifts</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{returnCount}</Text>
                <Text style={styles.statLabel}>Returns</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{movementCount}</Text>
                <Text style={styles.statLabel}>Movements</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.backupBtn} onPress={handleCreateBackup}>
              <Text style={styles.backupBtnText}>💾 Create Instant Local Backup Snapshot</Text>
            </TouchableOpacity>
          </View>

          {/* Backup History Archive */}
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Saved Backup Snapshots:</Text>
            <ScrollView style={{ flex: 1 }}>
              {history.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No previous backups saved.</Text>
                  <Text style={styles.emptySub}>
                    Tap the button above to capture your first disaster recovery snapshot.
                  </Text>
                </View>
              ) : (
                history.map((item) => (
                  <View key={item.id} style={styles.snapshotCard}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.snapRow}>
                        <Text style={styles.snapId}>{item.id}</Text>
                        <View style={styles.chkBadge}>
                          <Text style={styles.chkText}>{item.checksum}</Text>
                        </View>
                      </View>
                      <Text style={styles.snapTime}>
                        {item.timestamp.slice(0, 16).replace('T', ' ')} • Branch {item.branchCode} • Terminal {item.terminalNumber}
                      </Text>
                      <Text style={styles.snapCounts}>
                        {item.recordCounts.products} products, {item.recordCounts.members} members, {item.recordCounts.sales} sales, {item.recordCounts.movements} stock movements
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.restoreBtn}
                      onPress={() => handleRestore(item)}
                    >
                      <Text style={styles.restoreBtnText}>🔄 Restore</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerTip}>
              Tip: End-of-day Z-Readings automatically capture backup snapshots.
            </Text>
            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose}>
              <Text style={styles.closeFooterBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    width: '80%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold' },
  statsContainer: {
    padding: 14,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  statsTitle: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  statsGrid: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statVal: { color: '#38BDF8', fontSize: 15, fontWeight: 'bold' },
  statLabel: { color: '#94A3B8', fontSize: 9, marginTop: 2 },
  backupBtn: {
    backgroundColor: '#065F46',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  backupBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  historyContainer: { flex: 1, padding: 14 },
  historyTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: 'bold', marginBottom: 10 },
  emptyState: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#64748B', fontSize: 14, fontWeight: 'bold' },
  emptySub: { color: '#475569', fontSize: 11, marginTop: 4, textAlign: 'center' },
  snapshotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    marginBottom: 8,
  },
  snapRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  snapId: { color: '#38BDF8', fontSize: 13, fontWeight: 'bold' },
  chkBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  chkText: { color: '#10B981', fontSize: 10, fontWeight: 'bold' },
  snapTime: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  snapCounts: { color: '#64748B', fontSize: 10, marginTop: 3 },
  restoreBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  restoreBtnText: { color: '#93C5FD', fontWeight: 'bold', fontSize: 11 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerTip: { color: '#64748B', fontSize: 11, flex: 1 },
  closeFooterBtn: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  closeFooterBtnText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
});

