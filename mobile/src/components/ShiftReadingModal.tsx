import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useShiftStore, ShiftRecord, ZReadingRecord } from '../store/shiftStore';
import { useAuthStore } from '../store/authStore';
import { useHardwareStore } from '../store/hardwareStore';

export type ReadingType = 'X_READ' | 'Z_READ';

interface ShiftReadingModalProps {
  visible: boolean;
  type: ReadingType;
  onClose: () => void;
  onShiftClosed?: (closedShift: ShiftRecord) => void;
  onStoreClosed?: (zRecord: ZReadingRecord) => void;
}

export const ShiftReadingModal: React.FC<ShiftReadingModalProps> = ({
  visible,
  type,
  onClose,
  onShiftClosed,
  onStoreClosed,
}) => {
  const { currentBranch, currentTerminal, currentUser } = useAuthStore();
  const {
    currentShift,
    closeShiftWithXReading,
    generateZReading,
    getDailySummary,
    cumulativeGrandTotal,
    zCounter,
  } = useShiftStore();
  const { printXReading, printZReading, paperWidth } = useHardwareStore();

  const [declaredCash, setDeclaredCash] = useState('');
  const [managerName, setManagerName] = useState(currentUser?.fullName || 'Manager');

  if (!visible) return null;

  const isXRead = type === 'X_READ';
  const daily = getDailySummary();
  const shift = currentShift;

  const expectedShiftCash = shift
    ? Math.round((shift.openingCash + shift.cashCollected) * 100) / 100
    : 0;

  const declaredNum = parseFloat(declaredCash) || 0;
  const cashDifference = declaredCash !== '' ? declaredNum - expectedShiftCash : 0;

  const handlePrintXReading = async () => {
    if (!shift) return;
    await printXReading({
      branchName: currentBranch?.name || 'Downtown Flagship',
      branchAddress: currentBranch?.address || '123 Rizal Ave, Manila',
      taxId: currentBranch?.taxId || '100-001-000-000',
      terminalNumber: currentTerminal?.terminalNumber || 'T1',
      shiftNumber: shift.shiftNumber,
      cashierName: shift.cashierName,
      openedAt: shift.openedAt,
      closedAt: new Date().toISOString(),
      openingCash: shift.openingCash,
      grossSales: shift.grossSales,
      discountAmount: shift.discountAmount,
      netSales: shift.netSales,
      vatableSales: shift.vatableSales,
      vatExemptSales: shift.vatExemptSales,
      vatAmount: shift.vatAmount,
      cashCollected: shift.cashCollected,
      cardTotal: shift.cardTotal,
      gcashTotal: shift.gcashTotal,
      mayaTotal: shift.mayaTotal,
      pointsTotal: shift.pointsTotal,
      declaredCash: declaredCash !== '' ? declaredNum : undefined,
      cashDifference: declaredCash !== '' ? cashDifference : undefined,
      transactionCount: shift.transactionCount,
      voidCount: shift.voidCount,
    });
    Alert.alert('Printed', `X-Reading printed on ${paperWidth} thermal paper.`);
  };

  const handlePrintZReading = async () => {
    const todayGross = daily.grossSales;
    const newGrand = Math.round((cumulativeGrandTotal + todayGross) * 100) / 100;
    const now = new Date();

    await printZReading({
      branchName: currentBranch?.name || 'Downtown Flagship',
      branchAddress: currentBranch?.address || '123 Rizal Ave, Manila',
      taxId: currentBranch?.taxId || '100-001-000-000',
      terminalNumber: currentTerminal?.terminalNumber || 'T1',
      date: now.toISOString().slice(0, 10),
      openedAt: now.toISOString().slice(0, 10) + ' 08:00:00',
      closedAt: now.toISOString(),
      managerName: managerName || 'Branch Manager',
      zCounter,
      previousGrandTotal: cumulativeGrandTotal,
      todaysGrossSales: todayGross,
      newGrandTotal: newGrand,
      todaysDiscounts: daily.discounts,
      todaysNetSales: daily.netSales,
      vatableSales: daily.vatableSales,
      vatExemptSales: daily.vatExemptSales,
      vatAmount: daily.vatAmount,
      cashTotal: daily.cashTotal,
      cardTotal: daily.cardTotal,
      gcashTotal: daily.gcashTotal,
      mayaTotal: daily.mayaTotal,
      pointsTotal: daily.pointsTotal,
      totalTransactions: daily.transactionCount,
      totalVoids: daily.voidCount,
    });
    Alert.alert('Printed', `Official Z-Reading printed on ${paperWidth} thermal paper.`);
  };

  const handleConfirmClose = () => {
    if (isXRead) {
      if (!shift) {
        Alert.alert('Error', 'No active shift to close.');
        return;
      }
      const closed = closeShiftWithXReading(declaredCash !== '' ? declaredNum : undefined);
      Alert.alert(
        'Shift Closed (X-Reading)',
        `Shift #${closed.shiftNumber} for ${closed.cashierName} closed.\nPlease switch cashier and log in incoming cashier.`
      );
      if (onShiftClosed) onShiftClosed(closed);
      onClose();
    } else {
      const zRecord = generateZReading(managerName);
      Alert.alert(
        'Store Closed (Z-Reading)',
        `Store officially closed for the day.\nNew Cumulative Grand Total: P${zRecord.newGrandTotal.toFixed(2)}.`
      );
      if (onStoreClosed) onStoreClosed(zRecord);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={[styles.header, !isXRead && styles.headerZ]}>
            <View>
              <Text style={styles.title}>
                {isXRead ? '⇄ X-READING (SWITCH CASHIER)' : '🛑 Z-READING (CLOSE STORE)'}
              </Text>
              <Text style={styles.subtitle}>
                {isXRead
                  ? `Shift Handover • Cashier: ${shift?.cashierName || 'None'} • Shift #${shift?.shiftNumber || '101'}`
                  : `End of Day BIR Report • Terminal ${currentTerminal?.terminalNumber || 'T1'}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Summary Cards */}
            {isXRead && shift ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Shift Financial Summary</Text>
                <View style={styles.metricGrid}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Beginning Float</Text>
                    <Text style={styles.metricValue}>P{shift.openingCash.toFixed(2)}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Gross Sales</Text>
                    <Text style={styles.metricValue}>P{shift.grossSales.toFixed(2)}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Net Sales</Text>
                    <Text style={[styles.metricValue, { color: '#10B981' }]}>
                      P{shift.netSales.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Discounts</Text>
                    <Text style={[styles.metricValue, { color: '#F59E0B' }]}>
                      -P{shift.discountAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Tender Breakdown */}
                <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Collections by Tender</Text>
                <View style={styles.tenderList}>
                  <View style={styles.tenderRow}>
                    <Text style={styles.tenderLabel}>💵 Cash Collected</Text>
                    <Text style={styles.tenderVal}>P{shift.cashCollected.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tenderRow}>
                    <Text style={styles.tenderLabel}>💳 Card Payments</Text>
                    <Text style={styles.tenderVal}>P{shift.cardTotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tenderRow}>
                    <Text style={styles.tenderLabel}>📱 GCash / Maya</Text>
                    <Text style={styles.tenderVal}>
                      P{(shift.gcashTotal + shift.mayaTotal).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.tenderRow}>
                    <Text style={styles.tenderLabel}>🏷 Member Points Redeemed</Text>
                    <Text style={styles.tenderVal}>P{shift.pointsTotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tenderRow}>
                    <Text style={styles.tenderLabel}>🧾 Total Transactions</Text>
                    <Text style={styles.tenderVal}>{shift.transactionCount}</Text>
                  </View>
                </View>

                {/* Cash Balancing Input */}
                <View style={styles.balanceSection}>
                  <Text style={styles.balanceTitle}>Cash Drawer Reconciliation</Text>
                  <View style={styles.expectedRow}>
                    <Text style={styles.expectedLabel}>Expected Cash (Float + Sales):</Text>
                    <Text style={styles.expectedVal}>P{expectedShiftCash.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.inputLabel}>Enter Actual Declared Cash in Drawer:</Text>
                  <TextInput
                    style={styles.cashInput}
                    placeholder="e.g. 2100.00"
                    placeholderTextColor="#64748B"
                    value={declaredCash}
                    onChangeText={setDeclaredCash}
                    keyboardType="decimal-pad"
                  />
                  {declaredCash !== '' && (
                    <View
                      style={[
                        styles.diffBox,
                        cashDifference >= 0 ? styles.diffOver : styles.diffShort,
                      ]}
                    >
                      <Text style={styles.diffText}>
                        {cashDifference >= 0
                          ? `✓ CASH BALANCED / OVER: +P${cashDifference.toFixed(2)}`
                          : `⚠ CASH SHORTAGE: -P${Math.abs(cashDifference).toFixed(2)}`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              /* Z-Read End of Day Summary */
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Daily Cumulative Summary (All Shifts Today)</Text>
                <View style={styles.metricGrid}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Previous Grand Total</Text>
                    <Text style={styles.metricValue}>P{cumulativeGrandTotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Today's Gross Sales</Text>
                    <Text style={[styles.metricValue, { color: '#10B981' }]}>
                      P{daily.grossSales.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>New Grand Total</Text>
                    <Text style={[styles.metricValue, { color: '#38BDF8' }]}>
                      P{(cumulativeGrandTotal + daily.grossSales).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Customers Served</Text>
                    <Text style={styles.metricValue}>{daily.transactionCount}</Text>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Tax & Tender Totals</Text>
                <View style={styles.tenderList}>
                  <View style={styles.tenderRow}>
                    <Text style={styles.tenderLabel}>VATable Sales (12%)</Text>
                    <Text style={styles.tenderVal}>P{daily.vatableSales.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tenderRow}>
                    <Text style={styles.tenderLabel}>12% VAT Amount</Text>
                    <Text style={styles.tenderVal}>P{daily.vatAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tenderRow}>
                    <Text style={styles.tenderLabel}>💵 Cash Sales</Text>
                    <Text style={styles.tenderVal}>P{daily.cashTotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tenderRow}>
                    <Text style={styles.tenderLabel}>💳 Card Sales</Text>
                    <Text style={styles.tenderVal}>P{daily.cardTotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tenderRow}>
                    <Text style={styles.tenderLabel}>📱 GCash / Maya Sales</Text>
                    <Text style={styles.tenderVal}>
                      P{(daily.gcashTotal + daily.mayaTotal).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.tenderRow}>
                    <Text style={styles.tenderLabel}>🏷 Member Points Redeemed</Text>
                    <Text style={styles.tenderVal}>P{daily.pointsTotal.toFixed(2)}</Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Authorized Manager Name:</Text>
                <TextInput
                  style={styles.cashInput}
                  placeholder="Manager Name"
                  placeholderTextColor="#64748B"
                  value={managerName}
                  onChangeText={setManagerName}
                />
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.printBtn}
              onPress={isXRead ? handlePrintXReading : handlePrintZReading}
            >
              <Text style={styles.printBtnText}>
                🖨 Print {isXRead ? 'X-Reading' : 'Z-Reading'} Slip
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeActionBtn, !isXRead && styles.closeActionBtnZ]}
              onPress={handleConfirmClose}
            >
              <Text style={styles.closeActionText}>
                {isXRead ? '✓ Close Shift & Switch Cashier' : '🛑 Finalize & Close Store'}
              </Text>
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
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E3A8A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerZ: {
    backgroundColor: '#991B1B',
  },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  subtitle: { color: '#CBD5E1', fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  body: { padding: 16 },
  section: { marginBottom: 10 },
  sectionTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  metricGrid: { flexDirection: 'row', gap: 8 },
  metricBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricLabel: { color: '#94A3B8', fontSize: 11 },
  metricValue: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', marginTop: 4 },
  tenderList: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    gap: 6,
  },
  tenderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  tenderLabel: { color: '#CBD5E1', fontSize: 13 },
  tenderVal: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  balanceSection: {
    marginTop: 14,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284C7',
    padding: 12,
  },
  balanceTitle: { color: '#38BDF8', fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  expectedRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  expectedLabel: { color: '#94A3B8', fontSize: 12 },
  expectedVal: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  inputLabel: { color: '#CBD5E1', fontSize: 12, marginBottom: 4, marginTop: 6 },
  cashInput: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  diffBox: { padding: 8, borderRadius: 6, marginTop: 8, alignItems: 'center' },
  diffOver: { backgroundColor: '#065F46' },
  diffShort: { backgroundColor: '#991B1B' },
  diffText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  printBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 13 },
  closeActionBtn: {
    flex: 1.5,
    height: 48,
    backgroundColor: '#0284C7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionBtnZ: {
    backgroundColor: '#DC2626',
  },
  closeActionText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});
