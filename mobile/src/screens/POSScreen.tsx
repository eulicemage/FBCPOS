import React, { useState } from 'react';
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
import { useProductStore } from '../store/productStore';
import { useMemberStore, Member } from '../store/memberStore';
import { useShiftStore } from '../store/shiftStore';
import { useHardwareStore } from '../store/hardwareStore';
import { useHeldCartStore, HeldCart } from '../store/heldCartStore';
import { Product, DiscountType } from '../../../shared/src';

import { DiscountModal } from '../components/DiscountModal';
import { HeldCartsModal } from '../components/HeldCartsModal';
import { PriceCheckModal } from '../components/PriceCheckModal';
import { SupervisorPinModal } from '../components/SupervisorPinModal';
import { QuickAddProductModal } from '../components/QuickAddProductModal';
import { MemberManagementModal } from '../components/MemberManagementModal';
import { ShiftReadingModal, ReadingType } from '../components/ShiftReadingModal';
import { ShiftHistoryModal } from '../components/ShiftHistoryModal';
import { HardwareSettingsModal } from '../components/HardwareSettingsModal';
import { ReturnModal } from '../components/ReturnModal';
import { BackupModal } from '../components/BackupModal';
import { SyncStatusModal } from '../components/SyncStatusModal';
import { useSyncQueueStore } from '../store/syncQueueStore';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

interface POSScreenProps {
  onNavigateToCheckout?: () => void;
  onSwitchCashier?: () => void;
}

export const POSScreen: React.FC<POSScreenProps> = ({
  onNavigateToCheckout,
  onSwitchCashier,
}) => {
  const { currentUser, currentBranch, currentTerminal, isOnline, isBypassMode, toggleBypassMode } =
    useAuthStore();
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
    setCustomerInfo,
    clearCart,
    loadCart,
    getSubtotal,
    getDiscountAmount,
    getVatableAmount,
    getVatExemptAmount,
    getTaxAmount,
    getTotalAmount,
  } = useCartStore();

  const { products, categories, selectedCategory, setSelectedCategory, findProductByBarcode } =
    useProductStore();
  const { findMemberByBarcode } = useMemberStore();
  const { currentShift, recordVoid } = useShiftStore();
  const { kickCashDrawer } = useHardwareStore();
  const { heldCarts, holdCart } = useHeldCartStore();

  // Local search & barcode state
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Modals
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [heldCartsModalVisible, setHeldCartsModalVisible] = useState(false);
  const [priceCheckModalVisible, setPriceCheckModalVisible] = useState(false);
  const [supervisorModalVisible, setSupervisorModalVisible] = useState(false);
  const [quickAddModalVisible, setQuickAddModalVisible] = useState(false);
  const [pendingAddBarcode, setPendingAddBarcode] = useState('');
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [readingModalVisible, setReadingModalVisible] = useState(false);
  const [readingType, setReadingType] = useState<ReadingType>('X_READ');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [hardwareModalVisible, setHardwareModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const { isSimulatedOffline, getPendingCount } = useSyncQueueStore();
  const pendingSyncCount = getPendingCount();

  // Hardware Barcode Scanner Hook
  const { handleKeyPress } = useBarcodeScanner({
    onScan: (scannedBarcode) => {
      handleBarcodeScan(scannedBarcode);
    },
    enabled:
      !discountModalVisible &&
      !heldCartsModalVisible &&
      !priceCheckModalVisible &&
      !quickAddModalVisible &&
      !memberModalVisible &&
      !readingModalVisible &&
      !hardwareModalVisible,
  });

  const handleBarcodeScan = (code: string) => {
    const cleaned = code.trim();
    if (!cleaned) return;

    // 1. Check if barcode belongs to a Member ID card
    const member = findMemberByBarcode(cleaned);
    if (member) {
      setCustomerInfo(member.fullName);
      Alert.alert(
        '👤 Member Card Identified',
        `Member: ${member.fullName}\nID Barcode: ${member.barcode}\nMonthly Allowance: ₱${member.monthlyAllowance.toFixed(2)}\nAvailable Consumable: ₱${member.currentPointsBalance.toFixed(2)}`
      );
      setBarcodeInput('');
      return;
    }

    // 2. Check if barcode belongs to a Product
    const foundProduct = findProductByBarcode(cleaned);
    if (foundProduct) {
      addItem(foundProduct);
      setBarcodeInput('');
    } else {
      // 3. Unregistered barcode: prompt to add dynamically!
      Alert.alert(
        'Barcode Not Registered',
        `No registered product matching barcode "${cleaned}".\nWould you like to add this product to the catalog now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '➕ Add Product',
            onPress: () => {
              setPendingAddBarcode(cleaned);
              setQuickAddModalVisible(true);
            },
          },
        ]
      );
    }
  };

  const handleHoldSale = () => {
    if (items.length === 0) {
      Alert.alert('Hold Sale', 'Cart is empty. Nothing to hold.');
      return;
    }
    const held = holdCart(items, getSubtotal(), discountType, discountValue, customerName);
    if (held) {
      clearCart();
      Alert.alert('Sale Held', `Transaction ticket ${held.ticketNumber} held successfully.`);
    }
  };

  const handleRecallCart = (cart: HeldCart) => {
    loadCart(cart.items, cart.discountType, cart.discountValue, cart.customerName, cart.customerTinId);
  };

  const handleItemVoid = (productId: string, productName: string) => {
    // If Bypass Mode is ON, skip supervisor approval completely!
    if (isBypassMode || getTotalAmount() <= 500) {
      removeItem(productId);
      recordVoid();
    } else {
      setPendingAction(() => () => {
        removeItem(productId);
        recordVoid();
      });
      setSupervisorModalVisible(true);
    }
  };

  const handleSupervisorAuthorized = (supervisor: string) => {
    setSupervisorModalVisible(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleOpenDrawer = async () => {
    const res = await kickCashDrawer();
    Alert.alert('Cash Drawer Opened', `Drawer kick pulse dispatched.`);
  };

  const handleOpenXRead = () => {
    setReadingType('X_READ');
    setReadingModalVisible(true);
  };

  const handleOpenZRead = () => {
    setReadingType('Z_READ');
    setReadingModalVisible(true);
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      categories.find((c) => c.code === selectedCategory)?.id === product.categoryId;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.includes(searchQuery) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && product.isActive;
  });

  return (
    <View style={styles.container}>
      {/* Top Tablet Navigation & Control Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.brandTitle}>FoodBaskets POS</Text>
          <Text style={styles.terminalBadge}>
            {currentBranch?.code} • {currentTerminal?.name} • Shift #{currentShift?.shiftNumber || '101'}
          </Text>

          {/* Master Bypass Mode Button / Badge */}
          <TouchableOpacity
            style={[styles.bypassBtn, isBypassMode && styles.bypassBtnActive]}
            onPress={() => {
              toggleBypassMode();
              Alert.alert(
                'Master Bypass Mode',
                !isBypassMode
                  ? 'Bypass Mode ENABLED: All restrictions, PIN authorizations, and product modifications unlocked.'
                  : 'Bypass Mode DISABLED: Standard cashier security reinstated.'
              );
            }}
          >
            <Text style={[styles.bypassText, isBypassMode && styles.bypassTextActive]}>
              {isBypassMode ? '🔓 BYPASS ACTIVE' : '🔒 BYPASS (F10)'}
            </Text>
          </TouchableOpacity>

          {/* Cloud Sync Status Badge */}
          <TouchableOpacity
            style={[
              styles.syncBadge,
              isSimulatedOffline || !isOnline
                ? styles.syncBadgeOffline
                : pendingSyncCount > 0
                ? styles.syncBadgePending
                : styles.syncBadgeSynced,
            ]}
            onPress={() => setSyncModalVisible(true)}
          >
            <Text style={styles.syncBadgeText}>
              {isSimulatedOffline || !isOnline
                ? '🔴 OFFLINE'
                : pendingSyncCount > 0
                ? `🟡 SYNC (${pendingSyncCount})`
                : '🟢 SYNCED'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header Right Action Bar */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerActionBtn, styles.addProdBtn]}
            onPress={() => {
              setPendingAddBarcode('');
              setQuickAddModalVisible(true);
            }}
          >
            <Text style={styles.addProdText}>➕ Add Item (F9)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, styles.memberBtn]}
            onPress={() => setMemberModalVisible(true)}
          >
            <Text style={styles.memberBtnText}>👥 Members (₱1.5k)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, styles.xReadBtn]}
            onPress={handleOpenXRead}
          >
            <Text style={styles.xReadText}>⇄ X-Read (Switch)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, styles.zReadBtn]}
            onPress={handleOpenZRead}
          >
            <Text style={styles.zReadText}>🛑 Z-Read (Close)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setHistoryModalVisible(true)}
          >
            <Text style={styles.headerActionText}>📜 Archive</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, styles.returnBtn]}
            onPress={() => setReturnModalVisible(true)}
          >
            <Text style={styles.returnBtnText}>↩ Return (F7)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setBackupModalVisible(true)}
          >
            <Text style={styles.headerActionText}>💾 Backup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setHardwareModalVisible(true)}
          >
            <Text style={styles.headerActionText}>⚙ Xprinter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.drawerBtn} onPress={handleOpenDrawer}>
            <Text style={styles.drawerBtnText}>💵 Drawer</Text>
          </TouchableOpacity>

          <View style={styles.cashierInfo}>
            <Text style={styles.cashierName}>{currentShift?.cashierName || currentUser?.fullName}</Text>
            <Text style={styles.cashierRole}>{currentUser?.role}</Text>
          </View>
        </View>
      </View>

      {/* Main Split Layout */}
      <View style={styles.mainWorkspace}>
        {/* Left 62%: Catalog, Barcode Scanner, and Categories */}
        <View style={styles.catalogSection}>
          {/* Barcode & Search Controls */}
          <View style={styles.searchContainer}>
            <View style={styles.barcodeBox}>
              <TextInput
                style={styles.barcodeInput}
                placeholder="Scan / Type Barcode or Member ID..."
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRibbon}>
            {categories.map((cat) => (
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

        {/* Right 38%: Active Cart, Financials & Actions */}
        <View style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <View>
              <Text style={styles.cartTitle}>Active Ticket ({items.length} items)</Text>
              {customerName ? (
                <Text style={styles.customerBadge}>👤 Member / Customer: {customerName}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={clearCart} disabled={items.length === 0}>
              <Text style={[styles.clearCartBtn, items.length === 0 && styles.disabledText]}>
                Clear Cart
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cart Items List */}
          <ScrollView style={styles.cartList}>
            {items.length === 0 ? (
              <View style={styles.emptyCartContainer}>
                <Text style={styles.emptyCartText}>Cart is empty</Text>
                <Text style={styles.emptyCartSub}>
                  Scan product or member card, or tap item on the left to start sale
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

          {/* Financial Breakdown */}
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
                      {discountType === DiscountType.SENIOR_PWD
                        ? 'SENIOR/PWD 20%'
                        : `${discountValue}%`}
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

          {/* Action Bar — Professional Retail POS */}
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
                  {
                    text: 'Void',
                    style: 'destructive',
                    onPress: () => {
                      clearCart();
                      recordVoid();
                    },
                  },
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

      {/* Modals Suite */}
      <QuickAddProductModal
        visible={quickAddModalVisible}
        initialBarcode={pendingAddBarcode}
        onClose={() => setQuickAddModalVisible(false)}
        onProductAdded={(newProd) => addItem(newProd)}
      />

      <MemberManagementModal
        visible={memberModalVisible}
        onClose={() => setMemberModalVisible(false)}
        onSelectMember={(m: Member) => setCustomerInfo(m.fullName)}
      />

      <ShiftReadingModal
        visible={readingModalVisible}
        type={readingType}
        onClose={() => setReadingModalVisible(false)}
        onShiftClosed={() => {
          if (onSwitchCashier) onSwitchCashier();
        }}
      />

      <ShiftHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
      />

      <HardwareSettingsModal
        visible={hardwareModalVisible}
        onClose={() => setHardwareModalVisible(false)}
      />

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
        products={products}
        onClose={() => setPriceCheckModalVisible(false)}
        onAddToCart={(p) => addItem(p)}
      />

      <ReturnModal
        visible={returnModalVisible}
        onClose={() => setReturnModalVisible(false)}
      />

      <BackupModal
        visible={backupModalVisible}
        onClose={() => setBackupModalVisible(false)}
      />

      <SyncStatusModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
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
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    height: 58,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandTitle: { color: '#38BDF8', fontSize: 17, fontWeight: 'bold' },
  terminalBadge: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  bypassBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
  },
  bypassBtnActive: {
    backgroundColor: '#78350F',
    borderColor: '#F59E0B',
  },
  bypassText: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold' },
  bypassTextActive: { color: '#FCD34D' },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  syncBadgeSynced: { backgroundColor: '#064E3B', borderColor: '#10B981' },
  syncBadgePending: { backgroundColor: '#78350F', borderColor: '#F59E0B' },
  syncBadgeOffline: { backgroundColor: '#7F1D1D', borderColor: '#EF4444' },
  syncBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerActionBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerActionText: { color: '#CBD5E1', fontSize: 11, fontWeight: '600' },
  addProdBtn: { backgroundColor: '#065F46', borderColor: '#10B981' },
  addProdText: { color: '#6EE7B7', fontSize: 11, fontWeight: 'bold' },
  memberBtn: { backgroundColor: '#4C1D95', borderColor: '#8B5CF6' },
  memberBtnText: { color: '#DDD6FE', fontSize: 11, fontWeight: 'bold' },
  xReadBtn: { backgroundColor: '#1E3A8A', borderColor: '#3B82F6' },
  xReadText: { color: '#93C5FD', fontSize: 11, fontWeight: 'bold' },
  zReadBtn: { backgroundColor: '#7F1D1D', borderColor: '#EF4444' },
  zReadText: { color: '#FCA5A5', fontSize: 11, fontWeight: 'bold' },
  returnBtn: { backgroundColor: '#7C2D12', borderColor: '#EA580C' },
  returnBtnText: { color: '#FFEDD5', fontSize: 11, fontWeight: 'bold' },
  drawerBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  drawerBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  cashierInfo: { alignItems: 'flex-end', marginLeft: 6 },
  cashierName: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },
  cashierRole: { color: '#64748B', fontSize: 10 },
  mainWorkspace: { flex: 1, flexDirection: 'row' },
  catalogSection: {
    flex: 62,
    borderRightWidth: 1,
    borderRightColor: '#334155',
    padding: 10,
  },
  searchContainer: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  barcodeBox: {
    flex: 1.2,
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284C7',
    overflow: 'hidden',
  },
  barcodeInput: { flex: 1, height: 40, paddingHorizontal: 10, color: '#FFFFFF', fontSize: 13 },
  addBarcodeBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBarcodeBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 13,
  },
  categoryRibbon: { maxHeight: 40, marginBottom: 8 },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    borderRadius: 18,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
  },
  categoryTabActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  categoryTabText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  categoryTabTextActive: { color: '#FFFFFF' },
  gridContent: { paddingBottom: 20 },
  productCard: {
    flex: 1 / 3,
    backgroundColor: '#1E293B',
    margin: 3,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    height: 105,
    justifyContent: 'space-between',
  },
  productName: { color: '#F8FAFC', fontSize: 12, fontWeight: 'bold' },
  productSku: { color: '#64748B', fontSize: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  productPrice: { color: '#38BDF8', fontSize: 15, fontWeight: 'bold' },
  productUom: { color: '#94A3B8', fontSize: 10 },
  cartSection: { flex: 38, backgroundColor: '#0F172A', display: 'flex', flexDirection: 'column' },
  cartHeader: {
    padding: 10,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  cartTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold' },
  customerBadge: { color: '#A78BFA', fontSize: 11, fontWeight: '600', marginTop: 2 },
  clearCartBtn: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  disabledText: { color: '#475569' },
  cartList: { flex: 1, padding: 6 },
  emptyCartContainer: { paddingVertical: 50, alignItems: 'center' },
  emptyCartText: { color: '#64748B', fontSize: 15, fontWeight: 'bold' },
  emptyCartSub: {
    color: '#475569',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 8,
    borderRadius: 6,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cartItemInfo: { flex: 1 },
  cartItemName: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },
  cartItemUnitPrice: { color: '#94A3B8', fontSize: 10, marginTop: 1 },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    paddingHorizontal: 4,
    marginHorizontal: 6,
  },
  qtyBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  qtyBtnText: { color: '#38BDF8', fontSize: 15, fontWeight: 'bold' },
  qtyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 18,
    textAlign: 'center',
  },
  cartItemTotal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    minWidth: 55,
    textAlign: 'right',
  },
  deleteBtn: { marginLeft: 6, padding: 4 },
  deleteBtnText: { color: '#EF4444', fontSize: 12, fontWeight: 'bold' },
  cartSummary: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  summaryLabel: { color: '#94A3B8', fontSize: 11 },
  summaryValue: { color: '#F8FAFC', fontSize: 11, fontWeight: '600' },
  summaryLabelSm: { color: '#64748B', fontSize: 10 },
  summaryValueSm: { color: '#94A3B8', fontSize: 10 },
  summaryLabelSub: { color: '#64748B', fontSize: 10 },
  summaryValueSub: { color: '#94A3B8', fontSize: 10 },
  textDiscount: { color: '#10B981' },
  discountBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountBadgeText: { color: '#6EE7B7', fontSize: 8, fontWeight: 'bold' },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 4,
    paddingTop: 4,
    alignItems: 'center',
  },
  totalLabel: { color: '#38BDF8', fontSize: 13, fontWeight: 'bold' },
  totalValue: { color: '#38BDF8', fontSize: 18, fontWeight: 'bold' },
  cartActions: { flexDirection: 'row', padding: 6, backgroundColor: '#0F172A', gap: 5 },
  discountActionBtn: {
    flex: 0.8,
    height: 52,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  discountActionText: { color: '#CBD5E1', fontWeight: 'bold', fontSize: 10, textAlign: 'center' },
  holdActionBtn: {
    flex: 0.7,
    height: 52,
    backgroundColor: '#1D4ED8',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdActionText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  voidActionBtn: {
    flex: 0.6,
    height: 52,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voidActionText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  payBtn: {
    flex: 1.5,
    height: 52,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnLabel: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  payBtnAmount: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { backgroundColor: '#334155', opacity: 0.6 },
});
