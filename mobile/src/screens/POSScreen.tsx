import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useHeldCartStore, HeldCart } from '../store/heldCartStore';
import { Product, DiscountType } from '../../../shared/src';
import { DiscountModal } from '../components/DiscountModal';
import { HeldCartsModal } from '../components/HeldCartsModal';
import { PriceCheckModal } from '../components/PriceCheckModal';
import { SupervisorPinModal } from '../components/SupervisorPinModal';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

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
    categoryId: '6',
    sku: 'SNK-001',
    barcode: '4800056605015',
    name: 'Potato Crisps Salted 100g',
    costPrice: 28.0,
    sellingPrice: 38.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'POUCH',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];

interface POSScreenProps {
  onNavigateToCheckout?: () => void;
}

export const POSScreen: React.FC<POSScreenProps> = ({ onNavigateToCheckout }) => {
  const { currentUser, currentBranch, currentTerminal, isOnline } = useAuthStore();
  const {
    items,
    discountType,
    discountValue,
    customerName,
    addItem,
    updateQuantity,
    removeItem,
    applyDiscount,
    applySeniorDiscount,
    clearCart,
    loadCart,
    getSubtotal,
    getDiscountAmount,
    getVatableAmount,
    getVatExemptAmount,
    getTaxAmount,
    getTotalAmount,
  } = useCartStore();

  const { heldCarts, holdCart } = useHeldCartStore();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [heldCartsModalVisible, setHeldCartsModalVisible] = useState(false);
  const [priceCheckModalVisible, setPriceCheckModalVisible] = useState(false);
  const [supervisorModalVisible, setSupervisorModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Hardware Barcode Scanner Hook
  const { handleKeyPress } = useBarcodeScanner({
    onScan: (scannedBarcode) => {
      handleBarcodeScan(scannedBarcode);
    },
    enabled: !discountModalVisible && !heldCartsModalVisible && !priceCheckModalVisible,
  });

  const handleBarcodeScan = (code: string) => {
    const found = SAMPLE_PRODUCTS.find((p) => p.barcode === code.trim());
    if (found) {
      addItem(found);
      setBarcodeInput('');
    } else {
      Alert.alert('Barcode Not Found', `No registered item matching barcode ${code}`);
    }
  };

  const handleHoldSale = () => {
    if (items.length === 0) {
      Alert.alert('Hold Sale', 'Cart is empty. Nothing to hold.');
      return;
    }
    const held = holdCart(
      items,
      getSubtotal(),
      discountType,
      discountValue,
      customerName
    );
    if (held) {
      clearCart();
      Alert.alert('Sale Held', `Transaction ticket ${held.ticketNumber} held successfully.`);
    }
  };

  const handleRecallCart = (cart: HeldCart) => {
    loadCart(
      cart.items,
      cart.discountType,
      cart.discountValue,
      cart.customerName,
      cart.customerTinId
    );
  };

  const handleItemVoid = (productId: string, productName: string) => {
    // Requires supervisor approval if cart has more than 3 items or value > 500
    if (getTotalAmount() > 500) {
      setPendingAction(() => () => removeItem(productId));
      setSupervisorModalVisible(true);
    } else {
      removeItem(productId);
    }
  };

  const handleSupervisorAuthorized = (supervisor: string) => {
    setSupervisorModalVisible(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const filteredProducts = SAMPLE_PRODUCTS.filter((product) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      SAMPLE_CATEGORIES.find((c) => c.code === selectedCategory)?.id === product.categoryId;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.includes(searchQuery) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Top Tablet Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.brandTitle}>FoodBaskets POS</Text>
          <Text style={styles.terminalBadge}>
            {currentBranch?.code} • {currentTerminal?.name}
          </Text>
          <View style={[styles.statusBadge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
            <Text style={styles.statusText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setPriceCheckModalVisible(true)}
          >
            <Text style={styles.headerActionText}>🔍 Price Check (F6)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setHeldCartsModalVisible(true)}
          >
            <Text style={styles.headerActionText}>
              ⏳ Recall ({heldCarts.length}) (F5)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, styles.holdBtn]}
            onPress={handleHoldSale}
          >
            <Text style={styles.holdBtnText}>⏸ Hold Sale (F4)</Text>
          </TouchableOpacity>

          <View style={styles.cashierInfo}>
            <Text style={styles.cashierName}>{currentUser?.fullName}</Text>
            <Text style={styles.cashierRole}>{currentUser?.role}</Text>
          </View>
        </View>
      </View>

      {/* Main Workspace Split Layout */}
      <View style={styles.mainWorkspace}>
        {/* Left 62%: Catalog, Barcode Scanner, and Categories */}
        <View style={styles.catalogSection}>
          {/* Barcode & Search Controls */}
          <View style={styles.searchContainer}>
            <View style={styles.barcodeBox}>
              <TextInput
                style={styles.barcodeInput}
                placeholder="Scan / Type Barcode..."
                placeholderTextColor="#64748B"
                value={barcodeInput}
                onChangeText={setBarcodeInput}
                onSubmitEditing={() => handleBarcodeScan(barcodeInput)}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.addBarcodeBtn}
                onPress={() => handleBarcodeScan(barcodeInput)}
              >
                <Text style={styles.addBarcodeBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search item name, SKU..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Category Ribbon */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryRibbon}
          >
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

          {/* Product Cards Grid */}
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

        {/* Right 38%: Active Cart, Calculations & Tender Actions */}
        <View style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <View>
              <Text style={styles.cartTitle}>Active Ticket ({items.length} items)</Text>
              {customerName ? (
                <Text style={styles.customerBadge}>Customer: {customerName}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={clearCart} disabled={items.length === 0}>
              <Text style={[styles.clearCartBtn, items.length === 0 && styles.disabledText]}>
                Clear Cart
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cart Item Rows */}
          <ScrollView style={styles.cartList}>
            {items.length === 0 ? (
              <View style={styles.emptyCartContainer}>
                <Text style={styles.emptyCartText}>Cart is empty</Text>
                <Text style={styles.emptyCartSub}>
                  Scan a barcode or tap an item on the left to start sale
                </Text>
              </View>
            ) : (
              items.map((item) => (
                <View key={item.productId} style={styles.cartItemRow}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemUnitPrice}>
                      ₱{item.unitPrice.toFixed(2)} × {item.quantity}
                    </Text>
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

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleItemVoid(item.productId, item.name)}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {/* Financial Breakdown & Tax Summary */}
          <View style={styles.cartSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gross Subtotal</Text>
              <Text style={styles.summaryValue}>₱{getSubtotal().toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.summaryLabel}>Discount</Text>
                {discountType !== DiscountType.NONE ? (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>
                      {discountType === DiscountType.SENIOR_PWD ? 'SENIOR/PWD 20%' : `${discountValue}%`}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.summaryValue, styles.textDiscount]}>
                -₱{getDiscountAmount().toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelSub}>VATable Sales</Text>
              <Text style={styles.summaryValueSub}>₱{getVatableAmount().toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelSub}>VAT-Exempt Sales</Text>
              <Text style={styles.summaryValueSub}>₱{getVatExemptAmount().toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelSub}>12% VAT Amount</Text>
              <Text style={styles.summaryValueSub}>₱{getTaxAmount().toFixed(2)}</Text>
            </View>

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL AMOUNT DUE</Text>
              <Text style={styles.totalValue}>₱{getTotalAmount().toFixed(2)}</Text>
            </View>
          </View>

          {/* Action Bar — Professional POS Layout */}
          <View style={styles.cartActions}>
            <TouchableOpacity
              style={styles.discountActionBtn}
              onPress={() => setDiscountModalVisible(true)}
              disabled={items.length === 0}
            >
              <Text style={styles.discountActionText}>% Discount{'\n'}(F3)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.holdActionBtn}
              onPress={handleHoldSale}
              disabled={items.length === 0}
            >
              <Text style={styles.holdActionText}>HOLD{'\n'}(F4)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.voidActionBtn, items.length === 0 && styles.disabledBtn]}
              disabled={items.length === 0}
              onPress={() => {
                Alert.alert('Void Sale', 'Clear the entire cart?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Void', style: 'destructive', onPress: clearCart },
                ]);
              }}
            >
              <Text style={styles.voidActionText}>VOID</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payBtn, items.length === 0 && styles.disabledBtn]}
              disabled={items.length === 0}
              onPress={() => {
                if (onNavigateToCheckout) {
                  onNavigateToCheckout();
                } else {
                  Alert.alert(
                    'Order Ready for Tender',
                    `Total: ₱${getTotalAmount().toFixed(2)}\nProceeding to payment terminal...`
                  );
                }
              }}
            >
              <Text style={styles.payBtnLabel}>PAY</Text>
              <Text style={styles.payBtnAmount}>₱{getTotalAmount().toFixed(2)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modals */}
      <DiscountModal
        visible={discountModalVisible}
        onClose={() => setDiscountModalVisible(false)}
        onApplyDiscount={(type, value, seniorId, custName) => {
          if (type === DiscountType.SENIOR_PWD && seniorId && custName) {
            applySeniorDiscount(seniorId, custName);
          } else {
            applyDiscount(type, value);
          }
        }}
      />

      <HeldCartsModal
        visible={heldCartsModalVisible}
        onClose={() => setHeldCartsModalVisible(false)}
        onRecallCart={handleRecallCart}
      />

      <PriceCheckModal
        visible={priceCheckModalVisible}
        products={SAMPLE_PRODUCTS}
        onClose={() => setPriceCheckModalVisible(false)}
        onAddToCart={(product) => addItem(product)}
      />

      <SupervisorPinModal
        visible={supervisorModalVisible}
        actionTitle="Item Void Approval"
        reason="Transaction total exceeds ₱500 threshold"
        onAuthorize={handleSupervisorAuthorized}
        onCancel={() => {
          setSupervisorModalVisible(false);
          setPendingAction(null);
        }}
      />
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandTitle: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  terminalBadge: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeOnline: {
    backgroundColor: '#065F46',
  },
  badgeOffline: {
    backgroundColor: '#991B1B',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerActionBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerActionText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  holdBtn: {
    borderColor: '#F59E0B',
  },
  holdBtnText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cashierInfo: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  cashierName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  cashierRole: {
    color: '#64748B',
    fontSize: 11,
  },
  mainWorkspace: {
    flex: 1,
    flexDirection: 'row',
  },
  catalogSection: {
    flex: 62,
    borderRightWidth: 1,
    borderRightColor: '#334155',
    padding: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  barcodeBox: {
    flex: 1.2,
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284C7',
    overflow: 'hidden',
  },
  barcodeInput: {
    flex: 1,
    height: 42,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  addBarcodeBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBarcodeBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  searchInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
  },
  categoryRibbon: {
    maxHeight: 44,
    marginBottom: 10,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
  },
  categoryTabActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  categoryTabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
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
    margin: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    height: 110,
    justifyContent: 'space-between',
  },
  productName: {
    color: '#F8FAFC',
    fontSize: 13,
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
    flex: 38,
    backgroundColor: '#0F172A',
    display: 'flex',
    flexDirection: 'column',
  },
  cartHeader: {
    padding: 12,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  cartTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  customerBadge: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  clearCartBtn: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledText: {
    color: '#475569',
  },
  cartList: {
    flex: 1,
    padding: 8,
  },
  emptyCartContainer: {
    paddingVertical: 60,
    alignItems: 'center',
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
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  cartItemUnitPrice: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    paddingHorizontal: 4,
    marginHorizontal: 8,
  },
  qtyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyBtnText: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemTotal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 65,
    textAlign: 'right',
  },
  deleteBtn: {
    marginLeft: 8,
    padding: 4,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cartSummary: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  summaryValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryLabelSub: {
    color: '#64748B',
    fontSize: 11,
  },
  summaryValueSub: {
    color: '#94A3B8',
    fontSize: 11,
  },
  textDiscount: {
    color: '#10B981',
  },
  discountBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: '#6EE7B7',
    fontSize: 9,
    fontWeight: 'bold',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 6,
    paddingTop: 6,
    alignItems: 'center',
  },
  totalLabel: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#38BDF8',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cartActions: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#0F172A',
    gap: 6,
  },
  discountActionBtn: {
    flex: 0.8,
    height: 56,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  discountActionText: {
    color: '#CBD5E1',
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center',
  },
  holdActionBtn: {
    flex: 0.7,
    height: 56,
    backgroundColor: '#1D4ED8',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  voidActionBtn: {
    flex: 0.6,
    height: 56,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voidActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  payBtn: {
    flex: 1.5,
    height: 56,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  payBtnAmount: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  disabledBtn: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
});
