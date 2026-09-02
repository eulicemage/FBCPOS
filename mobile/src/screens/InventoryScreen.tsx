import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { useAuthStore } from '../store/authStore';

interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  stockQuantity: number;
  reorderLevel: number;
  unitOfMeasure: string;
}

const SAMPLE_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    productId: 'p1',
    sku: 'BEV-001',
    barcode: '4800016601011',
    name: 'Fresh Whole Milk 1L',
    category: 'Beverages',
    stockQuantity: 42,
    reorderLevel: 20,
    unitOfMeasure: 'PCS',
  },
  {
    id: 'inv-2',
    productId: 'p2',
    sku: 'BEV-002',
    barcode: '4800016601028',
    name: 'Orange Juice 1L Pure',
    category: 'Beverages',
    stockQuantity: 8,
    reorderLevel: 15, // Low stock
    unitOfMeasure: 'PCS',
  },
  {
    id: 'inv-3',
    productId: 'p3',
    sku: 'BAK-001',
    barcode: '4800026602012',
    name: 'Whole Wheat Loaf 500g',
    category: 'Bakery',
    stockQuantity: 0, // Out of stock
    reorderLevel: 10,
    unitOfMeasure: 'PACK',
  },
  {
    id: 'inv-4',
    productId: 'p4',
    sku: 'DAI-001',
    barcode: '4800036603013',
    name: 'Organic Brown Eggs 12s',
    category: 'Dairy & Eggs',
    stockQuantity: 25,
    reorderLevel: 10,
    unitOfMeasure: 'TRAY',
  },
  {
    id: 'inv-5',
    productId: 'p5',
    sku: 'CAN-001',
    barcode: '4800046604014',
    name: 'Canned Tuna Flakes 180g',
    category: 'Canned Goods',
    stockQuantity: 150,
    reorderLevel: 30,
    unitOfMeasure: 'CAN',
  },
];

export const InventoryScreen: React.FC = () => {
  const { currentBranch } = useAuthStore();
  const [inventory, setInventory] = useState<InventoryItem[]>(SAMPLE_INVENTORY);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [adjType, setAdjType] = useState<'STOCK_IN' | 'DAMAGE' | 'AUDIT'>('STOCK_IN');
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjReason, setAdjReason] = useState('');

  const filtered = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjQuantity('');
    setAdjReason('');
    setAdjustModalVisible(true);
  };

  const handleSaveAdjustment = () => {
    if (!selectedItem || !adjQuantity.trim()) return;

    const qty = parseFloat(adjQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive quantity');
      return;
    }

    let newQty = selectedItem.stockQuantity;
    if (adjType === 'STOCK_IN') {
      newQty += qty;
    } else if (adjType === 'DAMAGE') {
      newQty = Math.max(0, newQty - qty);
    } else if (adjType === 'AUDIT') {
      newQty = qty; // Physical count
    }

    setInventory((prev) =>
      prev.map((i) => (i.id === selectedItem.id ? { ...i, stockQuantity: newQty } : i))
    );

    alert(`Inventory updated for ${selectedItem.name}! New Stock: ${newQty}`);
    setAdjustModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Branch Inventory & Stock Ledger</Text>
          <Text style={styles.branchSub}>{currentBranch?.name}</Text>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search product, barcode, SKU..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { flex: 2 }]}>Product / SKU</Text>
        <Text style={[styles.th, { flex: 1.5 }]}>Barcode</Text>
        <Text style={[styles.th, { flex: 1 }]}>Category</Text>
        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>In Stock</Text>
        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Reorder Level</Text>
        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Status</Text>
        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Action</Text>
      </View>

      {/* Inventory Rows */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isOut = item.stockQuantity <= 0;
          const isLow = !isOut && item.stockQuantity <= item.reorderLevel;

          return (
            <View style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.skuText}>{item.sku}</Text>
              </View>
              <Text style={[styles.td, { flex: 1.5 }]}>{item.barcode}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{item.category}</Text>
              <Text
                style={[
                  styles.tdBold,
                  { flex: 1, textAlign: 'center' },
                  isOut && styles.textRed,
                  isLow && styles.textYellow,
                ]}
              >
                {item.stockQuantity} {item.unitOfMeasure}
              </Text>
              <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>
                {item.reorderLevel} {item.unitOfMeasure}
              </Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View
                  style={[
                    styles.statusBadge,
                    isOut
                      ? styles.badgeRed
                      : isLow
                      ? styles.badgeYellow
                      : styles.badgeGreen,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'OPTIMAL'}
                  </Text>
                </View>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <TouchableOpacity
                  style={styles.adjustBtn}
                  onPress={() => handleOpenAdjust(item)}
                >
                  <Text style={styles.adjustBtnText}>Adjust</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Stock Adjustment Modal */}
      <Modal visible={adjustModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Stock Adjustment</Text>
            <Text style={styles.modalSub}>{selectedItem?.name}</Text>
            <Text style={styles.currentStockText}>
              Current Stock: {selectedItem?.stockQuantity} {selectedItem?.unitOfMeasure}
            </Text>

            {/* Adjustment Type Selector */}
            <View style={styles.typeSelector}>
              {(['STOCK_IN', 'DAMAGE', 'AUDIT'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, adjType === t && styles.typeBtnActive]}
                  onPress={() => setAdjType(t)}
                >
                  <Text
                    style={[styles.typeBtnText, adjType === t && styles.typeBtnTextActive]}
                  >
                    {t === 'STOCK_IN'
                      ? 'Stock In (+)'
                      : t === 'DAMAGE'
                      ? 'Damage Write-Off (-)'
                      : 'Physical Audit (=)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>
              {adjType === 'AUDIT' ? 'Actual Counted Physical Stock' : 'Quantity to Apply'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter quantity..."
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={adjQuantity}
              onChangeText={setAdjQuantity}
            />

            <Text style={styles.inputLabel}>Reason / Audit Reference</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Broken packaging, physical count, supplier delivery..."
              placeholderTextColor="#64748B"
              value={adjReason}
              onChangeText={setAdjReason}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAdjustModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveAdjustment}>
                <Text style={styles.confirmBtnText}>Save Movement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#38BDF8',
    fontSize: 20,
    fontWeight: 'bold',
  },
  branchSub: {
    color: '#94A3B8',
    fontSize: 13,
  },
  searchInput: {
    width: 320,
    height: 44,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  th: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  productName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  skuText: {
    color: '#64748B',
    fontSize: 11,
  },
  td: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  tdBold: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  textRed: {
    color: '#EF4444',
  },
  textYellow: {
    color: '#F59E0B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGreen: {
    backgroundColor: '#065F46',
  },
  badgeYellow: {
    backgroundColor: '#78350F',
  },
  badgeRed: {
    backgroundColor: '#7F1D1D',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  adjustBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  adjustBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: 440,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSub: {
    color: '#F8FAFC',
    fontSize: 15,
    marginTop: 4,
    fontWeight: '600',
  },
  currentStockText: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  typeBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 6,
  },
  modalInput: {
    height: 44,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
