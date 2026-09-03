import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useShiftStore, ShiftRecord, ZReadingRecord } from '../store/shiftStore';
import { useHardwareStore } from '../store/hardwareStore';
import { useAuthStore } from '../store/authStore';

interface ShiftHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ShiftHistoryModal: React.FC<ShiftHistoryModalProps> = ({
  visible,
  onClose,
}) => {
  const { completedShifts, zReadings } = useShiftStore();
  const { currentBranch, currentTerminal } = useAuthStore();
  const { printXReading, printZReading, paperWidth } = useHardwareStore();
  const [tab, setTab] = useState<'X_READ' | 'Z_READ'>('X_READ');

  const handleReprintX = async (item: ShiftRecord) => {
    await printXReading({
      branchName: currentBranch?.name || 'Downtown Flagship',
      branchAddress: currentBranch?.address || '123 Rizal Ave, Manila',
      taxId: currentBranch?.taxId || '100-001-000-000',
      terminalNumber: item.terminalNumber,
      shiftNumber: item.shiftNumber,
      cashierName: item.cashierName,
      openedAt: item.openedAt,
      closedAt: item.closedAt || new Date().toISOString(),
      openingCash: item.openingCash,
      grossSales: item.grossSales,
      discountAmount: item.discountAmount,
      netSales: item.netSales,
      vatableSales: item.vatableSales,
      vatExemptSales: item.vatExemptSales,
      vatAmount: item.vatAmount,
      cashCollected: item.cashCollected,
      cardTotal: item.cardTotal,
      gcashTotal: item.gcashTotal,
      mayaTotal: item.mayaTotal,
      pointsTotal: item.pointsTotal,
      declaredCash: item.declaredCash,
      cashDifference: item.cashDifference,
      transactionCount: item.transactionCount,
      voidCount: item.voidCount,
    });
    Alert.alert('Printed', `Shift #${item.shiftNumber} reprinted on ${paperWidth} thermal paper.`);
  };

  const handleReprintZ = async (item: ZReadingRecord) => {
    await printZReading({
      branchName: currentBranch?.name || 'Downtown Flagship',
      branchAddress: currentBranch?.address || '123 Rizal Ave, Manila',
      taxId: currentBranch?.taxId || '100-001-000-000',
      terminalNumber: item.terminalNumber,
      date: item.date,
      openedAt: item.openedAt,
      closedAt: item.closedAt,
      managerName: item.managerName,
      zCounter: item.zCounter,
      previousGrandTotal: item.previousGrandTotal,
      todaysGrossSales: item.todaysGrossSales,
      newGrandTotal: item.newGrandTotal,
      todaysDiscounts: item.todaysDiscounts,
      todaysNetSales: item.todaysNetSales,
      vatableSales: item.vatableSales,
      vatExemptSales: item.vatExemptSales,
      vatAmount: item.vatAmount,
      cashTotal: item.cashTotal,
      cardTotal: item.cardTotal,
      gcashTotal: item.gcashTotal,
      mayaTotal: item.mayaTotal,
      pointsTotal: item.pointsTotal,
      totalTransactions: item.totalTransactions,
      totalVoids: item.totalVoids,
    });
    Alert.alert('Printed', `Z-Reading #${item.zCounter} reprinted on ${paperWidth} thermal paper.`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>📜 Shift & Closing Reading Archive</Text>
              <Text style={styles.subtitle}>Historical records for auditing and tax compliance</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'X_READ' && styles.tabBtnActive]}
              onPress={() => setTab('X_READ')}
            >
              <Text style={[styles.tabText, tab === 'X_READ' && styles.tabTextActive]}>
                ⇄ Cashier Shifts / X-Readings ({completedShifts.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'Z_READ' && styles.tabBtnActiveZ]}
              onPress={() => setTab('Z_READ')}
            >
              <Text style={[styles.tabText, tab === 'Z_READ' && styles.tabTextActive]}>
                🛑 Store Closings / Z-Readings ({zReadings.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* List Content */}
          <View style={{ flex: 1, padding: 14 }}>
            {tab === 'X_READ' ? (
              completedShifts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No completed cashier shifts yet.</Text>
                  <Text style={styles.emptySub}>
                    When a cashier shift ends, tap "X-Read / Switch Cashier" to close and archive the shift.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={completedShifts}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.card}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.cardTitle}>Shift #{item.shiftNumber}</Text>
                          <Text style={styles.cashierBadge}>{item.cashierName}</Text>
                        </View>
                        <Text style={styles.cardTime}>
                          {item.openedAt.slice(0, 16).replace('T', ' ')} → {item.closedAt?.slice(0, 16).replace('T', ' ')}
                        </Text>
                        <View style={styles.metricRow}>
                          <Text style={styles.metricText}>Net Sales: P{item.netSales.toFixed(2)}</Text>
                          <Text style={styles.metricText}>Cash: P{item.cashCollected.toFixed(2)}</Text>
                          <Text style={styles.metricText}>Txns: {item.transactionCount}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.reprintBtn}
                        onPress={() => handleReprintX(item)}
                      >
                        <Text style={styles.reprintBtnText}>🖨 Reprint</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )
            ) : zReadings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No Z-Readings recorded yet.</Text>
                <Text style={styles.emptySub}>
                  At the end of business hours, tap "Z-Read / Close Store" to finalize daily sales and archive.
                </Text>
              </View>
            ) : (
              <FlatList
                data={zReadings}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.card, styles.cardZ]}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Z-Reading #{item.zCounter}</Text>
                        <Text style={styles.dateBadge}>{item.date}</Text>
                      </View>
                      <Text style={styles.cardTime}>
                        Manager: {item.managerName} • Terminal: {item.terminalNumber}
                      </Text>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricText}>Today: P{item.todaysGrossSales.toFixed(2)}</Text>
                        <Text style={[styles.metricText, { color: '#38BDF8' }]}>
                          Grand: P{item.newGrandTotal.toFixed(2)}
                        </Text>
                        <Text style={styles.metricText}>Txns: {item.totalTransactions}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.reprintBtn}
                      onPress={() => handleReprintZ(item)}
                    >
                      <Text style={styles.reprintBtnText}>🖨 Reprint</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose}>
              <Text style={styles.closeFooterBtnText}>Close Archive</Text>
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
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    width: '75%',
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: { color: '#F8FAFC', fontSize: 17, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    padding: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  tabBtnActiveZ: { backgroundColor: '#DC2626', borderColor: '#EF4444' },
  tabText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  cardZ: { borderColor: '#7F1D1D' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  cashierBadge: {
    backgroundColor: '#1E293B',
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateBadge: {
    backgroundColor: '#7F1D1D',
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardTime: { color: '#64748B', fontSize: 11, marginTop: 4 },
  metricRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
  metricText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  reprintBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  reprintBtnText: { color: '#38BDF8', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { paddingVertical: 40, alignItems: 'center', paddingHorizontal: 20 },
  emptyText: { color: '#94A3B8', fontSize: 15, fontWeight: 'bold' },
  emptySub: { color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 6 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  closeFooterBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeFooterBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
