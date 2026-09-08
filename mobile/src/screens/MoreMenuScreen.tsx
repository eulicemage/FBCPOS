import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  Alert, ScrollView, Switch, Modal,
} from "react-native";
import { useProductStore } from "../store/productStore";
import { useMemberStore } from "../store/memberStore";
import { usePermissionStore } from "../store/permissionStore";
import { useDrawerStore, DrawerEntry } from "../store/drawerStore";
import { useShiftStore } from "../store/shiftStore";
import { useSecurityAuditStore } from "../store/securityAuditStore";
import { useAuthStore } from "../store/authStore";
import { useReturnStore } from "../services/returnService";
import { useMemberGroupStore } from "../store/memberGroupStore";
import { usePaymentMethodStore } from "../store/paymentMethodStore";
import { useHardwareStore } from "../store/hardwareStore";
import { ShiftReadingModal } from "../components/ShiftReadingModal";
import { CalculatorModal } from "../components/CalculatorModal";
import { StoreSettingsScreen } from "./StoreSettingsScreen";
import { StaffSettingsScreen } from "./StaffSettingsScreen";
import { DatabaseBackupScreen } from "./DatabaseBackupScreen";
import { ExcelService } from "../services/excelService";
import { SaleRecord } from "../services/checkoutService";

interface MoreMenuScreenProps {
  onClose: () => void;
  onSwitchCashier?: () => void;
}

const C = {
  navy: "#1a2340",
  navyDark: "#141a2e",
  navySide: "#1e2d50",
  green: "#2d7a2d",
  greenLight: "#e8f5e9",
  orange: "#e05020",
  yellow: "#f5c518",
  white: "#ffffff",
  gray100: "#f5f7fa",
  gray200: "#e8ecf0",
  gray400: "#9aa5b4",
  gray600: "#4a5568",
  red: "#c62828",
  blue: "#1565c0",
  amber: "#f57f17",
};

type ActiveView =
  | "ORDER" | "SWITCH_CASHIER" | "CALCULATOR"
  | "TERMINAL_RECORD" | "TRANSACTION_HISTORY" | "DELIVERY_REPORT" | "STAFF_RECORD"
  | "X_READ_HISTORY" | "Z_READ_HISTORY" | "DISCOUNT_REPORT" | "VOID_REPORT" | "AUDIT_LOGS"
  | "ADD_ENROLL_MEMBER" | "ADD_POINTS" | "ADD_CATEGORY_DIVISION" | "MEMBER_TRANSACTION_HISTORY"
  | "MEMBER_TOPUP_HISTORY" | "MANAGE_DISCOUNTS"
  | "MANAGE_PRODUCTS" | "INVENTORY_PRODUCTS" | "PAY_IN_OUT" | "CLOSE_STORE"
  | "MANAGE_PAYMENT_METHODS" | "DATABASE_MANAGEMENT"
  | "STORE_SETTINGS" | "STAFF_SETTINGS" | "DATABASE_BACKUP";

export const MoreMenuScreen: React.FC<MoreMenuScreenProps> = ({ onClose, onSwitchCashier }) => {
  const [activeView, setActiveView] = useState<ActiveView>("TRANSACTION_HISTORY");

  // Stores
  const { products, addProduct } = useProductStore();
  const { members, addMember, topUpPoints } = useMemberStore();
  const { entries, addPayIn, addPayOut, getNetBalance } = useDrawerStore();
  const { events } = useSecurityAuditStore();
  const { completedShifts, zReadings, currentShift } = useShiftStore();
  const { salesArchive } = useReturnStore();
  const { groups, addGroup, groupDiscounts, addGroupDiscount, recordTopUp, topUpHistory } = useMemberGroupStore();
  const { methods, toggleMethod, addMethod } = usePaymentMethodStore();
  const { printReceipt } = useHardwareStore();
  const { currentUser } = useAuthStore();

  // Local dialogs & form states
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [zReadModalVisible, setZReadModalVisible] = useState(false);
  const [xReadModalVisible, setXReadModalVisible] = useState(false);
  const [calculatorVisible, setCalculatorVisible] = useState(false);

  // Delivery records
  const [deliveryRecords, setDeliveryRecords] = useState<Array<{ id: string; drNumber: string; date: string; supplier: string; itemsCount: number; amount: number }>>([
    { id: "dr-1", drNumber: "DR-2026-0891", date: "2026-09-01", supplier: "San Miguel PureFoods", itemsCount: 15, amount: 28450.00 },
    { id: "dr-2", drNumber: "DR-2026-0892", date: "2026-09-02", supplier: "Universal Robina Corp", itemsCount: 30, amount: 14200.00 },
    { id: "dr-3", drNumber: "DR-2026-0895", date: "2026-09-03", supplier: "Monde Nissin Corp", itemsCount: 22, amount: 19800.00 },
  ]);
  const [showAddDr, setShowAddDr] = useState(false);
  const [newDrNumber, setNewDrNumber] = useState("");
  const [newDrSupplier, setNewDrSupplier] = useState("");
  const [newDrAmount, setNewDrAmount] = useState("");

  // Pay In / Out form state
  const [payType, setPayType] = useState<"PAY_IN" | "PAY_OUT">("PAY_IN");
  const [payAmount, setPayAmount] = useState("");
  const [payReason, setPayReason] = useState("");

  // Member enroll form state
  const [memBarcode, setMemBarcode] = useState("");
  const [memName, setMemName] = useState("");
  const [memDept, setMemDept] = useState("IT Department");
  const [memAllowance, setMemAllowance] = useState("1500");

  // Top Up Points form state
  const [topUpBarcode, setTopUpBarcode] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpReason, setTopUpReason] = useState("Monthly Allocation");

  // Division form state
  const [divisionName, setDivisionName] = useState("");
  const [divisionPoints, setDivisionPoints] = useState("1500");

  // Group Discount form state
  const [discGroupId, setDiscGroupId] = useState(groups[0]?.id ?? "");
  const [discPercent, setDiscPercent] = useState("5");

  // Payment method form state
  const [pmName, setPmName] = useState("");
  const [pmCode, setPmCode] = useState("");
  const [pmRefReq, setPmRefReq] = useState(true);

  // Helper for CSV export with Alert
  const handleExport = (reportName: string, headers: string[], rows: (string | number)[][]) => {
    const csv = ExcelService.exportTableToCsv(reportName, headers, rows);
    Alert.alert(
      "Report Exported",
      `"${reportName}" exported successfully as CSV.\n${rows.length} rows processed.`
    );
  };

  // Sidebar item renderer
  const renderSidebarItem = (title: string, view: ActiveView) => {
    const isActive = activeView === view;
    return (
      <TouchableOpacity
        key={view}
        style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
        onPress={() => {
          if (view === "ORDER") {
            onClose();
          } else if (view === "SWITCH_CASHIER") {
            if (onSwitchCashier) onSwitchCashier();
            else setXReadModalVisible(true);
          } else if (view === "CLOSE_STORE") {
            setZReadModalVisible(true);
          } else if (view === "CALCULATOR") {
            setCalculatorVisible(true);
          } else {
            setActiveView(view);
          }
        }}
      >
        <Text style={[styles.sidebarItemText, isActive && styles.sidebarItemTextActive]}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    switch (activeView) {
      // ─────────────────────────────────────────────────────────────
      // 1. TRANSACTION HISTORY
      // ─────────────────────────────────────────────────────────────
      case "TRANSACTION_HISTORY": {
        const salesList: any[] = (salesArchive && salesArchive.length > 0) ? salesArchive : [
          {
            id: "tx-demo-1",
            invoiceNumber: "INV-20260904-0001",
            subtotalAmount: 253.00,
            discountAmount: 0.00,
            taxAmount: 27.14,
            totalAmount: 253.00,
            totalTendered: 300.00,
            totalChange: 47.00,
            cashierName: "Maria Santos",
            terminalNumber: "T1",
            branchCode: "BR-001",
            status: "COMPLETED" as const,
            payments: [{ id: "pay-1", method: "CASH", amount: 253.00, amountTendered: 300.00, changeAmount: 47.00 }],
            createdAt: new Date().toISOString(),
            items: [
              { productId: "p1", productName: "Fresh Whole Milk 1L", quantity: 2, unitPrice: 95.0, totalAmount: 190.0, isTaxable: true, taxRate: 0.12, taxAmount: 20.35, discountAmount: 0 },
              { productId: "p3", productName: "Whole Wheat Loaf 500g", quantity: 1, unitPrice: 63.0, totalAmount: 63.0, isTaxable: true, taxRate: 0.12, taxAmount: 6.75, discountAmount: 0 },
            ],
          },
        ];

        return (
          <View style={styles.contentContainer}>
            <View style={styles.headerBar}>
              <Text style={styles.contentTitle}>Sales History</Text>
              <TouchableOpacity
                style={styles.exportTopBtn}
                onPress={() => handleExport("Transaction History", ["Invoice", "Cashier", "Items", "Payment", "Total", "Date"], salesList.map((s: any) => [s.invoiceNumber, s.cashierName, s.items.length, s.payments?.[0]?.method || "CASH", s.totalAmount.toFixed(2), new Date(s.createdAt).toLocaleString()]))}
              >
                <Text style={styles.exportTopText}>Export CSV</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1.5 }]}>Invoice #</Text>
              <Text style={[styles.th, { flex: 1 }]}>Cashier</Text>
              <Text style={[styles.th, { flex: 0.8, textAlign: "center" }]}>Items</Text>
              <Text style={[styles.th, { flex: 1 }]}>Payment</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Total (₱)</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>Date/Time</Text>
            </View>

            <FlatList
              data={salesList}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[styles.tr, index % 2 === 1 && styles.trAlt]}
                  onPress={() => setSelectedSale(item)}
                >
                  <Text style={[styles.td, { flex: 1.5, fontWeight: "700", color: C.blue }]}>{item.invoiceNumber}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{item.cashierName}</Text>
                  <Text style={[styles.td, { flex: 0.8, textAlign: "center" }]}>{item.items.length}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{item.paymentMethod}</Text>
                  <Text style={[styles.td, { flex: 1, textAlign: "right", fontWeight: "700", color: C.green }]}>₱{item.totalAmount.toFixed(2)}</Text>
                  <Text style={[styles.td, { flex: 1.2, textAlign: "right", fontSize: 11 }]}>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 2. TERMINAL RECORD
      // ─────────────────────────────────────────────────────────────
      case "TERMINAL_RECORD": {
        const terminals = [
          { terminal: "T1", name: "Register 1 (Main Cashier)", sales: 48250.00, txnCount: 68, activeCashier: "Maria Santos" },
          { terminal: "T2", name: "Register 2 (Express Lane)", sales: 18400.00, txnCount: 34, activeCashier: "Juan Dela Cruz" },
        ];
        return (
          <View style={styles.contentContainer}>
            <View style={styles.headerBar}>
              <Text style={styles.contentTitle}>Terminal Sales Summary</Text>
              <TouchableOpacity
                style={styles.exportTopBtn}
                onPress={() => handleExport("Terminal Records", ["Terminal", "Name", "Cashier", "Transactions", "Total Sales"], terminals.map((t) => [t.terminal, t.name, t.activeCashier, t.txnCount, t.sales.toFixed(2)]))}
              >
                <Text style={styles.exportTopText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 0.8 }]}>Terminal</Text>
              <Text style={[styles.th, { flex: 2 }]}>Device / Description</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>Active Cashier</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>Txns</Text>
              <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Gross Sales</Text>
            </View>
            {terminals.map((t, idx) => (
              <View key={t.terminal} style={[styles.tr, idx % 2 === 1 && styles.trAlt]}>
                <Text style={[styles.td, { flex: 0.8, fontWeight: "900", color: C.navy }]}>{t.terminal}</Text>
                <Text style={[styles.td, { flex: 2 }]}>{t.name}</Text>
                <Text style={[styles.td, { flex: 1.5 }]}>{t.activeCashier}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: "center" }]}>{t.txnCount}</Text>
                <Text style={[styles.td, { flex: 1.5, textAlign: "right", fontWeight: "900", color: C.green }]}>₱{t.sales.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 3. DELIVERY REPORT
      // ─────────────────────────────────────────────────────────────
      case "DELIVERY_REPORT": {
        return (
          <View style={styles.contentContainer}>
            <View style={styles.headerBar}>
              <Text style={styles.contentTitle}>Delivery Records (DR)</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowAddDr(true)}>
                  <Text style={styles.primaryBtnText}>+ New Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportTopBtn}
                  onPress={() => handleExport("Delivery Reports", ["DR Number", "Supplier", "Date", "Items Count", "Amount"], deliveryRecords.map((d) => [d.drNumber, d.supplier, d.date, d.itemsCount, d.amount.toFixed(2)]))}
                >
                  <Text style={styles.exportTopText}>Export CSV</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1.5 }]}>DR Number</Text>
              <Text style={[styles.th, { flex: 2 }]}>Supplier / Vendor</Text>
              <Text style={[styles.th, { flex: 1 }]}>Date</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>Items</Text>
              <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Amount (₱)</Text>
            </View>
            <FlatList
              data={deliveryRecords}
              keyExtractor={(d) => d.id}
              renderItem={({ item, index }) => (
                <View style={[styles.tr, index % 2 === 1 && styles.trAlt]}>
                  <Text style={[styles.td, { flex: 1.5, fontWeight: "700", color: C.blue }]}>{item.drNumber}</Text>
                  <Text style={[styles.td, { flex: 2 }]}>{item.supplier}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{item.date}</Text>
                  <Text style={[styles.td, { flex: 1, textAlign: "center" }]}>{item.itemsCount}</Text>
                  <Text style={[styles.td, { flex: 1.5, textAlign: "right", fontWeight: "700", color: C.navy }]}>₱{item.amount.toFixed(2)}</Text>
                </View>
              )}
            />
          </View>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 4. STAFF RECORD
      // ─────────────────────────────────────────────────────────────
      case "STAFF_RECORD": {
        const staffRecords = [
          { id: "s1", cashier: "Maria Santos", txnCount: 52, totalSales: 34850.00, returnsCount: 1 },
          { id: "s2", cashier: "Juan Dela Cruz", txnCount: 38, totalSales: 22100.00, returnsCount: 0 },
          { id: "s3", cashier: "Branch Manager", txnCount: 12, totalSales: 9700.00, returnsCount: 0 },
        ];
        return (
          <View style={styles.contentContainer}>
            <View style={styles.headerBar}>
              <Text style={styles.contentTitle}>Cashier Performance</Text>
              <TouchableOpacity
                style={styles.exportTopBtn}
                onPress={() => handleExport("Staff Records", ["Cashier", "Transactions", "Returns", "Total Sales"], staffRecords.map((s) => [s.cashier, s.txnCount, s.returnsCount, s.totalSales.toFixed(2)]))}
              >
                <Text style={styles.exportTopText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Cashier Name</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>Transactions</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>Returns</Text>
              <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Total Sales</Text>
            </View>
            {staffRecords.map((s, idx) => (
              <View key={s.id} style={[styles.tr, idx % 2 === 1 && styles.trAlt]}>
                <Text style={[styles.td, { flex: 2, fontWeight: "700" }]}>{s.cashier}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: "center" }]}>{s.txnCount}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: "center" }]}>{s.returnsCount}</Text>
                <Text style={[styles.td, { flex: 1.5, textAlign: "right", fontWeight: "900", color: C.green }]}>₱{s.totalSales.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 5. X-READ & Z-READ HISTORY
      // ─────────────────────────────────────────────────────────────
      case "X_READ_HISTORY":
      case "Z_READ_HISTORY": {
        const isX = activeView === "X_READ_HISTORY";
        const list = isX ? completedShifts : zReadings;
        return (
          <View style={styles.contentContainer}>
            <View style={styles.headerBar}>
              <Text style={styles.contentTitle}>{isX ? "Shift Handover History (X-Read)" : "Store Closing History (Z-Read)"}</Text>
              <TouchableOpacity
                style={styles.exportTopBtn}
                onPress={() => handleExport(isX ? "X-Readings" : "Z-Readings", ["ID", "Cashier/Manager", "Gross Sales", "Discounts", "Net Sales", "Date"], list.map((item: any) => [item.id, item.cashierName || item.managerName, (item.grossSales || item.todaysGrossSales || 0).toFixed(2), (item.discountAmount || item.todaysDiscounts || 0).toFixed(2), (item.netSales || item.todaysNetSales || 0).toFixed(2), item.openedAt || item.date]))}
              >
                <Text style={styles.exportTopText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1.2 }]}>{isX ? "Shift #" : "Z-Counter"}</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>{isX ? "Cashier" : "Manager"}</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>Gross (₱)</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>Net (₱)</Text>
              <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Timestamp</Text>
            </View>
            {list.length === 0 ? (
              <View style={styles.emptyWrap}><Text style={styles.emptyTxt}>No reading records generated yet.</Text></View>
            ) : (
              <FlatList
                data={list}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item, index }: any) => (
                  <View style={[styles.tr, index % 2 === 1 && styles.trAlt]}>
                    <Text style={[styles.td, { flex: 1.2, fontWeight: "700" }]}>{item.shiftNumber || `#Z-${item.zCounter}`}</Text>
                    <Text style={[styles.td, { flex: 1.5 }]}>{item.cashierName || item.managerName}</Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: "right" }]}>₱{(item.grossSales || item.todaysGrossSales || 0).toFixed(2)}</Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: "right", fontWeight: "700", color: C.green }]}>₱{(item.netSales || item.todaysNetSales || 0).toFixed(2)}</Text>
                    <Text style={[styles.td, { flex: 1.5, textAlign: "right", fontSize: 11 }]}>{new Date(item.openedAt || item.date).toLocaleDateString()}</Text>
                  </View>
                )}
              />
            )}
          </View>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 6. DISCOUNT REPORT
      // ─────────────────────────────────────────────────────────────
      case "DISCOUNT_REPORT": {
        const discountSales: any[] = (salesArchive || []).filter((s: any) => s.discountAmount > 0);
        return (
          <View style={styles.contentContainer}>
            <View style={styles.headerBar}>
              <Text style={styles.contentTitle}>Discounts Summary</Text>
              <TouchableOpacity
                style={styles.exportTopBtn}
                onPress={() => handleExport("Discount Report", ["Invoice", "Cashier", "Discount Amount", "Total"], discountSales.map((s: any) => [s.invoiceNumber, s.cashierName, s.discountAmount.toFixed(2), s.totalAmount.toFixed(2)]))}
              >
                <Text style={styles.exportTopText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1.5 }]}>Invoice #</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>Cashier</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>Discount (₱)</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>Net Total (₱)</Text>
            </View>
            {discountSales.length === 0 ? (
              <View style={styles.emptyWrap}><Text style={styles.emptyTxt}>No discounted transactions recorded yet.</Text></View>
            ) : (
              <FlatList
                data={discountSales}
                keyExtractor={(s) => s.id}
                renderItem={({ item, index }) => (
                  <View style={[styles.tr, index % 2 === 1 && styles.trAlt]}>
                    <Text style={[styles.td, { flex: 1.5, fontWeight: "700", color: C.blue }]}>{item.invoiceNumber}</Text>
                    <Text style={[styles.td, { flex: 1.5 }]}>{item.cashierName}</Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: "right", color: C.green, fontWeight: "700" }]}>-₱{item.discountAmount.toFixed(2)}</Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: "right", fontWeight: "700" }]}>₱{item.totalAmount.toFixed(2)}</Text>
                  </View>
                )}
              />
            )}
          </View>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 7. VOID REPORT & AUDIT LOGS
      // ─────────────────────────────────────────────────────────────
      case "VOID_REPORT":
      case "AUDIT_LOGS": {
        const isVoid = activeView === "VOID_REPORT";
        const filteredEvents = isVoid ? events.filter((e) => e.eventType.includes("VOID")) : events;
        return (
          <View style={styles.contentContainer}>
            <View style={styles.headerBar}>
              <Text style={styles.contentTitle}>{isVoid ? "Voided Items Log" : "Security & Activity Audit Log"}</Text>
              <TouchableOpacity
                style={styles.exportTopBtn}
                onPress={() => handleExport(isVoid ? "Void Report" : "Audit Logs", ["Timestamp", "User", "Event", "Severity", "Details"], filteredEvents.map((e) => [new Date(e.timestamp).toLocaleString(), e.userName, e.eventType, e.severity, e.details]))}
              >
                <Text style={styles.exportTopText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1.5 }]}>Timestamp</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Cashier / User</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>Event</Text>
              <Text style={[styles.th, { flex: 0.8 }]}>Severity</Text>
              <Text style={[styles.th, { flex: 2.5 }]}>Details</Text>
            </View>
            {filteredEvents.length === 0 ? (
              <View style={styles.emptyWrap}><Text style={styles.emptyTxt}>No events logged.</Text></View>
            ) : (
              <FlatList
                data={filteredEvents}
                keyExtractor={(e) => e.id}
                renderItem={({ item, index }) => (
                  <View style={[styles.tr, index % 2 === 1 && styles.trAlt]}>
                    <Text style={[styles.td, { flex: 1.5, fontSize: 11 }]}>{new Date(item.timestamp).toLocaleString()}</Text>
                    <Text style={[styles.td, { flex: 1.2, fontWeight: "600" }]}>{item.userName}</Text>
                    <Text style={[styles.td, { flex: 1.5, fontWeight: "700", color: item.severity === "HIGH" ? C.red : C.navy }]}>{item.eventType}</Text>
                    <Text style={[styles.td, { flex: 0.8, color: item.severity === "HIGH" ? C.red : C.gray600 }]}>{item.severity}</Text>
                    <Text style={[styles.td, { flex: 2.5, fontSize: 12 }]}>{item.details}</Text>
                  </View>
                )}
              />
            )}
          </View>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 8. ADD / ENROLL MEMBER
      // ─────────────────────────────────────────────────────────────
      case "ADD_ENROLL_MEMBER": {
        const handleSaveMember = () => {
          if (!memName.trim()) { Alert.alert("Validation", "Enter member full name."); return; }
          const barcode = memBarcode.trim() || `99000${Math.floor(1000 + Math.random() * 9000)}`;
          addMember({
            fullName: memName.trim(),
            barcode,
            department: memDept,
            monthlyAllowance: parseFloat(memAllowance) || 1500,
          });
          Alert.alert("Success", `Member "${memName}" registered.\nAssigned Barcode: ${barcode}`);
          setMemBarcode(""); setMemName("");
        };
        return (
          <ScrollView style={styles.contentContainer} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.contentTitle}>Register New Member</Text>
            <Text style={styles.hint}>Scan or type member ID barcode, name, division, and monthly consumable allowance.</Text>
            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>ID Barcode (leave empty to auto-generate):</Text>
              <TextInput style={styles.input} placeholder="e.g. 990001004" value={memBarcode} onChangeText={setMemBarcode} />
              <Text style={styles.fieldLabel}>Full Name:</Text>
              <TextInput style={styles.input} placeholder="e.g. Roberto Gomez" value={memName} onChangeText={setMemName} />
              <Text style={styles.fieldLabel}>Department / Division:</Text>
              <View style={styles.pillRow}>
                {groups.map((g) => (
                  <TouchableOpacity key={g.id} style={[styles.pill, memDept === g.name && styles.pillActive]} onPress={() => setMemDept(g.name)}>
                    <Text style={[styles.pillText, memDept === g.name && styles.pillTextActive]}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Monthly Consumable Points Allowance (₱):</Text>
              <TextInput style={styles.input} value={memAllowance} onChangeText={setMemAllowance} keyboardType="numeric" />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveMember}>
                <Text style={styles.primaryBtnText}>Save Member Profile</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 9. ADD POINTS & TOP-UP
      // ─────────────────────────────────────────────────────────────
      case "ADD_POINTS": {
        const handleTopUp = () => {
          const amt = parseFloat(topUpAmount);
          if (isNaN(amt) || amt <= 0) { Alert.alert("Validation", "Enter a valid positive point amount."); return; }
          const target = members.find((m) => m.barcode === topUpBarcode.trim() || m.fullName.toLowerCase().includes(topUpBarcode.toLowerCase().trim()));
          if (!target) { Alert.alert("Not Found", `No member found matching "${topUpBarcode}".`); return; }
          topUpPoints(target.id, amt);
          recordTopUp(target.id, target.fullName, amt, topUpReason, currentUser?.fullName || "Cashier");
          Alert.alert("Success", `Added ${amt.toFixed(2)} points to ${target.fullName}.\nNew Balance: ₱${(target.currentPointsBalance + amt).toFixed(2)}`);
          setTopUpBarcode(""); setTopUpAmount("");
        };
        return (
          <ScrollView style={styles.contentContainer} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.contentTitle}>Reload Member Points</Text>
            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Member Barcode or Name:</Text>
              <TextInput style={styles.input} placeholder="Scan ID card or type name" value={topUpBarcode} onChangeText={setTopUpBarcode} />
              <Text style={styles.fieldLabel}>Points to Add (1 point = ₱1.00):</Text>
              <TextInput style={styles.input} placeholder="e.g. 500.00" value={topUpAmount} onChangeText={setTopUpAmount} keyboardType="numeric" />
              <Text style={styles.fieldLabel}>Reason / Allocation Type:</Text>
              <TextInput style={styles.input} value={topUpReason} onChangeText={setTopUpReason} />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleTopUp}>
                <Text style={styles.primaryBtnText}>Credit Points</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 10. CATEGORY / DIVISION & GROUP DISCOUNTS
      // ─────────────────────────────────────────────────────────────
      case "ADD_CATEGORY_DIVISION": {
        const handleCreateDivision = () => {
          if (!divisionName.trim()) { Alert.alert("Validation", "Enter division name."); return; }
          addGroup(divisionName.trim(), `${divisionName.trim()} Section`, parseFloat(divisionPoints) || 1500);
          Alert.alert("Success", `Division "${divisionName}" created.`);
          setDivisionName("");
        };
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Member Divisions</Text>
            <View style={[styles.formCard, { marginBottom: 16 }]}>
              <Text style={styles.fieldLabel}>New Division / Department Name:</Text>
              <TextInput style={styles.input} placeholder="e.g. Finance & Accounting" value={divisionName} onChangeText={setDivisionName} />
              <Text style={styles.fieldLabel}>Default Monthly Allowance (₱):</Text>
              <TextInput style={styles.input} value={divisionPoints} onChangeText={setDivisionPoints} keyboardType="numeric" />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateDivision}>
                <Text style={styles.primaryBtnText}>+ Create Division</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Active Divisions</Text>
            <FlatList
              data={groups}
              keyExtractor={(g) => g.id}
              renderItem={({ item }) => (
                <View style={styles.tr}>
                  <Text style={[styles.td, { flex: 2, fontWeight: "700" }]}>{item.name}</Text>
                  <Text style={[styles.td, { flex: 2, color: C.gray600 }]}>{item.description}</Text>
                  <Text style={[styles.td, { flex: 1, textAlign: "right", color: C.green, fontWeight: "700" }]}>₱{item.pointsAllowance.toFixed(2)}/mo</Text>
                </View>
              )}
            />
          </View>
        );
      }

      case "MANAGE_DISCOUNTS": {
        const handleAddGroupDiscount = () => {
          const pct = parseFloat(discPercent);
          if (isNaN(pct) || pct <= 0) { Alert.alert("Validation", "Enter a positive discount %."); return; }
          addGroupDiscount(discGroupId, pct, new Date().toISOString().slice(0, 10));
          Alert.alert("Success", `Group discount of ${pct}% activated.`);
        };
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Group Discounts</Text>
            <View style={[styles.formCard, { marginBottom: 16 }]}>
              <Text style={styles.fieldLabel}>Select Division / Group:</Text>
              <View style={styles.pillRow}>
                {groups.map((g) => (
                  <TouchableOpacity key={g.id} style={[styles.pill, discGroupId === g.id && styles.pillActive]} onPress={() => setDiscGroupId(g.id)}>
                    <Text style={[styles.pillText, discGroupId === g.id && styles.pillTextActive]}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Discount Percentage (%):</Text>
              <TextInput style={styles.input} value={discPercent} onChangeText={setDiscPercent} keyboardType="numeric" />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAddGroupDiscount}>
                <Text style={styles.primaryBtnText}>Apply Discount</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Active Group Discounts</Text>
            <FlatList
              data={groupDiscounts}
              keyExtractor={(d) => d.id}
              renderItem={({ item }) => (
                <View style={styles.tr}>
                  <Text style={[styles.td, { flex: 2, fontWeight: "700" }]}>{item.groupName}</Text>
                  <Text style={[styles.td, { flex: 1.5, color: C.green, fontWeight: "900" }]}>{item.percentage}% OFF</Text>
                  <Text style={[styles.td, { flex: 1.5, fontSize: 12 }]}>Since {item.startDate}</Text>
                </View>
              )}
            />
          </View>
        );
      }

      case "MEMBER_TOPUP_HISTORY": {
        return (
          <View style={styles.contentContainer}>
            <View style={styles.headerBar}>
              <Text style={styles.contentTitle}>Points Reload History</Text>
              <TouchableOpacity
                style={styles.exportTopBtn}
                onPress={() => handleExport("Top-Up History", ["Member", "Amount", "Reason", "Performed By", "Timestamp"], topUpHistory.map((t) => [t.memberName, t.amount.toFixed(2), t.reason, t.performedBy, new Date(t.timestamp).toLocaleString()]))}
              >
                <Text style={styles.exportTopText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Member</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>Amount (₱)</Text>
              <Text style={[styles.th, { flex: 2 }]}>Reason</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>Cashier</Text>
              <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Timestamp</Text>
            </View>
            {topUpHistory.length === 0 ? (
              <View style={styles.emptyWrap}><Text style={styles.emptyTxt}>No top-up history recorded yet.</Text></View>
            ) : (
              <FlatList
                data={topUpHistory}
                keyExtractor={(t) => t.id}
                renderItem={({ item, index }) => (
                  <View style={[styles.tr, index % 2 === 1 && styles.trAlt]}>
                    <Text style={[styles.td, { flex: 2, fontWeight: "700" }]}>{item.memberName}</Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: "right", color: C.green, fontWeight: "900" }]}>+₱{item.amount.toFixed(2)}</Text>
                    <Text style={[styles.td, { flex: 2 }]}>{item.reason}</Text>
                    <Text style={[styles.td, { flex: 1.5 }]}>{item.performedBy}</Text>
                    <Text style={[styles.td, { flex: 1.5, textAlign: "right", fontSize: 11 }]}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                  </View>
                )}
              />
            )}
          </View>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 11. PAY IN & PAY OUT
      // ─────────────────────────────────────────────────────────────
      case "PAY_IN_OUT": {
        const handleRecordPay = () => {
          const amt = parseFloat(payAmount);
          if (isNaN(amt) || amt <= 0) { Alert.alert("Validation", "Enter a positive amount."); return; }
          if (!payReason.trim()) { Alert.alert("Validation", "Enter a reason (e.g. Petty Cash, Float)."); return; }
          if (payType === "PAY_IN") {
            addPayIn(amt, payReason.trim(), currentUser?.fullName || "Cashier");
          } else {
            addPayOut(amt, payReason.trim(), currentUser?.fullName || "Cashier");
          }
          Alert.alert("Success", `${payType === "PAY_IN" ? "Cash Added (Pay In)" : "Cash Removed (Pay Out)"}: ₱${amt.toFixed(2)}`);
          setPayAmount(""); setPayReason("");
        };
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Cash Drawer (Pay In / Pay Out)</Text>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Current Computed Drawer Cash Float:</Text>
              <Text style={styles.balanceVal}>₱{getNetBalance().toFixed(2)}</Text>
            </View>
            <View style={[styles.formCard, { marginBottom: 14 }]}>
              <View style={styles.segRow}>
                <TouchableOpacity style={[styles.segBtn, payType === "PAY_IN" && { backgroundColor: C.green, borderColor: C.green }]} onPress={() => setPayType("PAY_IN")}>
                  <Text style={[styles.segBtnText, payType === "PAY_IN" && { color: C.white }]}>Pay In (Add Cash)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segBtn, payType === "PAY_OUT" && { backgroundColor: C.red, borderColor: C.red }]} onPress={() => setPayType("PAY_OUT")}>
                  <Text style={[styles.segBtnText, payType === "PAY_OUT" && { color: C.white }]}>Pay Out (Remove Cash)</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldLabel}>Amount (₱):</Text>
              <TextInput style={styles.input} placeholder="0.00" value={payAmount} onChangeText={setPayAmount} keyboardType="numeric" />
              <Text style={styles.fieldLabel}>Reason / Notes:</Text>
              <TextInput style={styles.input} placeholder="e.g. Change replenishment, Safe drop, Petty cash" value={payReason} onChangeText={setPayReason} />
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: payType === "PAY_IN" ? C.green : C.red }]} onPress={handleRecordPay}>
                <Text style={styles.primaryBtnText}>Record {payType === "PAY_IN" ? "Pay In" : "Pay Out"}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Recent Drawer Entries</Text>
            <FlatList
              data={entries}
              keyExtractor={(e) => e.id}
              renderItem={({ item }) => (
                <View style={styles.tr}>
                  <Text style={[styles.td, { flex: 1, fontWeight: "700", color: item.type === "PAY_IN" ? C.green : C.red }]}>{item.type}</Text>
                  <Text style={[styles.td, { flex: 1.2, fontWeight: "900" }]}>{item.type === "PAY_IN" ? "+" : "-"}₱{item.amount.toFixed(2)}</Text>
                  <Text style={[styles.td, { flex: 2 }]}>{item.reason}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{item.cashierName}</Text>
                  <Text style={[styles.td, { flex: 1.2, textAlign: "right", fontSize: 11 }]}>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                </View>
              )}
            />
          </View>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 12. MANAGE PAYMENT METHODS
      // ─────────────────────────────────────────────────────────────
      case "MANAGE_PAYMENT_METHODS": {
        const handleAddMethod = () => {
          if (!pmName.trim() || !pmCode.trim()) { Alert.alert("Validation", "Enter both method name and code."); return; }
          addMethod(pmName.trim(), pmCode.trim(), pmRefReq);
          Alert.alert("Success", `Payment method "${pmName}" added.`);
          setPmName(""); setPmCode("");
        };
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Payment Methods</Text>
            <View style={[styles.formCard, { marginBottom: 16 }]}>
              <Text style={styles.fieldLabel}>Payment Method Name (e.g. Maya Wallet):</Text>
              <TextInput style={styles.input} value={pmName} onChangeText={setPmName} />
              <Text style={styles.fieldLabel}>Code (e.g. MAYA):</Text>
              <TextInput style={styles.input} value={pmCode} onChangeText={setPmCode} autoCapitalize="characters" />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 8 }}>
                <Text style={styles.fieldLabel}>Requires Reference # during checkout:</Text>
                <Switch value={pmRefReq} onValueChange={setPmRefReq} trackColor={{ true: C.green }} />
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAddMethod}>
                <Text style={styles.primaryBtnText}>+ Add Payment Method</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Configured Methods</Text>
            <FlatList
              data={methods}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <View style={styles.tr}>
                  <Text style={[styles.td, { flex: 2, fontWeight: "700" }]}>{item.name} ({item.code})</Text>
                  <Text style={[styles.td, { flex: 1.5, color: C.gray600 }]}>{item.requiresReference ? "Ref# Required" : "No Ref#"}</Text>
                  <Switch value={item.isActive} onValueChange={() => toggleMethod(item.id)} disabled={item.isBuiltIn && item.code === "CASH"} trackColor={{ true: C.green }} />
                </View>
              )}
            />
          </View>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 13. DATABASE MANAGEMENT (EXCEL IMPORT / EXPORT)
      // ─────────────────────────────────────────────────────────────
      case "DATABASE_MANAGEMENT": {
        const handleImportProductsSample = () => {
          const sampleCsv = `Barcode,Name,SellingPrice,CostPrice,Category\n4800016601050,Century Tuna Flakes 180g,45.00,34.00,Canned Goods\n4800016601060,San Marino Corned Tuna,42.00,31.50,Canned Goods`;
          const parsed = ExcelService.parseProductsCsv(sampleCsv);
          for (const item of parsed.items) {
            addProduct({
              name: item.name,
              barcode: item.barcode,
              sellingPrice: item.sellingPrice,
              costPrice: item.costPrice || item.sellingPrice * 0.75,
              categoryId: "5",
              isTaxable: true,
              taxRate: 0.12,
              unitOfMeasure: "PCS",
            });
          }
          Alert.alert("Import Successful", `Successfully imported ${parsed.successCount} products into database.`);
        };

        const handleExportProducts = () => {
          const csv = ExcelService.exportProductsCsv(products);
          Alert.alert("Export Complete", `Exported ${products.length} products to CSV.`);
        };

        const handleExportInventory = () => {
          const csv = ExcelService.exportInventoryCsv(products.map((p) => ({ barcode: p.barcode, name: p.name, quantity: 50, reorderLevel: 10, drNumber: "DR-2026-0901" })));
          Alert.alert("Export Complete", "Inventory balances and DR records exported.");
        };

        return (
          <ScrollView style={styles.contentContainer} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.contentTitle}>Data Import & Export</Text>
            <Text style={styles.hint}>Bulk import and export products and inventory without manual data entry. Non-required fields automatically fallback to defaults.</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Product Catalog</Text>
              <Text style={styles.cardSub}>Import new products from an Excel/CSV file or export existing store catalog.</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleImportProductsSample}>
                  <Text style={styles.primaryBtnText}>Import Products (.csv)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportTopBtn, { flex: 1 }]} onPress={handleExportProducts}>
                  <Text style={styles.exportTopText}>Export Products (.csv)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Inventory Balances</Text>
              <Text style={styles.cardSub}>Update stock counts with Delivery Report Numbers (DR#) or export current balances.</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: C.blue }]} onPress={() => Alert.alert("Import Ready", "Select Excel inventory file with Barcode, Quantity, and DR Number.")}>
                  <Text style={styles.primaryBtnText}>Import Inventory (.csv)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportTopBtn, { flex: 1 }]} onPress={handleExportInventory}>
                  <Text style={styles.exportTopText}>Export Inventory (.csv)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        );
      }

      // ─────────────────────────────────────────────────────────────
      // 14. SETTINGS SCREENS (MOUNTED RICH SCREENS)
      // ─────────────────────────────────────────────────────────────
      case "STORE_SETTINGS":
        return <StoreSettingsScreen />;
      case "STAFF_SETTINGS":
        return <StaffSettingsScreen />;
      case "DATABASE_BACKUP":
        return <DatabaseBackupScreen />;

      default:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Section: {activeView}</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.root}>
      {/* ── LEFT SIDEBAR ────────────────────────────────────────── */}
      <View style={styles.sidebar}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionHeader}>REGISTER</Text>
          {renderSidebarItem("Sales Register", "ORDER")}
          {renderSidebarItem("Shift Handover", "SWITCH_CASHIER")}
          {renderSidebarItem("Calculator", "CALCULATOR")}

          <View style={styles.divider} />
          <Text style={styles.sectionHeader}>REPORTS</Text>
          {renderSidebarItem("Sales History", "TRANSACTION_HISTORY")}
          {renderSidebarItem("Terminal Summary", "TERMINAL_RECORD")}
          {renderSidebarItem("Deliveries (DR)", "DELIVERY_REPORT")}
          {renderSidebarItem("Cashier Performance", "STAFF_RECORD")}
          {renderSidebarItem("X-Readings", "X_READ_HISTORY")}
          {renderSidebarItem("Z-Readings", "Z_READ_HISTORY")}
          {renderSidebarItem("Discounts Log", "DISCOUNT_REPORT")}
          {renderSidebarItem("Voided Items", "VOID_REPORT")}
          {renderSidebarItem("Activity Audit", "AUDIT_LOGS")}

          <View style={styles.divider} />
          <Text style={styles.sectionHeader}>CUSTOMERS & LOYALTY</Text>
          {renderSidebarItem("Register Member", "ADD_ENROLL_MEMBER")}
          {renderSidebarItem("Reload Points", "ADD_POINTS")}
          {renderSidebarItem("Member Divisions", "ADD_CATEGORY_DIVISION")}
          {renderSidebarItem("Group Discounts", "MANAGE_DISCOUNTS")}
          {renderSidebarItem("Points Ledger", "MEMBER_TOPUP_HISTORY")}

          <View style={styles.divider} />
          <Text style={styles.sectionHeader}>OPERATIONS</Text>
          {renderSidebarItem("Cash Drawer", "PAY_IN_OUT")}
          {renderSidebarItem("Store Closing (Z-Read)", "CLOSE_STORE")}
          {renderSidebarItem("Payment Methods", "MANAGE_PAYMENT_METHODS")}
          {renderSidebarItem("Import / Export Data", "DATABASE_MANAGEMENT")}

          <View style={styles.divider} />
          <Text style={styles.sectionHeader}>SETTINGS</Text>
          {renderSidebarItem("Store & Devices", "STORE_SETTINGS")}
          {renderSidebarItem("Staff & Permissions", "STAFF_SETTINGS")}
          {renderSidebarItem("Database Backup", "DATABASE_BACKUP")}

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>

      {/* ── RIGHT CONTENT VIEW ──────────────────────────────────── */}
      <View style={styles.rightArea}>{renderContent()}</View>

      {/* ── RECEIPT DETAIL MODAL ────────────────────────────────── */}
      <Modal visible={selectedSale !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.receiptCard}>
            <Text style={styles.receiptTitle}>FOOD BASKETS CORPORATION</Text>
            <Text style={styles.receiptSub}>Invoice: {selectedSale?.invoiceNumber}</Text>
            <Text style={styles.receiptSub}>Cashier: {selectedSale?.cashierName} · {selectedSale && new Date(selectedSale.createdAt).toLocaleString()}</Text>
            <View style={styles.divider} />
            <ScrollView style={{ maxHeight: 200 }}>
              {selectedSale?.items.map((i, idx) => (
                <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 3 }}>
                  <Text style={{ fontSize: 13, flex: 2 }}>{i.quantity}x {i.productName}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700" }}>₱{(i.totalAmount || (i.unitPrice * i.quantity)).toFixed(2)}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.divider} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: "900" }}>TOTAL:</Text>
              <Text style={{ fontSize: 16, fontWeight: "900", color: C.green }}>₱{selectedSale?.totalAmount.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 2 }}>
              <Text style={{ fontSize: 12, color: C.gray600 }}>Tendered ({selectedSale?.payments?.[0]?.method || "CASH"}):</Text>
              <Text style={{ fontSize: 12 }}>₱{(selectedSale?.totalTendered || selectedSale?.totalAmount || 0).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 2 }}>
              <Text style={{ fontSize: 12, color: C.gray600 }}>Change:</Text>
              <Text style={{ fontSize: 12 }}>₱{(selectedSale?.totalChange || 0).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, backgroundColor: C.navy }]}
                onPress={() => {
                  if (selectedSale) {
                    printReceipt({
                      branchName: "FoodBaskets Corp",
                      branchAddress: "123 Rizal Ave, Manila",
                      taxId: "100-001-000-000",
                      invoiceNumber: selectedSale.invoiceNumber,
                      cashierName: selectedSale.cashierName,
                      terminalNumber: selectedSale.terminalNumber || "T1",
                      items: selectedSale.items.map((it) => ({
                        name: it.productName,
                        quantity: it.quantity,
                        unitPrice: it.unitPrice,
                        totalAmount: it.totalAmount || (it.unitPrice * it.quantity),
                      })),
                      subtotal: selectedSale.subtotalAmount || selectedSale.totalAmount,
                      discountAmount: selectedSale.discountAmount || 0,
                      vatableAmount: selectedSale.vatableAmount || (selectedSale.totalAmount / 1.12),
                      vatAmount: selectedSale.taxAmount || 0,
                      totalDue: selectedSale.totalAmount,
                      amountReceived: selectedSale.totalTendered || selectedSale.totalAmount,
                      changeAmount: selectedSale.totalChange || 0,
                      paymentMethod: selectedSale.payments?.[0]?.method || "CASH",
                      date: selectedSale.createdAt,
                    });
                    Alert.alert("Reprint", "Receipt sent to printer.");
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Reprint Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.exportTopBtn, { flex: 1 }]} onPress={() => setSelectedSale(null)}>
                <Text style={styles.exportTopText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── ADD DELIVERY REPORT MODAL ───────────────────────────── */}
      <Modal visible={showAddDr} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.receiptCard}>
            <Text style={styles.receiptTitle}>Add Delivery Report</Text>
            <TextInput style={styles.input} placeholder="DR Number (e.g. DR-2026-0906)" value={newDrNumber} onChangeText={setNewDrNumber} />
            <TextInput style={styles.input} placeholder="Supplier / Vendor" value={newDrSupplier} onChangeText={setNewDrSupplier} />
            <TextInput style={styles.input} placeholder="Total Delivery Value (₱)" value={newDrAmount} onChangeText={setNewDrAmount} keyboardType="numeric" />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={[styles.exportTopBtn, { flex: 1 }]} onPress={() => setShowAddDr(false)}>
                <Text style={styles.exportTopText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1 }]}
                onPress={() => {
                  if (!newDrNumber.trim()) { Alert.alert("Validation", "Enter DR Number."); return; }
                  setDeliveryRecords((prev) => [
                    { id: `dr-${Date.now()}`, drNumber: newDrNumber.trim(), supplier: newDrSupplier.trim() || "Supplier", date: new Date().toISOString().slice(0, 10), itemsCount: 1, amount: parseFloat(newDrAmount) || 0 },
                    ...prev,
                  ]);
                  setShowAddDr(false);
                  setNewDrNumber(""); setNewDrSupplier(""); setNewDrAmount("");
                  Alert.alert("Success", "Delivery Report recorded.");
                }}
              >
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── SHIFT CLOSURE MODALS ────────────────────────────────── */}
      <ShiftReadingModal
        visible={zReadModalVisible}
        type="Z_READ"
        onClose={() => setZReadModalVisible(false)}
        onStoreClosed={() => {
          setZReadModalVisible(false);
          Alert.alert("Store Closed", "Daily Z-Reading completed.");
          if (onSwitchCashier) onSwitchCashier();
        }}
      />
      <ShiftReadingModal
        visible={xReadModalVisible}
        type="X_READ"
        onClose={() => setXReadModalVisible(false)}
        onShiftClosed={() => {
          setXReadModalVisible(false);
          if (onSwitchCashier) onSwitchCashier();
        }}
      />
      <CalculatorModal
        visible={calculatorVisible}
        onClose={() => setCalculatorVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: C.navyDark },
  sidebar: { width: 230, backgroundColor: C.navySide, borderRightWidth: 1, borderRightColor: "#2d3f6a", paddingVertical: 8, paddingHorizontal: 6 },
  sidebarItem: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 3 },
  sidebarItemActive: { backgroundColor: C.green },
  sidebarIcon: { fontSize: 16, marginRight: 10 },
  sidebarItemText: { fontSize: 12, color: C.white, fontWeight: "600" },
  sidebarItemTextActive: { fontWeight: "900" },
  sectionHeader: { fontSize: 10, color: C.gray400, letterSpacing: 1, marginTop: 10, marginBottom: 4, marginLeft: 8, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#2d3f6a", marginVertical: 8 },
  rightArea: { flex: 1, backgroundColor: C.gray100 },
  contentContainer: { flex: 1, padding: 16 },
  headerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  contentTitle: { fontSize: 18, fontWeight: "900", color: C.navy },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: C.navy, marginTop: 8 },
  exportTopBtn: { borderWidth: 1.5, borderColor: C.gray400, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignItems: "center" },
  exportTopText: { color: C.gray600, fontWeight: "700", fontSize: 12 },
  primaryBtn: { backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" },
  primaryBtnText: { color: C.white, fontWeight: "900", fontSize: 13 },
  tableHeader: { flexDirection: "row", backgroundColor: C.navy, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, marginBottom: 4 },
  th: { color: C.white, fontWeight: "700", fontSize: 12 },
  tr: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.gray200 },
  trAlt: { backgroundColor: C.greenLight },
  td: { fontSize: 12, color: C.navy },
  emptyWrap: { padding: 40, alignItems: "center" },
  emptyTxt: { fontSize: 14, color: C.gray400 },
  formCard: { backgroundColor: C.white, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: C.gray200 },
  card: { backgroundColor: C.white, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: C.gray200, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.navy },
  cardSub: { fontSize: 12, color: C.gray400, marginTop: 4 },
  fieldLabel: { fontSize: 12, color: C.gray600, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: C.gray200, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.navy, backgroundColor: C.white, marginBottom: 8 },
  hint: { fontSize: 12, color: C.gray400, fontStyle: "italic", marginBottom: 12 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 6 },
  pill: { borderRadius: 16, borderWidth: 1.5, borderColor: C.gray200, paddingHorizontal: 12, paddingVertical: 6 },
  pillActive: { backgroundColor: C.green, borderColor: C.green },
  pillText: { fontSize: 12, color: C.gray600 },
  pillTextActive: { color: C.white, fontWeight: "700" },
  segRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  segBtn: { flex: 1, borderRadius: 8, borderWidth: 1.5, borderColor: C.gray200, paddingVertical: 10, alignItems: "center" },
  segBtnText: { fontSize: 12, fontWeight: "700", color: C.gray600 },
  balanceCard: { backgroundColor: C.navy, borderRadius: 10, padding: 16, marginBottom: 12, alignItems: "center" },
  balanceLabel: { color: C.gray400, fontSize: 12 },
  balanceVal: { color: "#4ade80", fontSize: 28, fontWeight: "900", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" },
  receiptCard: { backgroundColor: C.white, borderRadius: 14, padding: 20, width: 360 },
  receiptTitle: { fontSize: 16, fontWeight: "900", color: C.navy, textAlign: "center" },
  receiptSub: { fontSize: 11, color: C.gray400, textAlign: "center", marginTop: 2 },
});
