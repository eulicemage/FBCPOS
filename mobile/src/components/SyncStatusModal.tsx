import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useSyncQueueStore, SyncQueueItem } from '../store/syncQueueStore';
import { SyncService } from '../services/syncService';
import { useAuthStore } from '../store/authStore';

interface SyncStatusModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SyncStatusModal: React.FC<SyncStatusModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    queue,
    isOnline,
    isSimulatedOffline,
    isSyncing,
    lastSyncTime,
    syncedCount,
    failedCount,
    setSimulatedOffline,
    clearSynced,
  } = useSyncQueueStore();

  const { currentBranch, currentTerminal } = useAuthStore();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'SYNCED' | 'FAILED'>('ALL');

  const pendingCount = queue.filter(
    (i) => i.status === 'PENDING' || i.status === 'FAILED'
  ).length;

  const filteredQueue = queue.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return item.status === 'PENDING';
    if (filter === 'SYNCED') return item.status === 'SYNCED';
    if (filter === 'FAILED') return item.status === 'FAILED';
    return true;
  });

  const handleManualSync = async () => {
    const res = await SyncService.triggerFullSync(
      currentBranch?.code || '001',
      currentTerminal?.name || 'T1'
    );

    if (res.success) {
      Alert.alert(
        'Sync Pass Completed',
        `Pushed ${res.syncedCount} records to cloud database. Catalog updated.`
      );
    } else {
      Alert.alert('Sync Incomplete', res.reason || 'Network unavailable or server unreachable.');
    }
  };

  const isActuallyOnline = isOnline && !isSimulatedOffline;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🔄 Multi-Branch Offline Sync & Outbox Engine</Text>
              <Text style={styles.subtitle}>
                Zero-cloud dependency, high-watermark delta pull & outbox queue telemetry
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Connection Status & Resilience Simulator */}
          <View style={styles.statusBanner}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  isActuallyOnline ? styles.dotOnline : styles.dotOffline,
                ]}
              />
              <Text style={styles.statusLabel}>
                {isActuallyOnline
                  ? 'CLOUD CONNECTED (ONLINE)'
                  : isSimulatedOffline
                  ? 'OFFLINE MODE (SIMULATED FOR TESTING)'
                  : 'OFFLINE (WORKING LOCALLY)'}
              </Text>
            </View>

            {/* Offline Mode Simulator Toggle */}
            <View style={styles.simRow}>
              <Text style={styles.simLabel}>🧪 Simulate Offline Mode:</Text>
              <Switch
                value={isSimulatedOffline}
                onValueChange={(val) => {
                  setSimulatedOffline(val);
                  useAuthStore.getState().setOnlineStatus(!val);
                }}
                trackColor={{ false: '#334155', true: '#DC2626' }}
                thumbColor={isSimulatedOffline ? '#FCA5A5' : '#94A3B8'}
              />
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: '#F59E0B' }]}>{pendingCount}</Text>
              <Text style={styles.metricLabel}>Pending in Outbox</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: '#10B981' }]}>{syncedCount}</Text>
              <Text style={styles.metricLabel}>Total Synced</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: '#EF4444' }]}>{failedCount}</Text>
              <Text style={styles.metricLabel}>Retry / Failed</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: '#38BDF8', fontSize: 13 }]}>
                {lastSyncTime ? lastSyncTime.slice(11, 19) : 'Never'}
              </Text>
              <Text style={styles.metricLabel}>Last Sync Pass</Text>
            </View>
          </View>

          {/* Actions Bar */}
          <View style={styles.actionsBar}>
            <TouchableOpacity
              style={[styles.syncNowBtn, isSyncing && styles.btnDisabled]}
              disabled={isSyncing}
              onPress={handleManualSync}
            >
              <Text style={styles.syncNowText}>
                {isSyncing ? '⏳ Syncing Outbox...' : '⚡ Sync Now (Push & Pull)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearBtn} onPress={clearSynced}>
              <Text style={styles.clearText}>🧹 Clean Synced</Text>
            </TouchableOpacity>
          </View>

          {/* Queue Filter Tabs */}
          <View style={styles.filterRow}>
            {(['ALL', 'PENDING', 'SYNCED', 'FAILED'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    filter === f && styles.filterBtnTextActive,
                  ]}
                >
                  {f} (
                  {f === 'ALL'
                    ? queue.length
                    : f === 'PENDING'
                    ? queue.filter((i) => i.status === 'PENDING').length
                    : f === 'SYNCED'
                    ? queue.filter((i) => i.status === 'SYNCED').length
                    : queue.filter((i) => i.status === 'FAILED').length}
                  )
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Outbox Items List */}
          <ScrollView style={styles.queueList}>
            {filteredQueue.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No records matching filter.</Text>
                <Text style={styles.emptySub}>
                  Completed sales, returns, shifts, and stock movements queue here automatically.
                </Text>
              </View>
            ) : (
              filteredQueue.map((item) => (
                <View key={item.id} style={styles.queueCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHeaderRow}>
                      <View
                        style={[
                          styles.typeBadge,
                          item.entityType === 'SALE' && styles.typeSale,
                          item.entityType === 'RETURN' && styles.typeReturn,
                          item.entityType === 'SHIFT' && styles.typeShift,
                          item.entityType === 'STOCK_MOVEMENT' && styles.typeStock,
                        ]}
                      >
                        <Text style={styles.typeBadgeText}>{item.entityType}</Text>
                      </View>
                      <Text style={styles.opText}>[{item.operation}]</Text>
                      <Text style={styles.entityId} numberOfLines={1}>
                        ID: {item.entityId.slice(0, 16)}...
                      </Text>
                    </View>

                    <Text style={styles.cardTime}>
                      Queued: {item.createdAt.slice(11, 19)}
                      {item.lastAttemptAt
                        ? ` • Last Try: ${item.lastAttemptAt.slice(11, 19)}`
                        : ''}
                    </Text>

                    {item.errorMessage && (
                      <Text style={styles.cardError} numberOfLines={2}>
                        ⚠ {item.errorMessage} (Retries: {item.retryCount})
                      </Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      item.status === 'PENDING' && styles.statusPending,
                      item.status === 'SYNCING' && styles.statusSyncing,
                      item.status === 'SYNCED' && styles.statusSynced,
                      item.status === 'FAILED' && styles.statusFailed,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{item.status}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              Branch {currentBranch?.code || '001'} • Terminal {currentTerminal?.name || 'T1'} • Auto-Sync: 15s
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
    padding: 14,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    width: '85%',
    maxHeight: '92%',
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
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotOnline: { backgroundColor: '#10B981' },
  dotOffline: { backgroundColor: '#EF4444' },
  statusLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  simRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  simLabel: { color: '#94A3B8', fontSize: 11 },
  metricsGrid: { flexDirection: 'row', gap: 6, padding: 12, backgroundColor: '#1E293B' },
  metricBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricVal: { fontSize: 18, fontWeight: 'bold' },
  metricLabel: { color: '#94A3B8', fontSize: 10, marginTop: 2 },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  syncNowBtn: {
    flex: 2,
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  syncNowText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  clearBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#111827',
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  filterBtnActive: { backgroundColor: '#0284C7' },
  filterBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  filterBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  queueList: { flex: 1, padding: 12 },
  emptyState: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#64748B', fontSize: 14, fontWeight: 'bold' },
  emptySub: { color: '#475569', fontSize: 11, marginTop: 4, textAlign: 'center' },
  queueCard: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    marginBottom: 6,
    alignItems: 'center',
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeSale: { backgroundColor: '#065F46' },
  typeReturn: { backgroundColor: '#7C2D12' },
  typeShift: { backgroundColor: '#1E3A8A' },
  typeStock: { backgroundColor: '#4C1D95' },
  typeBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  opText: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  entityId: { color: '#CBD5E1', fontSize: 11, flex: 1 },
  cardTime: { color: '#64748B', fontSize: 10, marginTop: 3 },
  cardError: { color: '#FCA5A5', fontSize: 10, marginTop: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  statusPending: { backgroundColor: '#78350F' },
  statusSyncing: { backgroundColor: '#0284C7' },
  statusSynced: { backgroundColor: '#065F46' },
  statusFailed: { backgroundColor: '#7F1D1D' },
  statusBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerNote: { color: '#64748B', fontSize: 11 },
  closeFooterBtn: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  closeFooterBtnText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
});

