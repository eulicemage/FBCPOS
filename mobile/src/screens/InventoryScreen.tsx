import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useProductStore } from '../store/productStore';
import { useInventoryStore, StockMovementType } from '../store/inventoryStore';

export const InventoryScreen: React.FC = () => {
  const { currentBranch, currentUser } = useAuthStore();
  const { products, categories } = useProductStore();
  const { getStockQuantity, recordMovement, movements } = useInventoryStore();

  const [activeTab, setActiveTab] = useState<'STOCKS' | 'LEDGER'>('STOCKS');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [adjType, setAdjType] = useState<StockMovementType>('STOCK_IN');
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjReason, setAdjReason] = useState('');

  // Combine products with reactive inventory quantities
  const inventoryItems = products.map((p) => {
    const categoryName =
      categories.find((c) => c.id === p.categoryId)?.name || 'General';
    const currentQty = getStockQuantity(p.id);
    const reorderLevel = 10;
    return {
      id: p.id,
      productId: p.id,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      category: categoryName,
      stockQuantity: currentQty,
      reorderLevel,
      unitOfMeasure: p.unitOfMeasure,
    };
  });

  const filteredItems = inventoryItems.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMovements = movements.filter(
    (m) =>
      m.productName.toLowerCase().includes(search.toLowerCase()) ||
      m.reason?.toLowerCase().includes(search.toLowerCase()) ||
      m.referenceId?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdjust = (item: any) => {
    setSelectedProduct(item);
    setAdjQuantity('');
    setAdjReason('');
    setAdjType('STOCK_IN');
    setAdjustModalVisible(true);
  };

  const handleSaveAdjustment = () => {
    if (!selectedProduct || !adjQuantity.trim()) return;

    const qty = parseFloat(adjQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive quantity.');
      return;
    }

    const cashierName = currentUser?.fullName || 'Manager';
    let qtyChange = qty;

    if (adjType === 'ADJUSTMENT_DAMAGE') {
      qtyChange = -qty;
    } else if (adjType === 'ADJUSTMENT_AUDIT') {
      qtyChange = qty - selectedProduct.stockQuantity;
    }

    recordMovement({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantityChange: qtyChange,
      movementType: adjType,
      reason: adjReason.trim() || 'Manual stock adjustment',
      performedBy: cashierName,
    });

    Alert.alert(
      'Stock Adjusted',
      `Updated ${selectedProduct.name} stock level. Audit record logged.`
    );
    setAdjustModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Top Header & Navigation */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📦 Branch Inventory & Stock Audit Ledger</Text>
          <Text style={styles.branchText}>
            {currentBranch?.name || 'Downtown Hub'} ({currentBranch?.code || '001'})
          </Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabGroup}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'STOCKS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('STOCKS')}
          >
            <Text
              style={[styles.tabBtnText, activeTab === 'STOCKS' && styles.tabBtnTextActive]}
            >
              📦 Stock Balances ({inventoryItems.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'LEDGER' && styles.tabBtnActive]}
            onPress={() => setActiveTab('LEDGER')}
          >
            <Text
              style={[styles.tabBtnText, activeTab === 'LEDGER' && styles.tabBtnTextActive]}
            >
              📜 Audit Ledger ({movements.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={
            activeTab === 'STOCKS'
              ? '🔍 Search product name, SKU, barcode...'
              : '🔍 Filter movements by product, reason, reference...'
          }
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Tab: STOCKS */}
      {activeTab === 'STOCKS' && (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isOutOfStock = item.stockQuantity === 0;
            const isLowStock = !isOutOfStock && item.stockQuantity <= item.reorderLevel;

            return (
              <View style={styles.card}>
                <View style={styles.cardLeft}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.sku}>
                    SKU: {item.sku} • Barcode: {item.barcode}
                  </Text>
                  <Text style={styles.category}>Category: {item.category}</Text>
                </View>

                <View style={styles.cardRight}>
                  <View style={styles.stockBadgeContainer}>
                    <Text style={styles.stockNumber}>{item.stockQuantity}</Text>
                    <Text style={styles.uom}>{item.unitOfMeasure}</Text>
                  </View>

                  {isOutOfStock && (
                    <View style={[styles.statusBadge, styles.badgeOut]}>
                      <Text style={styles.badgeText}>OUT OF STOCK</Text>
                    </View>
                  )}
                  {isLowStock && (
                    <View style={[styles.statusBadge, styles.badgeLow]}>
                      <Text style={styles.badgeText}>LOW STOCK</Text>
                    </View>
                  )}
                  {!isOutOfStock && !isLowStock && (
                    <View style={[styles.statusBadge, styles.badgeOk]}>
                      <Text style={styles.badgeText}>IN STOCK</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.adjustBtn}
                    onPress={() => handleOpenAdjust(item)}
                  >
                    <Text style={styles.adjustBtnText}>⚡ Adjust Stock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Tab: AUDIT LEDGER */}
      {activeTab === 'LEDGER' && (
        <FlatList
          data={filteredMovements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isPositive = item.quantityChange > 0;
            const isNeutral = item.quantityChange === 0;

            return (
              <View style={styles.movementCard}>
                <View style={{ flex: 1 }}>
                  <View style={styles.movHeaderRow}>
                    <Text style={styles.movProductName}>{item.productName}</Text>
                    <View
                      style={[
                        styles.movTypeBadge,
                        item.movementType === 'STOCK_IN' && styles.movStockIn,
                        item.movementType === 'SALE' && styles.movSale,
                        item.movementType.includes('RETURN') && styles.movReturn,
                        item.movementType.includes('DAMAGE') && styles.movDamage,
                      ]}
                    >
                      <Text style={styles.movTypeText}>{item.movementType}</Text>
                    </View>
                  </View>

                  <Text style={styles.movReason}>{item.reason || 'Inventory Adjustment'}</Text>
                  <Text style={styles.movMeta}>
                    {item.createdAt.slice(0, 16).replace('T', ' ')} • By: {item.performedBy}
                    {item.referenceId ? ` • Ref: ${item.referenceId}` : ''}
                  </Text>
                </View>

                <View style={styles.movQtyBox}>
                  <Text
                    style={[
                      styles.movQtyChange,
                      isPositive && styles.qtyPos,
                      !isPositive && !isNeutral && styles.qtyNeg,
                      isNeutral && styles.qtyNeut,
                    ]}
                  >
                    {isPositive ? `+${item.quantityChange}` : `${item.quantityChange}`}
                  </Text>
                  <Text style={styles.movBalance}>
                    Bal: {item.previousQuantity} → {item.newQuantity}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Stock Adjustment Modal */}
      <Modal visible={adjustModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adjust Stock Quantity</Text>
            {selectedProduct && (
              <Text style={styles.modalItemName}>{selectedProduct.name}</Text>
            )}

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, adjType === 'STOCK_IN' && styles.typeBtnActive]}
                onPress={() => setAdjType('STOCK_IN')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    adjType === 'STOCK_IN' && styles.typeBtnTextActive,
                  ]}
                >
                  ➕ Stock In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  adjType === 'ADJUSTMENT_DAMAGE' && styles.typeBtnActive,
                ]}
                onPress={() => setAdjType('ADJUSTMENT_DAMAGE')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    adjType === 'ADJUSTMENT_DAMAGE' && styles.typeBtnTextActive,
                  ]}
                >
                  🗑 Spoil / Damage
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  adjType === 'ADJUSTMENT_AUDIT' && styles.typeBtnActive,
                ]}
                onPress={() => setAdjType('ADJUSTMENT_AUDIT')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    adjType === 'ADJUSTMENT_AUDIT' && styles.typeBtnTextActive,
                  ]}
                >
                  📝 Audit Count
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Quantity (e.g. 10)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={adjQuantity}
              onChangeText={setAdjQuantity}
            />

            <TextInput
              style={[styles.modalInput, styles.reasonInput]}
              placeholder="Reason / PO # (e.g., Supplier Delivery, Spoilage, Physical Count)"
              placeholderTextColor="#64748B"
              value={adjReason}
              onChangeText={setAdjReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAdjustModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAdjustment}>
                <Text style={styles.saveBtnText}>Record & Audit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    padding: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: 'bold', color: '#F8FAFC' },
  branchText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  tabGroup: { flexDirection: 'row', gap: 6 },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  tabBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  tabBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  searchContainer: { padding: 12 },
  searchInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
  },
  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardLeft: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: 'bold', color: '#F8FAFC' },
  sku: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  category: { fontSize: 11, color: '#64748B', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  stockBadgeContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  stockNumber: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' },
  uom: { fontSize: 11, color: '#94A3B8' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeOut: { backgroundColor: '#7F1D1D' },
  badgeLow: { backgroundColor: '#78350F' },
  badgeOk: { backgroundColor: '#065F46' },
  badgeText: { fontSize: 9, fontWeight: 'bold', color: '#F8FAFC' },
  adjustBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 4,
  },
  adjustBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  movementCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  movHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  movProductName: { color: '#F8FAFC', fontSize: 13, fontWeight: 'bold' },
  movTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#334155' },
  movStockIn: { backgroundColor: '#065F46' },
  movSale: { backgroundColor: '#1E3A8A' },
  movReturn: { backgroundColor: '#4C1D95' },
  movDamage: { backgroundColor: '#7F1D1D' },
  movTypeText: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' },
  movReason: { color: '#CBD5E1', fontSize: 11, marginTop: 2 },
  movMeta: { color: '#64748B', fontSize: 10, marginTop: 2 },
  movQtyBox: { alignItems: 'flex-end' },
  movQtyChange: { fontSize: 15, fontWeight: 'bold' },
  qtyPos: { color: '#10B981' },
  qtyNeg: { color: '#EF4444' },
  qtyNeut: { color: '#94A3B8' },
  movBalance: { color: '#64748B', fontSize: 10, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 18,
    width: '75%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#F8FAFC' },
  modalItemName: { fontSize: 13, color: '#38BDF8', marginTop: 2, marginBottom: 12 },
  typeSelector: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeBtnActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  typeBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  typeBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  modalInput: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 10,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
    fontSize: 13,
  },
  reasonInput: { height: 60, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#334155' },
  cancelBtnText: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: '#10B981' },
  saveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
});
