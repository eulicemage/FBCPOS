import React, { useState, useRef, useCallback } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, ScrollView, Alert, Image, Platform, StatusBar,
} from "react-native";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { useProductStore } from "../store/productStore";
import { useMemberStore } from "../store/memberStore";
import { useShiftStore } from "../store/shiftStore";
import { useHardwareStore } from "../store/hardwareStore";
import { useHeldCartStore, HeldCart } from "../store/heldCartStore";
import { usePermissionStore, FeatureKey } from "../store/permissionStore";
import { useDrawerStore } from "../store/drawerStore";
import { useSyncQueueStore } from "../store/syncQueueStore";
import { Product, DiscountType } from "../../../shared/src";

// Modals (existing)
import { DiscountModal } from "../components/DiscountModal";
import { HeldCartsModal } from "../components/HeldCartsModal";
import { PriceCheckModal } from "../components/PriceCheckModal";
import { QuantityModal } from "../components/QuantityModal";
import { CalculatorModal } from "../components/CalculatorModal";
import { SupervisorPinModal } from "../components/SupervisorPinModal";
import { QuickAddProductModal } from "../components/QuickAddProductModal";
import { MemberManagementModal } from "../components/MemberManagementModal";
import { ShiftReadingModal, ReadingType } from "../components/ShiftReadingModal";
import { ShiftHistoryModal } from "../components/ShiftHistoryModal";
import { HardwareSettingsModal } from "../components/HardwareSettingsModal";
import { ReturnModal } from "../components/ReturnModal";
import { BackupModal } from "../components/BackupModal";
import { SyncStatusModal } from "../components/SyncStatusModal";
import { SecurityAuditModal } from "../components/SecurityAuditModal";
import { useSecurityAuditStore } from "../store/securityAuditStore";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";

// ─── Color Palette ─────────────────────────────────────────────
const C = {
  navy:       "#1a2340",
  navyDark:   "#141a2e",
  navySide:   "#1e2d50",
  green:      "#2d7a2d",
  greenLight: "#e8f5e9",
  orange:     "#e05020",
  yellow:     "#f5c518",
  white:      "#ffffff",
  gray100:    "#f5f7fa",
  gray200:    "#e8ecf0",
  gray400:    "#9aa5b4",
  gray600:    "#4a5568",
  red:        "#c62828",
  blue:       "#1565c0",
  amber:      "#f57f17",
};

type PriceMode = "RETAIL" | "WHOLESALE";

interface POSScreenProps {
  onNavigateToCheckout?: () => void;
  onSwitchCashier?: () => void;
  onOpenMore?: () => void;
}

export const POSScreen: React.FC<POSScreenProps> = ({
  onNavigateToCheckout,
  onSwitchCashier,
  onOpenMore,
}) => {
  const { currentUser, isBypassMode, toggleBypassMode } = useAuthStore();
  const { canAccess, sessionBypassActive, activateSessionBypass, deactivateSessionBypass } =
    usePermissionStore();
  const { getPendingCount } = useSyncQueueStore();

  const {
    items, discountType, discountValue, customerName,
    addItem, updateQuantity, removeItem, applyDiscount,
    setCustomerInfo, clearCart, loadCart,
    getSubtotal, getDiscountAmount, getTaxAmount, getTotalAmount,
  } = useCartStore();

  const { products, findProductByBarcode } = useProductStore();
  const { findMemberByBarcode } = useMemberStore();
  const { currentShift, recordVoid } = useShiftStore();
  const { kickCashDrawer } = useHardwareStore();
  const { heldCarts, holdCart } = useHeldCartStore();

  const [priceMode, setPriceMode] = useState<PriceMode>("RETAIL");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const barcodeRef = useRef<TextInput>(null);

  // Modal states
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [discountItemMode, setDiscountItemMode] = useState(false);
  const [heldCartsModalVisible, setHeldCartsModalVisible] = useState(false);
  const [priceCheckModalVisible, setPriceCheckModalVisible] = useState(false);
  const [priceCheckQuery, setPriceCheckQuery] = useState("");
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [calculatorModalVisible, setCalculatorModalVisible] = useState(false);
  const [supervisorModalVisible, setSupervisorModalVisible] = useState(false);
  const [quickAddModalVisible, setQuickAddModalVisible] = useState(false);
  const [pendingAddBarcode, setPendingAddBarcode] = useState("");
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [readingModalVisible, setReadingModalVisible] = useState(false);
  const [readingType, setReadingType] = useState<ReadingType>("X_READ");
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [hardwareModalVisible, setHardwareModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const userRoleId = (() => {
    if (!currentUser) return "role-cashier";
    switch (currentUser.role) {
      case "ADMIN": return "role-programmer";
      case "MANAGER": return "role-manager";
      default: return "role-cashier";
    }
  })();

  const can = useCallback(
    (f: FeatureKey) => sessionBypassActive || isBypassMode || canAccess(userRoleId, f),
    [sessionBypassActive, isBypassMode, canAccess, userRoleId]
  );

  const pendingSync = getPendingCount();

  // ── Barcode scanner hook ──────────────────────────────────────
  const { handleKeyPress } = useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled:
      !discountModalVisible && !heldCartsModalVisible && !priceCheckModalVisible &&
      !quickAddModalVisible && !memberModalVisible && !readingModalVisible && !hardwareModalVisible &&
      !quantityModalVisible && !calculatorModalVisible,
  });

  function handleBarcodeScan(code: string) {
    const cleaned = code.trim();
    if (!cleaned) {
      setPriceCheckQuery("");
      setPriceCheckModalVisible(true);
      return;
    }
    const member = findMemberByBarcode(cleaned);
    if (member) {
      setCustomerInfo(member.fullName);
      Alert.alert("Member Verified", `${member.fullName}\nBalance: ₱${member.currentPointsBalance.toFixed(2)}`);
      setBarcodeInput("");
      return;
    }
    const product = findProductByBarcode(cleaned);
    if (product) {
      addItem(product);
      setBarcodeInput("");
      return;
    }
    const nameMatch = products.find(
      (p) =>
        p.sku.toLowerCase() === cleaned.toLowerCase() ||
        p.name.toLowerCase() === cleaned.toLowerCase()
    );
    if (nameMatch) {
      addItem(nameMatch);
      setBarcodeInput("");
      return;
    }
    setPriceCheckQuery(cleaned);
    setPriceCheckModalVisible(true);
    setBarcodeInput("");
  }

  function handleBarcodeSubmit() {
    handleBarcodeScan(barcodeInput);
  }

  function handleItemVoid(productId: string) {
    if (can("VOID_ITEM")) {
      removeItem(productId);
      recordVoid();
      setSelectedItemId(null);
    } else {
      setPendingAction(() => () => { removeItem(productId); recordVoid(); setSelectedItemId(null); });
      setSupervisorModalVisible(true);
    }
  }

  function handleHold() {
    if (items.length === 0) { Alert.alert("Hold Sale", "Cart is empty."); return; }
    const held = holdCart(items, getSubtotal(), discountType, discountValue, customerName);
    if (held) { clearCart(); Alert.alert("Held", `Ticket ${held.ticketNumber} held.`); }
  }

  function handleSupervisorAuthorized() {
    setSupervisorModalVisible(false);
    if (pendingAction) { pendingAction(); setPendingAction(null); }
  }

  function handleBypassToggle() {
    if (sessionBypassActive) {
      deactivateSessionBypass();
      useSecurityAuditStore.getState().logEvent("BYPASS_DEACTIVATED","HIGH","Session bypass removed",currentUser?.fullName ?? "User");
    } else {
      activateSessionBypass();
      useSecurityAuditStore.getState().logEvent("BYPASS_ACTIVATED","HIGH","Session bypass activated",currentUser?.fullName ?? "User");
    }
  }

  function handleSwitchCashier() {
    setReadingType("X_READ");
    setReadingModalVisible(true);
    if (onSwitchCashier) onSwitchCashier();
  }

  const orderNo = currentShift?.shiftNumber ?? "0001";
  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const tax = getTaxAmount();
  const total = getTotalAmount();

  // ─── Sync badge ──────────────────────────────────────────────
  const syncLabel = pendingSync > 0 ? `⚠ ${pendingSync}` : "✓ Synced";
  const syncColor = pendingSync > 0 ? C.amber : C.green;

  // ─── Cart row renderer ────────────────────────────────────────
  const renderCartRow = ({ item, index }: { item: any; index: number }) => {
    const isSelected = item.productId === selectedItemId;
    const price = priceMode === "WHOLESALE" ? (item.unitPrice * 0.9) : item.unitPrice;
    const lineTotal = price * item.quantity;
    return (
      <TouchableOpacity
        onPress={() => setSelectedItemId(isSelected ? null : item.productId)}
        style={[styles.cartRow, index % 2 === 1 && styles.cartRowAlt, isSelected && styles.cartRowSelected]}
      >
        <Text style={[styles.cartCell, styles.cellQty]}>{item.quantity}</Text>
        <Text style={[styles.cartCell, styles.cellName]} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.cartCell, styles.cellType]}>Product</Text>
        <Text style={[styles.cartCell, styles.cellPrice]}>₱{price.toFixed(2)}</Text>
        <Text style={[styles.cartCell, styles.cellDisc, { color: C.green }]}>₱0.00</Text>
        <Text style={[styles.cartCell, styles.cellTotal]}>₱{lineTotal.toFixed(2)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navyDark} />

      {/* ─── HEADER ────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoF}>f</Text>
          <Text style={styles.logoB}>b</Text>
          <Text style={styles.logoC}>c</Text>
          <View style={styles.logoTextWrap}>
            <Text style={styles.logoPOS}>FOOD BASKETS</Text>
            <Text style={styles.logoSub}>POINT OF SALE</Text>
          </View>
        </View>

        {/* Barcode / Search input */}
        <View style={styles.barcodeWrap}>
          <TextInput
            ref={barcodeRef}
            style={styles.barcodeInput}
            value={barcodeInput}
            onChangeText={setBarcodeInput}
            onSubmitEditing={handleBarcodeSubmit}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key)}
            placeholder="Scan barcode or search products..."
            placeholderTextColor={C.gray400}
            returnKeyType="search"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.lookupBtn} onPress={handleBarcodeSubmit}>
            <Text style={styles.lookupBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Right info & status chips */}
        <View style={styles.headerRight}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTime}>
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
            </Text>
          </View>
          <View style={styles.headerPillsRow}>
            <View style={styles.cashierBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.cashierBadgeText}>{currentUser?.fullName ?? "Cashier"}</Text>
            </View>
            <TouchableOpacity style={styles.syncBadge} onPress={() => setSyncModalVisible(true)}>
              <View style={[styles.statusDot, { backgroundColor: syncColor }]} />
              <Text style={[styles.syncBadgeText, { color: syncColor }]}>{syncLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.overrideBtn, (sessionBypassActive || isBypassMode) && styles.overrideBtnActive]}
              onPress={handleBypassToggle}
            >
              <Text style={[styles.overrideBtnText, (sessionBypassActive || isBypassMode) && styles.overrideBtnTextActive]}>
                {sessionBypassActive || isBypassMode ? "Override On" : "Override"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── BODY (3 columns) ────────────────────────────────── */}
      <View style={styles.body}>

        {/* ─── LEFT SIDEBAR ─────────────────────────────────── */}
        <View style={styles.sidebar}>
          <NavButton label="Register" active onPress={() => {}} />
          <NavButton label="Shift Handover" onPress={handleSwitchCashier} />
          <NavButton label="Calculator" onPress={() => setCalculatorModalVisible(true)} />
          <NavButton label="More Hub" onPress={onOpenMore} />

          <View style={styles.divider} />
          <View style={styles.sidebarShortcuts}>
            <Text style={styles.shortcutHeader}>HOTKEYS</Text>
            <Text style={styles.shortcutItem}>F11 · Override</Text>
            <Text style={styles.shortcutItem}>Ctrl+P · Payment</Text>
            <Text style={styles.shortcutItem}>Ctrl+Q · Quantity</Text>
            <Text style={styles.shortcutItem}>Ctrl+V · Void Item</Text>
            <Text style={styles.shortcutItem}>F4 · Cancel</Text>
            <Text style={styles.shortcutItem}>F3 · Refund</Text>
          </View>

          <View style={{ flex: 1 }} />
          <View style={styles.sidebarFooter}>
            <Text style={styles.versionText}>FoodBaskets POS v1.0</Text>
          </View>
        </View>

        {/* ─── CENTER CART ──────────────────────────────────── */}
        <View style={styles.cartArea}>
          {/* Table header */}
          <View style={styles.cartHeader}>
            <Text style={[styles.cartHeaderCell, styles.cellQty]}>Qty</Text>
            <Text style={[styles.cartHeaderCell, styles.cellName]}>Item Description</Text>
            <Text style={[styles.cartHeaderCell, styles.cellType]}>Type</Text>
            <Text style={[styles.cartHeaderCell, styles.cellPrice]}>Price</Text>
            <Text style={[styles.cartHeaderCell, styles.cellDisc]}>Disc</Text>
            <Text style={[styles.cartHeaderCell, styles.cellTotal]}>Total</Text>
          </View>

          {/* Cart rows */}
          {items.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartTitle}>Register Ready</Text>
              <Text style={styles.emptyCartText}>Scan a barcode or enter an item above</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.productId}
              renderItem={renderCartRow}
              style={{ flex: 1 }}
            />
          )}

          {/* Cart summary strip */}
          <View style={styles.cartSummaryStrip}>
            <View style={{ flex: 1 }} />
            <Text style={styles.stripLabel}>Subtotal</Text>
            <Text style={styles.stripValue}>₱{subtotal.toFixed(2)}</Text>
            {discount > 0 && (
              <>
                <Text style={[styles.stripLabel, { marginLeft: 16, color: C.green }]}>Discount</Text>
                <Text style={[styles.stripValue, { color: C.green }]}>-₱{discount.toFixed(2)}</Text>
              </>
            )}
            <Text style={[styles.stripLabel, { marginLeft: 16 }]}>Tax (12%)</Text>
            <Text style={styles.stripValue}>₱{tax.toFixed(2)}</Text>
          </View>
        </View>

        {/* ─── RIGHT ORDER PANEL ──────────────────────────── */}
        <View style={styles.orderPanel}>
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Price Tier Toggle */}
            <View style={styles.priceModeWrap}>
              <Text style={styles.panelLabel}>PRICE TIER</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segTab, priceMode === "RETAIL" && styles.segTabActive]}
                  onPress={() => setPriceMode("RETAIL")}
                >
                  <Text style={[styles.segTabText, priceMode === "RETAIL" && styles.segTabTextActive]}>Retail</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segTab, priceMode === "WHOLESALE" && styles.segTabActive, !can("PRICE_MODE_WHOLESALE") && styles.disabledBtn]}
                  onPress={() => can("PRICE_MODE_WHOLESALE") ? setPriceMode("WHOLESALE") : Alert.alert("Access Denied", "Wholesale tier requires supervisor override.")}
                >
                  <Text style={[styles.segTabText, priceMode === "WHOLESALE" && styles.segTabTextActive]}>Wholesale</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Action Grid */}
            <View style={styles.actionGrid}>
              <ActionBtn label="Discount" sublabel="Ctrl+2" color={C.amber} disabled={!can("DISCOUNT_TRANSACTION")}
                onPress={() => { setDiscountItemMode(false); setDiscountModalVisible(true); }} />
              <ActionBtn label="Line Disc" sublabel="Ctrl+1" color={C.blue} disabled={!can("DISCOUNT_ITEM")}
                onPress={() => { setDiscountItemMode(true); setDiscountModalVisible(true); }} />
              <ActionBtn label="Customer" sublabel="Ctrl+C" color={C.blue} disabled={!can("CUSTOMER_ASSIGN")}
                onPress={() => setMemberModalVisible(true)} />
              <ActionBtn label="Quantity" sublabel="Ctrl+Q" color={C.blue} disabled={!can("QUANTITY_CHANGE")}
                onPress={() => {
                  if (!selectedItemId) { Alert.alert("Select Item", "Select an item from the cart first."); return; }
                  setQuantityModalVisible(true);
                }} />
            </View>

            <TouchableOpacity
              style={[styles.voidBtn, !can("VOID_ITEM") && styles.disabledBtn]}
              onPress={() => {
                if (!selectedItemId) { Alert.alert("Select Item", "Select an item to void."); return; }
                handleItemVoid(selectedItemId);
              }}
            >
              <Text style={styles.voidBtnText}>Void Selected Item (Ctrl+V)</Text>
            </TouchableOpacity>

            {/* Order Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ticket</Text>
                <Text style={styles.summaryValue}>{orderNo}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Items</Text>
                <Text style={styles.summaryValue}>{items.reduce((s, i) => s + i.quantity, 0)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: C.green }]}>-₱{discount.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.summaryDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Due</Text>
                <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
              </View>
            </View>

            {/* Secondary Controls */}
            <View style={styles.miniGrid}>
              <MiniBtn label="Hold" color={C.blue} disabled={!can("HOLD_CART")} onPress={handleHold} />
              <MiniBtn label="Recall" color={C.blue} disabled={!can("RETRIEVE_CART")} onPress={() => setHeldCartsModalVisible(true)} />
              <MiniBtn label="Refund" color={C.orange} disabled={!can("REFUND")} onPress={() => setReturnModalVisible(true)} />
              <MiniBtn label="Cancel" color={C.red} disabled={!can("CANCEL_TRANSACTION")} onPress={() => { if (items.length > 0) { clearCart(); Alert.alert("Cancelled", "Transaction cancelled."); } }} />
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.payBtn, items.length === 0 && styles.disabledBtn]}
              disabled={items.length === 0}
              onPress={() => { if (items.length > 0 && onNavigateToCheckout) onNavigateToCheckout(); }}
            >
              <Text style={styles.payBtnText}>Pay  ₱{total.toFixed(2)}</Text>
              <Text style={styles.payBtnSub}>Ctrl+P</Text>
            </TouchableOpacity>

            {/* Delivery Order Button */}
            <TouchableOpacity
              style={styles.deliverBtn}
              onPress={() => Alert.alert("Delivery", "Record Delivery Report (DR) flow.")}
            >
              <Text style={styles.deliverBtnText}>Delivery Receipt (DR)</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>

      {/* ─── MODALS ───────────────────────────────────────────── */}
      <DiscountModal visible={discountModalVisible} onClose={() => setDiscountModalVisible(false)} onApplyDiscount={(type: DiscountType, value: number) => { applyDiscount(type, value); setDiscountModalVisible(false); }} />
      <HeldCartsModal visible={heldCartsModalVisible} onClose={() => setHeldCartsModalVisible(false)} onRecallCart={(cart: HeldCart) => { loadCart(cart.items, cart.discountType, cart.discountValue, cart.customerName, cart.customerTinId); setHeldCartsModalVisible(false); }} />
      <PriceCheckModal visible={priceCheckModalVisible} initialQuery={priceCheckQuery} onClose={() => setPriceCheckModalVisible(false)} products={products} onAddToCart={(p: Product) => { addItem(p); setPriceCheckModalVisible(false); }} />
      <QuantityModal visible={quantityModalVisible} initialQuantity={items.find((i) => i.productId === selectedItemId)?.quantity || 1} itemName={items.find((i) => i.productId === selectedItemId)?.name} onClose={() => setQuantityModalVisible(false)} onConfirm={(qty) => { if (selectedItemId) updateQuantity(selectedItemId, qty); }} />
      <CalculatorModal visible={calculatorModalVisible} onClose={() => setCalculatorModalVisible(false)} />
      <SupervisorPinModal visible={supervisorModalVisible} actionTitle="Authorize Action" onAuthorize={() => handleSupervisorAuthorized()} onCancel={() => setSupervisorModalVisible(false)} />
      <QuickAddProductModal visible={quickAddModalVisible} initialBarcode={pendingAddBarcode} onClose={() => setQuickAddModalVisible(false)} onProductAdded={(p: Product) => { addItem(p); setQuickAddModalVisible(false); }} />
      <MemberManagementModal visible={memberModalVisible} onClose={() => setMemberModalVisible(false)} />
      <ShiftReadingModal visible={readingModalVisible} type={readingType} onClose={() => setReadingModalVisible(false)} onShiftClosed={() => { setReadingModalVisible(false); if (readingType === "X_READ" && onSwitchCashier) onSwitchCashier(); }} />
      <ShiftHistoryModal visible={historyModalVisible} onClose={() => setHistoryModalVisible(false)} />
      <HardwareSettingsModal visible={hardwareModalVisible} onClose={() => setHardwareModalVisible(false)} />
      <ReturnModal visible={returnModalVisible} onClose={() => setReturnModalVisible(false)} />
      <BackupModal visible={backupModalVisible} onClose={() => setBackupModalVisible(false)} />
      <SyncStatusModal visible={syncModalVisible} onClose={() => setSyncModalVisible(false)} />
      <SecurityAuditModal visible={auditModalVisible} onClose={() => setAuditModalVisible(false)} />
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────
const NavButton: React.FC<{ label: string; active?: boolean; onPress?: () => void }> =
  ({ label, active, onPress }) => (
    <TouchableOpacity style={[styles.navBtn, active && styles.navBtnActive]} onPress={onPress}>
      <Text style={[styles.navBtnLabel, active && styles.navBtnLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );

const ActionBtn: React.FC<{ label: string; sublabel: string; color: string; disabled?: boolean; onPress: () => void }> =
  ({ label, sublabel, color, disabled, onPress }) => (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: disabled ? "#5a6478" : color }, disabled && styles.disabledBtn]} onPress={onPress} disabled={disabled}>
      <Text style={styles.actionBtnLabel}>{label}</Text>
      <Text style={styles.actionBtnSub}>{sublabel}</Text>
    </TouchableOpacity>
  );

const MiniBtn: React.FC<{ label: string; color: string; disabled?: boolean; onPress: () => void }> =
  ({ label, color, disabled, onPress }) => (
    <TouchableOpacity style={[styles.miniBtn, { borderColor: disabled ? C.gray400 : color }, disabled && styles.disabledBtn]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.miniBtnText, { color: disabled ? C.gray400 : color }]}>{label}</Text>
    </TouchableOpacity>
  );

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  // Header
  header: { flexDirection: "row", alignItems: "center", backgroundColor: C.navyDark, paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  logoWrap: { flexDirection: "row", alignItems: "center" },
  logoF: { fontSize: 26, fontWeight: "900", color: "#2d7a2d" },
  logoB: { fontSize: 26, fontWeight: "900", color: "#e05020" },
  logoC: { fontSize: 26, fontWeight: "900", color: "#f5c518" },
  logoTextWrap: { marginLeft: 8 },
  logoPOS: { fontSize: 13, fontWeight: "800", color: C.white, letterSpacing: 0.5 },
  logoSub: { fontSize: 8, color: C.gray400, letterSpacing: 1 },
  barcodeWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 12, marginHorizontal: 8, height: 42 },
  barcodeInput: { flex: 1, height: 42, fontSize: 14, color: C.navyDark },
  lookupBtn: { backgroundColor: C.orange, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 8 },
  lookupBtnText: { color: C.white, fontWeight: "700", fontSize: 12 },
  headerRight: { alignItems: "flex-end", gap: 4 },
  headerTopRow: { flexDirection: "row", alignItems: "center" },
  headerTime: { fontSize: 11, color: C.gray400, fontWeight: "500" },
  headerPillsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cashierBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e2d50", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4caf50", marginRight: 6 },
  cashierBadgeText: { fontSize: 11, color: C.white, fontWeight: "600" },
  syncBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e2d50", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  syncBadgeText: { fontSize: 11, fontWeight: "600" },
  overrideBtn: { borderWidth: 1, borderColor: "#2d3f6a", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  overrideBtnActive: { backgroundColor: C.orange, borderColor: C.orange },
  overrideBtnText: { fontSize: 11, color: C.gray400, fontWeight: "600" },
  overrideBtnTextActive: { color: C.white },

  // Body
  body: { flex: 1, flexDirection: "row" },

  // Sidebar
  sidebar: { width: 170, backgroundColor: C.navySide, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 8 },
  navBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 6, backgroundColor: "#1a2542" },
  navBtnActive: { backgroundColor: C.green },
  navBtnLabel: { fontSize: 13, color: C.gray400, fontWeight: "600" },
  navBtnLabelActive: { color: C.white, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#2d3f6a", marginVertical: 10 },
  sidebarShortcuts: { paddingHorizontal: 4 },
  shortcutHeader: { fontSize: 9, color: C.gray400, letterSpacing: 1, fontWeight: "700", marginBottom: 6 },
  shortcutItem: { fontSize: 10, color: "#8a97ab", marginBottom: 4 },
  sidebarFooter: { alignItems: "center", paddingBottom: 4 },
  versionText: { fontSize: 10, color: "#62718a" },

  // Cart
  cartArea: { flex: 1, backgroundColor: C.gray100, margin: 8, borderRadius: 10, overflow: "hidden" },
  cartHeader: { flexDirection: "row", backgroundColor: "#1f2b48", paddingVertical: 10, paddingHorizontal: 8 },
  cartHeaderCell: { color: C.white, fontWeight: "700", fontSize: 12 },
  cartRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.gray200, backgroundColor: C.white },
  cartRowAlt: { backgroundColor: "#f8fafc" },
  cartRowSelected: { backgroundColor: "#e8f5e9", borderLeftWidth: 3, borderLeftColor: C.green },
  cartCell: { fontSize: 12, color: C.gray600 },
  cellQty: { width: 40, textAlign: "center", fontWeight: "700", color: C.navy },
  cellName: { flex: 1, fontWeight: "500", color: C.navy },
  cellType: { width: 64, textAlign: "center", color: C.gray400 },
  cellPrice: { width: 80, textAlign: "right" },
  cellDisc: { width: 72, textAlign: "right", color: C.green },
  cellTotal: { width: 84, textAlign: "right", fontWeight: "700", color: C.navy },
  emptyCart: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyCartTitle: { fontSize: 16, fontWeight: "700", color: C.navy, marginBottom: 4 },
  emptyCartText: { fontSize: 13, color: C.gray400 },
  cartSummaryStrip: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: C.gray200 },
  stripLabel: { fontSize: 12, color: C.gray600 },
  stripValue: { fontSize: 12, fontWeight: "700", color: C.navyDark, marginLeft: 6 },

  // Right panel
  orderPanel: { width: 290, backgroundColor: C.white, margin: 8, borderRadius: 10, padding: 12 },
  priceModeWrap: { marginBottom: 10 },
  panelLabel: { fontSize: 10, color: C.gray600, letterSpacing: 0.8, fontWeight: "700", marginBottom: 4 },
  segmentedControl: { flexDirection: "row", backgroundColor: C.gray100, borderRadius: 8, padding: 2, borderWidth: 1, borderColor: C.gray200 },
  segTab: { flex: 1, paddingVertical: 6, alignItems: "center", borderRadius: 6 },
  segTabActive: { backgroundColor: C.green },
  segTabText: { fontSize: 12, fontWeight: "600", color: C.gray600 },
  segTabTextActive: { color: C.white, fontWeight: "700" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  actionBtn: { width: "48%", borderRadius: 8, paddingVertical: 9, paddingHorizontal: 6, alignItems: "center" },
  actionBtnLabel: { fontSize: 11, fontWeight: "700", color: C.white },
  actionBtnSub: { fontSize: 9, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  voidBtn: { backgroundColor: "#dc2626", borderRadius: 8, paddingVertical: 9, alignItems: "center", marginBottom: 10 },
  voidBtnText: { fontSize: 11, fontWeight: "700", color: C.white },
  summaryCard: { backgroundColor: C.gray100, borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: C.gray200 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: C.gray600 },
  summaryValue: { fontSize: 12, fontWeight: "600", color: C.navyDark },
  summaryDivider: { height: 1, backgroundColor: C.gray200, marginVertical: 6 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 16, fontWeight: "800", color: C.navyDark },
  totalValue: { fontSize: 20, fontWeight: "900", color: C.navyDark },
  miniGrid: { flexDirection: "row", gap: 5, marginBottom: 10 },
  miniBtn: { borderWidth: 1.5, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 4, alignItems: "center", flex: 1 },
  miniBtnText: { fontSize: 10, fontWeight: "700" },
  payBtn: { backgroundColor: C.green, borderRadius: 8, paddingVertical: 12, alignItems: "center", marginBottom: 6 },
  payBtnText: { color: C.white, fontWeight: "800", fontSize: 16 },
  payBtnSub: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 1 },
  deliverBtn: { backgroundColor: "#1e2d50", borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  deliverBtnText: { color: C.white, fontWeight: "600", fontSize: 12 },
  disabledBtn: { opacity: 0.45 },
});
