import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { Product, DiscountType } from '../../../shared/src';

const SAMPLE_CATEGORIES = [
  { id: '1', code: 'ALL', name: 'All Items' },
  { id: '2', code: 'BEV', name: 'Beverages' },
  { id: '3', code: 'BAK', name: 'Bakery' },
  { id: '4', code: 'DAI', name: 'Dairy & Eggs' },
  { id: '5', code: 'CAN', name: 'Canned Goods' },
  { id: '6', code: 'SNK', name: 'Snacks' },
];

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'p1',
    categoryId: '2',
    sku: 'BEV-001',
    barcode: '4800016601011',
    name: 'Fresh Whole Milk 1L',
    costPrice: 72.0,
    sellingPrice: 95.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'PCS',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'p2',
    categoryId: '2',
    sku: 'BEV-002',
    barcode: '4800016601028',
    name: 'Orange Juice 1L Pure',
    costPrice: 85.0,
    sellingPrice: 110.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'PCS',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'p3',
    categoryId: '3',
    sku: 'BAK-001',
    barcode: '4800026602012',
    name: 'Whole Wheat Loaf 500g',
    costPrice: 48.0,
    sellingPrice: 65.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'PACK',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'p4',
    categoryId: '4',
    sku: 'DAI-001',
    barcode: '4800036603013',
    name: 'Organic Brown Eggs 12s',
    costPrice: 110.0,
    sellingPrice: 145.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'TRAY',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'p5',
    categoryId: '5',
    sku: 'CAN-001',
    barcode: '4800046604014',
    name: 'Canned Tuna Flakes 180g',
    costPrice: 32.0,
    sellingPrice: 45.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'CAN',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'p6',
    categoryId: '5',
    sku: 'CAN-002',
    barcode: '4800046604021',
    name: 'Premium Jasmine Rice 5kg',
    costPrice: 220.0,
    sellingPrice: 280.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'BAG',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];

export const POSScreen: React.FC = () => {
  const { currentBranch, currentTerminal, currentUser, isOnline } = useAuthStore();
  const {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyDiscount,
    getSubtotal,
    getDiscountAmount,
    getTaxAmount,
    getTotalAmount,
  } = useCartStore();

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) return;
    const match = SAMPLE_PRODUCTS.find((p) => p.barcode === barcodeInput.trim());
    if (match) {
      addItem(match);
      setBarcodeInput('');
    } else {
      alert(`Barcode ${barcodeInput} not found in catalog!`);
    }
  };

  const filteredProducts = SAMPLE_PRODUCTS.filter((p) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      (selectedCategory === 'BEV' && p.categoryId === '2') ||
      (selectedCategory === 'BAK' && p.categoryId === '3') ||
      (selectedCategory === 'DAI' && p.categoryId === '4') ||
      (selectedCategory === 'CAN' && p.categoryId === '5');

    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>FoodBaskets Corp POS</Text>
          <Text style={styles.branchSub}>
            {currentBranch?.name} | {currentTerminal?.name}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
            <Text style={styles.badgeText}>{isOnline ? '● ONLINE (Synced)' : '○ OFFLINE MODE'}</Text>
          </View>
          <Text style={styles.cashierName}>Cashier: {currentUser?.fullName}</Text>
        </View>
      </View>

      {/* Main Split-Screen Layout */}
      <View style={styles.mainContent}>
        {/* Left 60%: Catalog & Search Grid */}
        <View style={styles.catalogSection}>
          {/* Barcode & Search Controls */}
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.barcodeInput}
              placeholder="Scan or Enter Barcode..."
              placeholderTextColor="#94A3B8"
              value={barcodeInput}
              onChangeText={setBarcodeInput}
              onSubmitEditing={handleBarcodeSubmit}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search product name, SKU..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Category Navigation Ribbon */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRibbon}>
            {SAMPLE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryTab,
                  selectedCategory === cat.code && styles.categoryTabActive,
                ]}
                onPress={() => setSelectedCategory(cat.code)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === cat.code && styles.categoryTabTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Product Grid */}
          <FlatList
            data={filteredProducts}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.productCard} onPress={() => addItem(item)}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.productSku}>{item.sku}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.productPrice}>₱{item.sellingPrice.toFixed(2)}</Text>
                  <Text style={styles.productUom}>{item.unitOfMeasure}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Right 40%: Active Cart & Quick Pay */}
        <View style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Active Cart ({items.length} items)</Text>
            <TouchableOpacity onPress={clearCart} disabled={items.length === 0}>
              <Text style={[styles.clearCartBtn, items.length === 0 && styles.disabledText]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cart Items List */}
          <ScrollView style={styles.cartList}>
            {items.length === 0 ? (
              <View style={styles.emptyCartContainer}>
                <Text style={styles.emptyCartText}>Cart is empty</Text>
                <Text style={styles.emptyCartSub}>Scan a barcode or tap an item to begin</Text>
              </View>
            ) : (
              items.map((item) => (
                <View key={item.productId} style={styles.cartItemRow}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemUnitPrice}>₱{item.unitPrice.toFixed(2)}</Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartItemTotal}>₱{item.total.toFixed(2)}</Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Cart Summary Totals */}
          <View style={styles.cartSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₱{getSubtotal().toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryValue}>-₱{getDiscountAmount().toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>12% VAT (Included)</Text>
              <Text style={styles.summaryValue}>₱{getTaxAmount().toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL DUE</Text>
              <Text style={styles.totalValue}>₱{getTotalAmount().toFixed(2)}</Text>
            </View>
          </View>

          {/* Quick Pay Action Buttons */}
          <View style={styles.cartActions}>
            <TouchableOpacity
              style={[styles.payCashBtn, items.length === 0 && styles.disabledBtn]}
              disabled={items.length === 0}
              onPress={() => alert(`Processing Cash Payment of ₱${getTotalAmount().toFixed(2)}`)}
            >
              <Text style={styles.payCashBtnText}>PAY CASH (F12)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    height: 60,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  brandTitle: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  branchSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeOnline: {
    backgroundColor: '#065F46',
  },
  badgeOffline: {
    backgroundColor: '#991B1B',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cashierName: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  catalogSection: {
    flex: 0.62,
    borderRightWidth: 1,
    borderRightColor: '#334155',
    padding: 12,
  },
  searchBarContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  barcodeInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  searchInput: {
    flex: 1.5,
    height: 48,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryRibbon: {
    maxHeight: 45,
    marginBottom: 10,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: '#0284C7',
  },
  categoryTabText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  gridContent: {
    paddingBottom: 20,
  },
  productCard: {
    flex: 1 / 3,
    backgroundColor: '#1E293B',
    margin: 5,
    padding: 14,
    borderRadius: 10,
    minHeight: 110,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  productName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  productSku: {
    color: '#64748B',
    fontSize: 11,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  productPrice: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productUom: {
    color: '#94A3B8',
    fontSize: 11,
  },
  cartSection: {
    flex: 0.38,
    backgroundColor: '#1E293B',
    flexDirection: 'column',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  cartTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearCartBtn: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: '#64748B',
  },
  cartList: {
    flex: 1,
    padding: 10,
  },
  emptyCartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCartSub: {
    color: '#475569',
    fontSize: 12,
    marginTop: 4,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  cartItemUnitPrice: {
    color: '#94A3B8',
    fontSize: 11,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 10,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    backgroundColor: '#334155',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cartItemTotal: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: 'bold',
    width: 65,
    textAlign: 'right',
  },
  cartSummary: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    backgroundColor: '#0F172A',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  summaryValue: {
    color: '#F8FAFC',
    fontSize: 13,
  },
  totalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  totalLabel: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: 'bold',
  },
  cartActions: {
    padding: 16,
    backgroundColor: '#0F172A',
  },
  payCashBtn: {
    backgroundColor: '#10B981',
    height: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payCashBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledBtn: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
});
