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
import {
  useReturnStore,
  processReturnTransaction,
  ReturnItemInput,
  ReturnReason,
  ItemDisposition,
  RefundTender,
} from '../services/returnService';
import { SaleRecord } from '../services/checkoutService';
import { useHardwareStore } from '../store/hardwareStore';
import { PrinterService } from '../services/printerService';
import { useAuthStore } from '../store/authStore';

interface ReturnModalProps {
  visible: boolean;
  onClose: () => void;
}

const REASONS: { key: ReturnReason; label: string }[] = [
  { key: 'DEFECTIVE_EXPIRED', label: 'Defective / Expired' },
  { key: 'WRONG_ITEM', label: 'Wrong Item Purchased' },
  { key: 'CUSTOMER_CHANGE_OF_MIND', label: 'Change of Mind' },
  { key: 'OTHER', label: 'Other Reason' },
];

export const ReturnModal: React.FC<ReturnModalProps> = ({ visible, onClose }) => {
  const { salesArchive, findSaleByInvoice } = useReturnStore();
  const { isBypassMode, currentUser } = useAuthStore();
  const { paperWidth, printRaw, kickCashDrawer } = useHardwareStore();

  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  // Return item selection state
  // key = productId, value = { quantity, reason, disposition }
  const [selectedItems, setSelectedItems] = useState<
    Record<
      string,
      {
        quantity: number;
        reason: ReturnReason;
        disposition: ItemDisposition;
      }
    >
  >({});

  const [refundTender, setRefundTender] = useState<RefundTender>('CASH');

  const handleSearchInvoice = (query: string) => {
    setInvoiceQuery(query);
    const sale = findSaleByInvoice(query);
    if (sale) {
      setSelectedSale(sale);
      setSelectedItems({});
      // Default refund tender
      setRefundTender(sale.memberBarcode ? 'POINTS' : 'CASH');
    }
  };

  const handleSelectSale = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setInvoiceQuery(sale.invoiceNumber);
    setSelectedItems({});
    setRefundTender(sale.memberBarcode ? 'POINTS' : 'CASH');
  };

  const toggleItemSelection = (productId: string, maxQty: number) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = {
          quantity: 1,
          reason: 'DEFECTIVE_EXPIRED',
          disposition: 'SCRAP_WASTE',
        };
      }
      return next;
    });
  };

  const updateItemQty = (productId: string, qty: number, maxQty: number) => {
    if (qty <= 0) {
      toggleItemSelection(productId, maxQty);
      return;
    }
    if (qty > maxQty) return;

    setSelectedItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: qty,
      },
    }));
  };

  const updateItemReason = (productId: string, reason: ReturnReason) => {
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        reason,
        // Auto-suggest scrap for defective/expired
        disposition: reason === 'DEFECTIVE_EXPIRED' ? 'SCRAP_WASTE' : 'RESTOCK',
      },
    }));
  };

  const updateItemDisposition = (productId: string, disposition: ItemDisposition) => {
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        disposition,
      },
    }));
  };

  // Calculate total refund amount
  const totalRefund = Object.entries(selectedItems).reduce((sum, [pId, item]) => {
    const origItem = selectedSale?.items.find((i) => i.productId === pId);
    if (!origItem) return sum;
    return sum + origItem.unitPrice * item.quantity;
  }, 0);

  const handleConfirmReturn = async () => {
    if (!selectedSale) return;

    const returnItems: ReturnItemInput[] = Object.entries(selectedItems).map(
      ([pId, item]) => {
        const orig = selectedSale.items.find((i) => i.productId === pId)!;
        return {
          productId: pId,
          productName: orig.productName,
          quantity: item.quantity,
          unitPrice: orig.unitPrice,
          refundAmount: orig.unitPrice * item.quantity,
          reason: item.reason,
          disposition: item.disposition,
        };
      }
    );

    if (returnItems.length === 0) {
      Alert.alert('No Items Selected', 'Please check at least one item to return.');
      return;
    }

    const cashierName = currentUser?.fullName || 'Cashier';
    const result = processReturnTransaction(
      selectedSale,
      returnItems,
      refundTender,
      cashierName,
      '001',
      '1'
    );

    if (result.success && result.returnRecord) {
      // 1. Format and print official Return Slip
      const slipBytes = PrinterService.formatReturnSlip(
        {
          branchName: 'Downtown Flagship Branch 001',
          branchAddress: '123 Rizal Ave, Manila',
          taxId: '100-001-000-000',
          terminalNumber: 'T1',
          returnNumber: result.returnRecord.returnNumber,
          originalInvoiceNumber: selectedSale.invoiceNumber,
          cashierName,
          customerName: selectedSale.customerName,
          memberBarcode: selectedSale.memberBarcode,
          date: new Date().toISOString().replace('T', ' ').slice(0, 19),
          items: returnItems.map((i) => ({
            name: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            refundAmount: i.refundAmount,
            reason: i.reason,
            disposition: i.disposition === 'RESTOCK' ? 'Restocked' : 'Scrapped',
          })),
          totalRefundAmount: result.returnRecord.totalRefundAmount,
          refundTender:
            refundTender === 'POINTS' ? 'MEMBER POINTS RE-CREDITED' : 'CASH REFUND',
        },
        { paperWidth }
      );

      await printRaw(slipBytes);

      // 2. If cash refund, kick drawer
      if (refundTender === 'CASH') {
        await kickCashDrawer();
      }

      Alert.alert(
        'Return Processed',
        `Credit Note ${result.returnRecord.returnNumber} generated.\nRefund: ₱${totalRefund.toFixed(2)} (${refundTender}).\nReturn slip printed on Xprinter.`
      );

      setSelectedSale(null);
      setSelectedItems({});
      setInvoiceQuery('');
      onClose();
    } else {
      Alert.alert('Return Failed', result.errors?.join('\n') || 'Unknown error');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>↩ Customer Return & Refund Engine</Text>
              <Text style={styles.subtitle}>
                Credit notes, restock vs damage write-off, and points re-credit
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Scan or enter Original Invoice Number (e.g. BR-001-T1-20260903-0001)..."
              placeholderTextColor="#64748B"
              value={invoiceQuery}
              onChangeText={handleSearchInvoice}
            />
          </View>

          {/* Recent Sales Picker (if no sale selected) */}
          {!selectedSale && (
            <View style={styles.recentSection}>
              <Text style={styles.recentTitle}>Or Select From Recent Sales:</Text>
              <ScrollView style={{ maxHeight: 220 }}>
                {salesArchive.length === 0 ? (
                  <Text style={styles.emptyText}>No sales recorded yet.</Text>
                ) : (
                  salesArchive.slice(0, 10).map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.saleRow}
                      onPress={() => handleSelectSale(s)}
                    >
                      <View>
                        <Text style={styles.saleInvoice}>{s.invoiceNumber}</Text>
                        <Text style={styles.saleSub}>
                          {s.items.length} items • ₱{s.totalAmount.toFixed(2)} • {s.createdAt.slice(0, 16).replace('T', ' ')}
                        </Text>
                      </View>
                      <Text style={styles.selectSaleArrow}>Select →</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* Selected Sale & Return Items */}
          {selectedSale && (
            <ScrollView style={styles.saleDetailSection}>
              {/* Sale Info Card */}
              <View style={styles.saleInfoBox}>
                <View style={styles.saleInfoRow}>
                  <Text style={styles.saleInfoInv}>Invoice: {selectedSale.invoiceNumber}</Text>
                  <TouchableOpacity onPress={() => setSelectedSale(null)}>
                    <Text style={styles.changeSaleBtn}>Change Sale</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.saleInfoText}>
                  Cashier: {selectedSale.cashierName} • Total: ₱{selectedSale.totalAmount.toFixed(2)}
                </Text>
                {selectedSale.customerName && (
                  <Text style={styles.saleInfoMember}>
                    👤 Customer / Member: {selectedSale.customerName}
                    {selectedSale.memberBarcode ? ` (ID: ${selectedSale.memberBarcode})` : ''}
                  </Text>
                )}
              </View>

              <Text style={styles.itemsSectionTitle}>Select Items to Return:</Text>

              {/* Items List */}
              {selectedSale.items.map((item) => {
                const isSelected = !!selectedItems[item.productId];
                const itemState = selectedItems[item.productId];

                return (
                  <View
                    key={item.productId}
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                  >
                    <TouchableOpacity
                      style={styles.itemCardTop}
                      onPress={() => toggleItemSelection(item.productId, item.quantity)}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.itemCardName}>{item.productName}</Text>
                        <Text style={styles.itemCardSub}>
                          Purchased: {item.quantity} × ₱{item.unitPrice.toFixed(2)} = ₱{item.totalAmount.toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Quantity & Reason controls if selected */}
                    {isSelected && itemState && (
                      <View style={styles.itemControls}>
                        {/* Stepper */}
                        <View style={styles.controlRow}>
                          <Text style={styles.controlLabel}>Return Qty:</Text>
                          <View style={styles.stepper}>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() =>
                                updateItemQty(item.productId, itemState.quantity - 1, item.quantity)
                              }
                            >
                              <Text style={styles.stepBtnText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.stepVal}>{itemState.quantity}</Text>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() =>
                                updateItemQty(item.productId, itemState.quantity + 1, item.quantity)
                              }
                            >
                              <Text style={styles.stepBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.refundLineAmount}>
                            Refund: ₱{(item.unitPrice * itemState.quantity).toFixed(2)}
                          </Text>
                        </View>

                        {/* Reason Selection */}
                        <View style={styles.controlRow}>
                          <Text style={styles.controlLabel}>Reason:</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                            {REASONS.map((r) => (
                              <TouchableOpacity
                                key={r.key}
                                style={[
                                  styles.reasonChip,
                                  itemState.reason === r.key && styles.reasonChipActive,
                                ]}
                                onPress={() => updateItemReason(item.productId, r.key)}
                              >
                                <Text
                                  style={[
                                    styles.reasonChipText,
                                    itemState.reason === r.key && styles.reasonChipTextActive,
                                  ]}
                                >
                                  {r.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        {/* Disposition Selection */}
                        <View style={styles.controlRow}>
                          <Text style={styles.controlLabel}>Disposition:</Text>
                          <View style={styles.dispRow}>
                            <TouchableOpacity
                              style={[
                                styles.dispBtn,
                                itemState.disposition === 'RESTOCK' && styles.dispBtnRestock,
                              ]}
                              onPress={() => updateItemDisposition(item.productId, 'RESTOCK')}
                            >
                              <Text
                                style={[
                                  styles.dispBtnText,
                                  itemState.disposition === 'RESTOCK' && styles.dispBtnTextActive,
                                ]}
                              >
                                📦 Restock to Shelf (+{itemState.quantity})
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.dispBtn,
                                itemState.disposition === 'SCRAP_WASTE' && styles.dispBtnScrap,
                              ]}
                              onPress={() => updateItemDisposition(item.productId, 'SCRAP_WASTE')}
                            >
                              <Text
                                style={[
                                  styles.dispBtnText,
                                  itemState.disposition === 'SCRAP_WASTE' && styles.dispBtnTextActive,
                                ]}
                              >
                                🗑 Scrap / Write-Off
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Refund Method Tender */}
              <View style={styles.tenderSection}>
                <Text style={styles.tenderTitle}>Select Refund Method:</Text>
                <View style={styles.tenderRow}>
                  <TouchableOpacity
                    style={[styles.tenderBtn, refundTender === 'CASH' && styles.tenderBtnActive]}
                    onPress={() => setRefundTender('CASH')}
                  >
                    <Text
                      style={[
                        styles.tenderBtnText,
                        refundTender === 'CASH' && styles.tenderBtnTextActive,
                      ]}
                    >
                      💵 Cash Refund (Drawer Kick)
                    </Text>
                  </TouchableOpacity>

                  {selectedSale.memberBarcode && (
                    <TouchableOpacity
                      style={[
                        styles.tenderBtn,
                        refundTender === 'POINTS' && styles.tenderBtnPoints,
                      ]}
                      onPress={() => setRefundTender('POINTS')}
                    >
                      <Text
                        style={[
                          styles.tenderBtnText,
                          refundTender === 'POINTS' && styles.tenderBtnTextActive,
                        ]}
                      >
                        🏷 Re-Credit Points to Member Card
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          )}

          {/* Footer Summary & Action */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>TOTAL REFUND DUE:</Text>
              <Text style={styles.footerAmount}>₱{totalRefund.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, totalRefund === 0 && styles.confirmBtnDisabled]}
              disabled={totalRefund === 0}
              onPress={handleConfirmReturn}
            >
              <Text style={styles.confirmBtnText}>
                CONFIRM RETURN & PRINT SLIP (₱{totalRefund.toFixed(2)})
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
  searchContainer: {
    padding: 10,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  searchInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingHorizontal: 12,
    height: 42,
    color: '#FFFFFF',
    fontSize: 13,
  },
  recentSection: { padding: 12 },
  recentTitle: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: '#64748B', fontStyle: 'italic', paddingVertical: 10 },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saleInvoice: { color: '#38BDF8', fontSize: 13, fontWeight: 'bold' },
  saleSub: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  selectSaleArrow: { color: '#10B981', fontWeight: 'bold', fontSize: 12 },
  saleDetailSection: { flex: 1, padding: 12 },
  saleInfoBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    marginBottom: 10,
  },
  saleInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saleInfoInv: { color: '#38BDF8', fontSize: 14, fontWeight: 'bold' },
  changeSaleBtn: { color: '#EF4444', fontSize: 11, fontWeight: '600' },
  saleInfoText: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  saleInfoMember: { color: '#A78BFA', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  itemsSectionTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  itemCard: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    marginBottom: 8,
  },
  itemCardSelected: { borderColor: '#10B981', backgroundColor: '#0B192C' },
  itemCardTop: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  checkmark: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  itemCardName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  itemCardSub: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  itemControls: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 8,
  },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  controlLabel: { color: '#94A3B8', fontSize: 11, width: 75 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 6 },
  stepBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  stepBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 15 },
  stepVal: { color: '#FFFFFF', fontWeight: 'bold', paddingHorizontal: 8, minWidth: 24, textAlign: 'center' },
  refundLineAmount: { color: '#10B981', fontWeight: 'bold', fontSize: 13, marginLeft: 'auto' },
  chipRow: { flex: 1 },
  reasonChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reasonChipActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  reasonChipText: { color: '#94A3B8', fontSize: 10 },
  reasonChipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  dispRow: { flexDirection: 'row', gap: 6, flex: 1 },
  dispBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dispBtnRestock: { backgroundColor: '#065F46', borderColor: '#10B981' },
  dispBtnScrap: { backgroundColor: '#7F1D1D', borderColor: '#EF4444' },
  dispBtnText: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  dispBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  tenderSection: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  tenderTitle: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  tenderRow: { flexDirection: 'row', gap: 8 },
  tenderBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  tenderBtnActive: { backgroundColor: '#065F46', borderColor: '#10B981' },
  tenderBtnPoints: { backgroundColor: '#4C1D95', borderColor: '#8B5CF6' },
  tenderBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  tenderBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerLabel: { color: '#94A3B8', fontSize: 11 },
  footerAmount: { color: '#10B981', fontSize: 20, fontWeight: 'bold' },
  confirmBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmBtnDisabled: { backgroundColor: '#334155', opacity: 0.5 },
  confirmBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});

