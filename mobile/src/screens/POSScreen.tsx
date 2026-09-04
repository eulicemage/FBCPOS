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
      !quickAddModalVisible && !memberModalVisible && !readingModalVisible && !hardwareModalVisible,
  });

  function handleBarcodeScan(code: string) {
    const cleaned = code.trim();
    if (!cleaned) return;
    const member = findMemberByBarcode(cleaned);
    if (member) {
      setCustomerInfo(member.fullName);
      Alert.alert("👤 Member Identified", `${member.fullName}\nBalance: ₱${member.currentPointsBalance.toFixed(2)}`);
      setBarcodeInput("");
      return;
    }
    const product = findProductByBarcode(cleaned);
    if (product) {
      addItem(product);
      setBarcodeInput("");
    } else {
      Alert.alert(
        "Barcode Not Found",
        `No product for barcode "${cleaned}". Add it now?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Product", onPress: () => { setPendingAddBarcode(cleaned); setQuickAddModalVisible(true); } },
        ]
      );
    }
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
            <Text style={styles.logoPOS}>POS</Text>
            <Text style={styles.logoSub}>FOOD BASKETS CORPORATION</Text>
          </View>
        </View>

        {/* Barcode input */}
        <View style={styles.barcodeWrap}>
          <Text style={styles.barcodeIcon}>▐▌▌▐▌</Text>
          <TextInput
            ref={barcodeRef}
            style={styles.barcodeInput}
            value={barcodeInput}
            onChangeText={setBarcodeInput}
            onSubmitEditing={handleBarcodeSubmit}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key)}
            placeholder="Scan or type barcode..."
            placeholderTextColor={C.gray400}
            returnKeyType="search"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.lookupBtn} onPress={handleBarcodeSubmit}>
            <Text style={styles.lookupBtnText}>ITEM LOOKUP</Text>
          </TouchableOpacity>
        </View>

        {/* Right info */}
        <View style={styles.headerRight}>
          <Text style={styles.headerTime}>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}  {new Date().toLocaleDateString("en-PH", { month:"short", day:"numeric", year:"numeric" })}</Text>
          <View style={styles.cashierRow}>
            <Text style={styles.cashierName}>{currentUser?.fullName ?? "Cashier"}</Text>
            <View style={styles.cashierBadge}><View style={styles.greenDot}/><Text style={styles.cashierBadgeText}>{currentUser?.role ?? "Cashier"}</Text></View>
          </View>
          <View style={styles.headerMeta}>
            <Text style={[styles.syncBadge, { color: syncColor }]}>{syncLabel}</Text>
            <TouchableOpacity style={styles.bypassBtn} onPress={handleBypassToggle}>
              <Text style={styles.bypassBtnText}>{sessionBypassActive || isBypassMode ? "🔓" : "🔒"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── BODY (3 columns) ────────────────────────────────── */}
      <View style={styles.body}>

        {/* ─── LEFT SIDEBAR ─────────────────────────────────── */}
        <View style={styles.sidebar}>
          <NavButton icon="🛒" label="Order" active onPress={() => {}} />
          <NavButton icon="⇄" label="Switch Cashier" onPress={handleSwitchCashier} />
          <NavButton icon="🖩" label="Calculator" onPress={() => Alert.alert("Calculator", "Calculator opens here.")} />
          <NavButton icon="•••" label="More" onPress={onOpenMore} />

          <View style={styles.divider} />
          <Text style={styles.shortcutLabel}>SHORTCUTS</Text>
          <TouchableOpacity onPress={handleBypassToggle}>
            <Text style={styles.shortcutLink}>{sessionBypassActive || isBypassMode ? "REMOVE BYPASS (F12)" : "USER BYPASS (F11)"}</Text>
          </TouchableOpacity>
          {(sessionBypassActive || isBypassMode) && (
            <TouchableOpacity onPress={() => { deactivateSessionBypass(); toggleBypassMode(false); }}>
              <Text style={[styles.shortcutLink, { color: C.red }]}>REMOVE BYPASS (F12)</Text>
            </TouchableOpacity>
          )}

          <View style={{ flex: 1 }} />
          <View style={styles.sidebarFooter}>
            <Text style={styles.logoF}>f</Text>
            <Text style={styles.logoB}>b</Text>
            <Text style={styles.logoC}>c</Text>
            <Text style={styles.versionText}> v1.0</Text>
          </View>
        </View>

        {/* ─── CENTER CART ──────────────────────────────────── */}
        <View style={styles.cartArea}>
          {/* Table header */}
          <View style={styles.cartHeader}>
            <Text style={[styles.cartHeaderCell, styles.cellQty]}>Qty</Text>
            <Text style={[styles.cartHeaderCell, styles.cellName]}>Product Name</Text>
            <Text style={[styles.cartHeaderCell, styles.cellType]}>Type</Text>
            <Text style={[styles.cartHeaderCell, styles.cellPrice]}>Unit Price</Text>
            <Text style={[styles.cartHeaderCell, styles.cellDisc]}>Discount</Text>
            <Text style={[styles.cartHeaderCell, styles.cellTotal]}>Total</Text>
          </View>

          {/* Cart rows */}
          {items.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartIcon}>🛒</Text>
              <Text style={styles.emptyCartText}>Scan a product to begin</Text>
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
            <Text style={[styles.stripLabel, { marginLeft: 16, color: C.green }]}>Discount</Text>
            <Text style={[styles.stripValue, { color: C.green }]}>-₱{discount.toFixed(2)}</Text>
            <Text style={[styles.stripLabel, { marginLeft: 16 }]}>Tax (12%)</Text>
            <Text style={styles.stripValue}>₱{tax.toFixed(2)}</Text>
          </View>
        </View>

        {/* ─── RIGHT ORDER PANEL ──────────────────────────── */}
        <View style={styles.orderPanel}>
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* PRICE MODE */}
            <Text style={styles.panelLabel}>PRICE MODE:</Text>
            <View style={styles.priceModeRow}>
              <TouchableOpacity
                style={[styles.pricePill, priceMode === "RETAIL" && styles.pricePillActive]}
                onPress={() => setPriceMode("RETAIL")}
              >
                <Text style={[styles.pricePillText, priceMode === "RETAIL" && styles.pricePillTextActive]}>RETAIL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pricePill, priceMode === "WHOLESALE" && styles.pricePillActive, !can("PRICE_MODE_WHOLESALE") && styles.disabledBtn]}
                onPress={() => can("PRICE_MODE_WHOLESALE") ? setPriceMode("WHOLESALE") : Alert.alert("Access Denied", "Wholesale pricing requires Supervisor access.")}
              >
                <Text style={[styles.pricePillText, priceMode === "WHOLESALE" && styles.pricePillTextActive]}>WHOLESALE</Text>
              </TouchableOpacity>
            </View>

            {/* Action buttons grid */}
            <View style={styles.actionGrid}>
              <ActionBtn label="DISCOUNT" sublabel="CTRL+2" color={C.amber} disabled={!can("DISCOUNT_TRANSACTION")}
                onPress={() => { setDiscountItemMode(false); setDiscountModalVisible(true); }} />
              <ActionBtn label="DISCOUNT ITEM" sublabel="CTRL+1" color={C.blue} disabled={!can("DISCOUNT_ITEM")}
                onPress={() => { setDiscountItemMode(true); setDiscountModalVisible(true); }} />
              <ActionBtn label="CUSTOMER" sublabel="CTRL+C" color={C.blue} disabled={!can("CUSTOMER_ASSIGN")}
                onPress={() => setMemberModalVisible(true)} />
              <ActionBtn label="QUANTITY" sublabel="CTRL+Q" color={C.blue} disabled={!can("QUANTITY_CHANGE")}
                onPress={() => {
                  if (!selectedItemId) { Alert.alert("Select Item", "Tap an item in the cart first."); return; }
                  Alert.prompt?.("Quantity", "Enter new quantity:", (v) => {
                    const q = parseInt(v ?? "");
                    if (!isNaN(q) && q > 0) updateQuantity(selectedItemId, q);
                  });
                }} />
            </View>
            <TouchableOpacity
              style={[styles.voidBtn, !can("VOID_ITEM") && styles.disabledBtn]}
              onPress={() => {
                if (!selectedItemId) { Alert.alert("Select Item", "Tap an item to void it."); return; }
                handleItemVoid(selectedItemId);
              }}
            >
              <Text style={styles.voidBtnText}>VOID ITEM (CTRL+V)</Text>
            </TouchableOpacity>

            <View style={styles.panelDivider} />

            {/* ORDER SUMMARY */}
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Order No.</Text><Text style={styles.summaryValue}>{orderNo}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>No. of Items</Text><Text style={styles.summaryValue}>{items.reduce((s,i)=>s+i.quantity,0)}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Discount</Text><Text style={[styles.summaryValue,{color:C.green}]}>-₱{discount.toFixed(2)}</Text></View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
            </View>

            {/* Action row buttons */}
            <View style={styles.miniGrid}>
              <MiniBtn label="REDEEM ITEM" color={C.green} disabled={!can("REDEEM_POINTS")} onPress={() => Alert.alert("Redeem","Redeem points flow.")} />
              <MiniBtn label="CANCEL (F4)" color={C.red} disabled={!can("CANCEL_TRANSACTION")} onPress={() => { if(items.length>0) { clearCart(); Alert.alert("Cancelled","Transaction cancelled."); } }} />
              <MiniBtn label="REFUND (F3)" color={C.orange} disabled={!can("REFUND")} onPress={() => setReturnModalVisible(true)} />
              <MiniBtn label="HOLD (CTRL+K)" color={C.blue} disabled={!can("HOLD_CART")} onPress={handleHold} />
              <MiniBtn label="RETRIEVE" color={C.blue} disabled={!can("RETRIEVE_CART")} onPress={() => setHeldCartsModalVisible(true)} />
            </View>

            {/* PAYMENT */}
            <TouchableOpacity style={styles.payBtn} onPress={() => { if (items.length > 0 && onNavigateToCheckout) onNavigateToCheckout(); }}>
              <Text style={styles.payBtnText}>PAYMENT (CTRL+P)</Text>
              <Text style={styles.payBtnAmount}>₱{total.toFixed(2)}</Text>
            </TouchableOpacity>

            {/* DELIVER */}
            <TouchableOpacity style={styles.deliverBtn} onPress={() => Alert.alert("Deliver","Set Delivery Report # flow.")}>
              <Text style={styles.deliverBtnText}>DELIVER (CTRL+O)</Text>
            </TouchableOpacity>

            {/* Small utilities */}
            <View style={{ height: 8 }} />
            <TouchableOpacity style={styles.utilBtn} onPress={() => setHardwareModalVisible(true)}>
              <Text style={styles.utilBtnText}>⚙ Hardware / Drawer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.utilBtn} onPress={() => setSyncModalVisible(true)}>
              <Text style={styles.utilBtnText}>🔄 Sync Status</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.utilBtn} onPress={() => setAuditModalVisible(true)}>
              <Text style={styles.utilBtnText}>🛡 Security Audit</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* ─── MODALS ───────────────────────────────────────────── */}
      <DiscountModal visible={discountModalVisible} onClose={() => setDiscountModalVisible(false)} onApplyDiscount={(type: DiscountType, value: number) => { applyDiscount(type, value); setDiscountModalVisible(false); }} />
      <HeldCartsModal visible={heldCartsModalVisible} onClose={() => setHeldCartsModalVisible(false)} onRecallCart={(cart: HeldCart) => { loadCart(cart.items, cart.discountType, cart.discountValue, cart.customerName, cart.customerTinId); setHeldCartsModalVisible(false); }} />
      <PriceCheckModal visible={priceCheckModalVisible} onClose={() => setPriceCheckModalVisible(false)} products={products} onAddToCart={(p: Product) => { addItem(p); setPriceCheckModalVisible(false); }} />
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
const NavButton: React.FC<{ icon: string; label: string; active?: boolean; onPress?: () => void }> =
  ({ icon, label, active, onPress }) => (
    <TouchableOpacity style={[styles.navBtn, active && styles.navBtnActive]} onPress={onPress}>
      <Text style={styles.navBtnIcon}>{icon}</Text>
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
  header: { flexDirection: "row", alignItems: "center", backgroundColor: C.navyDark, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  logoWrap: { flexDirection: "row", alignItems: "center" },
  logoF: { fontSize: 28, fontWeight: "900", color: "#2d7a2d" },
  logoB: { fontSize: 28, fontWeight: "900", color: "#e05020" },
  logoC: { fontSize: 28, fontWeight: "900", color: "#f5c518" },
  logoTextWrap: { marginLeft: 4 },
  logoPOS: { fontSize: 14, fontWeight: "700", color: C.white },
  logoSub: { fontSize: 8, color: C.gray400, letterSpacing: 0.5 },
  barcodeWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 10, marginHorizontal: 8 },
  barcodeIcon: { fontSize: 12, color: C.gray400, marginRight: 6, letterSpacing: -2 },
  barcodeInput: { flex: 1, height: 40, fontSize: 15, color: C.navyDark },
  lookupBtn: { backgroundColor: C.orange, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 },
  lookupBtnText: { color: C.white, fontWeight: "700", fontSize: 12 },
  headerRight: { alignItems: "flex-end" },
  headerTime: { fontSize: 12, color: C.white, fontWeight: "600" },
  cashierRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  cashierName: { fontSize: 12, color: C.white },
  cashierBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#243050", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4caf50", marginRight: 4 },
  cashierBadgeText: { fontSize: 10, color: C.white },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  syncBadge: { fontSize: 10, fontWeight: "600" },
  bypassBtn: { backgroundColor: C.orange, borderRadius: 16, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  bypassBtnText: { fontSize: 14 },

  // Body
  body: { flex: 1, flexDirection: "row" },

  // Sidebar
  sidebar: { width: 190, backgroundColor: C.navySide, paddingTop: 8, paddingBottom: 8, paddingHorizontal: 6 },
  navBtn: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 14, marginBottom: 4, backgroundColor: "#243050" },
  navBtnActive: { backgroundColor: C.green },
  navBtnIcon: { fontSize: 18, marginRight: 10 },
  navBtnLabel: { fontSize: 14, color: C.white, fontWeight: "600" },
  navBtnLabelActive: { color: C.white },
  divider: { height: 1, backgroundColor: "#2d3f6a", marginVertical: 8 },
  shortcutLabel: { fontSize: 9, color: C.gray400, letterSpacing: 1, marginBottom: 4, marginLeft: 4 },
  shortcutLink: { fontSize: 11, color: C.gray400, textDecorationLine: "underline", marginBottom: 4, marginLeft: 4 },
  sidebarFooter: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingTop: 8 },
  versionText: { fontSize: 11, color: C.gray400 },

  // Cart
  cartArea: { flex: 1, backgroundColor: C.gray100, margin: 8, borderRadius: 10, overflow: "hidden" },
  cartHeader: { flexDirection: "row", backgroundColor: C.green, paddingVertical: 10, paddingHorizontal: 8 },
  cartHeaderCell: { color: C.white, fontWeight: "700", fontSize: 12 },
  cartRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.gray200 },
  cartRowAlt: { backgroundColor: C.greenLight },
  cartRowSelected: { backgroundColor: "#c8e6c9", borderLeftWidth: 3, borderLeftColor: C.green },
  cartCell: { fontSize: 12, color: C.gray600 },
  cellQty: { width: 36, textAlign: "center" },
  cellName: { flex: 1 },
  cellType: { width: 64, textAlign: "center" },
  cellPrice: { width: 80, textAlign: "right" },
  cellDisc: { width: 72, textAlign: "right" },
  cellTotal: { width: 80, textAlign: "right", fontWeight: "600" },
  emptyCart: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyCartIcon: { fontSize: 48, marginBottom: 8 },
  emptyCartText: { fontSize: 14, color: C.gray400 },
  cartSummaryStrip: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: C.gray200 },
  stripLabel: { fontSize: 12, color: C.gray600 },
  stripValue: { fontSize: 12, fontWeight: "700", color: C.navyDark, marginLeft: 6 },

  // Right panel
  orderPanel: { width: 286, backgroundColor: C.white, margin: 8, borderRadius: 10, padding: 12 },
  panelLabel: { fontSize: 10, color: C.gray400, letterSpacing: 1, marginBottom: 6 },
  priceModeRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  pricePill: { flex: 1, borderRadius: 20, borderWidth: 1.5, borderColor: C.gray400, paddingVertical: 7, alignItems: "center" },
  pricePillActive: { backgroundColor: C.green, borderColor: C.green },
  pricePillText: { fontSize: 12, fontWeight: "700", color: C.gray400 },
  pricePillTextActive: { color: C.white },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  actionBtn: { width: "47%", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center" },
  actionBtnLabel: { fontSize: 11, fontWeight: "700", color: C.white },
  actionBtnSub: { fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  voidBtn: { backgroundColor: "#b71c1c", borderRadius: 8, paddingVertical: 10, alignItems: "center", marginBottom: 6 },
  voidBtnText: { fontSize: 12, fontWeight: "700", color: C.white },
  panelDivider: { height: 1, backgroundColor: C.gray200, marginVertical: 10 },
  summaryTitle: { fontSize: 13, fontWeight: "700", color: C.navyDark, marginBottom: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  summaryLabel: { fontSize: 12, color: C.gray600 },
  summaryValue: { fontSize: 12, fontWeight: "600", color: C.navyDark },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 10 },
  totalLabel: { fontSize: 20, fontWeight: "900", color: C.navyDark },
  totalValue: { fontSize: 22, fontWeight: "900", color: C.navyDark },
  miniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 10 },
  miniBtn: { borderWidth: 1.5, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 6, alignItems: "center", minWidth: "47%", flex: 1 },
  miniBtnText: { fontSize: 10, fontWeight: "700" },
  payBtn: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 6 },
  payBtnText: { color: C.white, fontWeight: "700", fontSize: 14 },
  payBtnAmount: { color: C.white, fontWeight: "900", fontSize: 18 },
  deliverBtn: { backgroundColor: C.blue, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginBottom: 4 },
  deliverBtnText: { color: C.white, fontWeight: "700", fontSize: 13 },
  utilBtn: { paddingVertical: 6, paddingHorizontal: 4, marginBottom: 2 },
  utilBtnText: { fontSize: 11, color: C.gray600 },
  disabledBtn: { opacity: 0.45 },
});
