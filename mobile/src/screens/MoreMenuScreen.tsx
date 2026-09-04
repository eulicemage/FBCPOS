import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ScrollView, Switch, Modal } from 'react-native';
import { useProductStore } from '../store/productStore';
import { useMemberStore } from '../store/memberStore';
import { usePermissionStore, ALL_FEATURES, FEATURE_LABELS, FeatureKey, StaffRole, StaffAccount } from '../store/permissionStore';
import { useDrawerStore, DrawerEntry } from '../store/drawerStore';
import { useShiftStore } from '../store/shiftStore';
import { useSecurityAuditStore } from '../store/securityAuditStore';
import { useAuthStore } from '../store/authStore';
import { ShiftReadingModal } from '../components/ShiftReadingModal';

interface MoreMenuScreenProps {
  onClose: () => void;
  onSwitchCashier?: () => void;
}

const NAVY = '#1a2340';
const NAVY_DARK = '#141a2e';
const NAVY_SIDE = '#1e2d50';
const GRAY_100 = '#f5f7fa';
const GRAY_200 = '#e8ecf0';
const GRAY_400 = '#9aa5b4';
const BLUE = '#1565c0';
const RED = '#c62828';
const GREEN = '#2d7a2d';

type ActiveView =
  | 'ORDER' | 'SWITCH_CASHIER' | 'CALCULATOR'
  | 'TERMINAL_RECORD' | 'TRANSACTION_HISTORY' | 'DELIVERY_REPORT' | 'STAFF_RECORD' | 'X_READ_HISTORY' | 'Z_READ_HISTORY' | 'DISCOUNT_REPORT' | 'VOID_REPORT' | 'AUDIT_LOGS'
  | 'ADD_ENROLL_MEMBER' | 'ADD_POINTS' | 'ADD_CATEGORY_DIVISION' | 'MEMBER_TRANSACTION_HISTORY' | 'MEMBER_TOPUP_HISTORY' | 'MANAGE_DISCOUNTS' | 'MANAGE_PRODUCTS'
  | 'INVENTORY_PRODUCTS' | 'PAY_IN_OUT' | 'CLOSE_STORE' | 'MANAGE_PAYMENT_METHODS' | 'DATABASE_MANAGEMENT'
  | 'STORE_SETTINGS' | 'STAFF_ACCOUNTS' | 'ROLE_TYPES' | 'ROLE_PERMISSIONS' | 'DATABASE_BACKUP';

export const MoreMenuScreen: React.FC<MoreMenuScreenProps> = ({ onClose, onSwitchCashier }) => {
  const [activeView, setActiveView] = useState<ActiveView>('TRANSACTION_HISTORY');

  // Stores
  const { products, addProduct } = useProductStore();
  const { members, addMember, topUpPoints, searchMembers } = useMemberStore();
  const { roles, accounts, addRole, addAccount } = usePermissionStore();
  const { entries, addPayIn, addPayOut, getNetBalance } = useDrawerStore();
  const { events } = useSecurityAuditStore();
  const { getDailySummary } = useShiftStore();

  const [zReadModalVisible, setZReadModalVisible] = useState(false);
  const [xReadModalVisible, setXReadModalVisible] = useState(false);

  // Helper render components
  const renderSidebarItem = (title: string, view: ActiveView, icon: string) => {
    const isActive = activeView === view;
    return (
      <TouchableOpacity
        style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
        onPress={() => {
          if (view === 'ORDER') {
            onClose();
          } else if (view === 'SWITCH_CASHIER') {
            if (onSwitchCashier) onSwitchCashier();
            else setXReadModalVisible(true);
          } else if (view === 'CLOSE_STORE') {
            setZReadModalVisible(true);
          } else if (view === 'CALCULATOR') {
            Alert.alert('Calculator', 'Calculator opened');
          } else {
            setActiveView(view);
          }
        }}
      >
        <Text style={styles.sidebarIcon}>{icon}</Text>
        <Text style={[styles.sidebarItemText, isActive && styles.sidebarItemTextActive]}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const renderExportBtn = () => (
    <TouchableOpacity style={styles.exportBtn} onPress={() => Alert.alert('Export', 'Exporting to CSV...')}>
      <Text style={styles.exportBtnText}>Export to CSV</Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'TRANSACTION_HISTORY':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Transaction History</Text>
            <FlatList
              data={[{ id: '1', order: '#1001', cashier: 'Maria', items: 3, total: 150, date: '2026-09-04' }]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Receipt', `Order ${item.order}`)}>
                  <Text style={styles.cell}>{item.order}</Text>
                  <Text style={styles.cell}>{item.cashier}</Text>
                  <Text style={styles.cell}>{item.items} items</Text>
                  <Text style={styles.cell}>P{item.total.toFixed(2)}</Text>
                  <Text style={styles.cell}>{item.date}</Text>
                </TouchableOpacity>
              )}
            />
            {renderExportBtn()}
          </View>
        );
      case 'TERMINAL_RECORD':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Terminal Record</Text>
            <View style={styles.filterBar}>
              <Text>Filter: Terminal (All)</Text>
            </View>
            <FlatList
              data={[{ id: '1', terminal: 'T1', transactions: 15, total: 2500 }]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.terminal}</Text>
                  <Text style={styles.cell}>{item.transactions} txns</Text>
                  <Text style={styles.cell}>P{item.total.toFixed(2)}</Text>
                </View>
              )}
            />
            {renderExportBtn()}
          </View>
        );
      case 'DELIVERY_REPORT':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Delivery Report</Text>
            <TextInput style={styles.input} placeholder="Search by DR#" />
            <FlatList
              data={[{ id: '1', dr: 'DR-101', date: '2026-09-04', supplier: 'ABC Corp', items: 50, amount: 5000 }]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.dr}</Text>
                  <Text style={styles.cell}>{item.date}</Text>
                  <Text style={styles.cell}>{item.supplier}</Text>
                  <Text style={styles.cell}>{item.items} items</Text>
                  <Text style={styles.cell}>P{item.amount.toFixed(2)}</Text>
                </View>
              )}
            />
            {renderExportBtn()}
          </View>
        );
      case 'STAFF_RECORD':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Staff Record</Text>
            <FlatList
              data={[{ id: '1', cashier: 'Maria', txnCount: 45, totalSales: 12500 }]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.cashier}</Text>
                  <Text style={styles.cell}>{item.txnCount} txns</Text>
                  <Text style={styles.cell}>P{item.totalSales.toFixed(2)}</Text>
                </View>
              )}
            />
            {renderExportBtn()}
          </View>
        );
      case 'X_READ_HISTORY':
      case 'Z_READ_HISTORY':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>{activeView === 'X_READ_HISTORY' ? 'X-Read History' : 'Z-Read History'}</Text>
            <FlatList
              data={[{ id: '1', date: '2026-09-03', cashier: 'Manager', total: 45000 }]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.date}</Text>
                  <Text style={styles.cell}>{item.cashier}</Text>
                  <Text style={styles.cell}>P{item.total.toFixed(2)}</Text>
                </View>
              )}
            />
            {renderExportBtn()}
          </View>
        );
      case 'DISCOUNT_REPORT':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Discount Report</Text>
            <FlatList
              data={[{ id: '1', txn: '#1005', type: 'Senior', amount: 45 }]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.txn}</Text>
                  <Text style={styles.cell}>{item.type}</Text>
                  <Text style={styles.cell}>P{item.amount.toFixed(2)}</Text>
                </View>
              )}
            />
            {renderExportBtn()}
          </View>
        );
      case 'VOID_REPORT':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Void Report</Text>
            <FlatList
              data={[{ id: '1', date: '2026-09-04', cashier: 'Maria', item: 'Milk', amount: 95 }]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.date}</Text>
                  <Text style={styles.cell}>{item.cashier}</Text>
                  <Text style={styles.cell}>{item.item}</Text>
                  <Text style={styles.cell}>P{item.amount.toFixed(2)}</Text>
                </View>
              )}
            />
            {renderExportBtn()}
          </View>
        );
      case 'AUDIT_LOGS':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Audit Logs</Text>
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{new Date(item.timestamp).toLocaleString()}</Text>
                  <Text style={styles.cell}>{item.userName}</Text>
                  <Text style={styles.cell}>{item.eventType}</Text>
                  <Text style={styles.cell}>{item.severity}</Text>
                  <Text style={styles.cell}>{item.details}</Text>
                </View>
              )}
            />
            {renderExportBtn()}
          </View>
        );
      case 'ADD_ENROLL_MEMBER':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Add / Enroll Member</Text>
            <TextInput style={styles.input} placeholder="Barcode" />
            <TextInput style={styles.input} placeholder="Full Name" />
            <TextInput style={styles.input} placeholder="Department / Division" />
            <TextInput style={styles.input} placeholder="Monthly Allowance" keyboardType="numeric" />
            <TouchableOpacity style={styles.btnPrimary} onPress={() => Alert.alert('Success', 'Member enrolled')}>
              <Text style={styles.btnPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        );
      case 'ADD_POINTS':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Add Points</Text>
            <TextInput style={styles.input} placeholder="Search member by barcode or name" />
            <TextInput style={styles.input} placeholder="Point Amount" keyboardType="numeric" />
            <TouchableOpacity style={styles.btnPrimary} onPress={() => Alert.alert('Success', 'Points added')}>
              <Text style={styles.btnPrimaryText}>Add Points</Text>
            </TouchableOpacity>
          </View>
        );
      case 'ADD_CATEGORY_DIVISION':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Add Category / Division</Text>
            <TextInput style={styles.input} placeholder="Division Name" />
            <TouchableOpacity style={styles.btnPrimary} onPress={() => Alert.alert('Success', 'Division added')}>
              <Text style={styles.btnPrimaryText}>Add Division</Text>
            </TouchableOpacity>
            <FlatList
              data={[{ id: '1', name: 'Warehouse Operations' }, { id: '2', name: 'Logistics' }]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}><Text style={styles.cell}>{item.name}</Text></View>
              )}
            />
          </View>
        );
      case 'MEMBER_TRANSACTION_HISTORY':
      case 'MEMBER_TOPUP_HISTORY':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>{activeView === 'MEMBER_TRANSACTION_HISTORY' ? 'Member Transaction History' : 'Member Top-Up History'}</Text>
            <TextInput style={styles.input} placeholder="Search Member" />
            <FlatList
              data={[{ id: '1', date: '2026-09-01', details: 'Transaction #1001', amount: 150 }]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.date}</Text>
                  <Text style={styles.cell}>{item.details}</Text>
                  <Text style={styles.cell}>P{item.amount.toFixed(2)}</Text>
                </View>
              )}
            />
          </View>
        );
      case 'MANAGE_DISCOUNTS':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Manage Discounts</Text>
            <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>+ Add Discount</Text></TouchableOpacity>
            <FlatList
              data={[{ id: '1', division: 'Seniors', percentage: 20 }]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.division}</Text>
                  <Text style={styles.cell}>{item.percentage}%</Text>
                  <Text style={styles.cellAction}>Edit / Delete</Text>
                </View>
              )}
            />
          </View>
        );
      case 'MANAGE_PRODUCTS':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Manage Products</Text>
            <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>+ Add Product</Text></TouchableOpacity>
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.barcode}</Text>
                  <Text style={styles.cell}>{item.name}</Text>
                  <Text style={styles.cell}>P{item.sellingPrice.toFixed(2)}</Text>
                </View>
              )}
            />
          </View>
        );
      case 'INVENTORY_PRODUCTS':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Inventory of Products</Text>
            <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>+ Stock In</Text></TouchableOpacity>
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.name}</Text>
                  <Text style={[styles.cell, { color: GREEN }]}>100 in stock</Text>
                </View>
              )}
            />
          </View>
        );
      case 'PAY_IN_OUT':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Pay In / Pay Out</Text>
            <Text style={{ marginBottom: 20 }}>Running Drawer Balance: P{getNetBalance().toFixed(2)}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: GREEN }]} onPress={() => Alert.alert('Pay In', 'Pay In form')}>
                <Text style={styles.btnPrimaryText}>PAY IN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: RED }]} onPress={() => Alert.alert('Pay Out', 'Pay Out form')}>
                <Text style={styles.btnPrimaryText}>PAY OUT</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={entries}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                  <Text style={styles.cell}>{item.type}</Text>
                  <Text style={styles.cell}>{item.reason}</Text>
                  <Text style={styles.cell}>P{item.amount.toFixed(2)}</Text>
                </View>
              )}
            />
          </View>
        );
      case 'MANAGE_PAYMENT_METHODS':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Manage Payment Methods</Text>
            <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>+ Add Payment Method</Text></TouchableOpacity>
            <FlatList
              data={[{ id: '1', name: 'Cash', active: true }, { id: '2', name: 'GCash', active: true }]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.name}</Text>
                  <Switch value={item.active} />
                </View>
              )}
            />
          </View>
        );
      case 'DATABASE_MANAGEMENT':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Database Management</Text>
            <Text style={styles.sectionHeader}>Products</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => Alert.alert('Import')}><Text style={styles.btnPrimaryText}>Import CSV</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => Alert.alert('Export')}><Text style={styles.btnPrimaryText}>Export CSV</Text></TouchableOpacity>
            </View>
            <Text style={styles.sectionHeader}>Inventory</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => Alert.alert('Import')}><Text style={styles.btnPrimaryText}>Import CSV</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => Alert.alert('Export')}><Text style={styles.btnPrimaryText}>Export CSV</Text></TouchableOpacity>
            </View>
          </View>
        );
      case 'STORE_SETTINGS':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Store Settings</Text>
            <TouchableOpacity style={styles.row}><Text style={styles.cell}>See Store Details</Text></TouchableOpacity>
            <TouchableOpacity style={styles.row}><Text style={styles.cell}>Edit Receipt Footer Text</Text></TouchableOpacity>
            <TouchableOpacity style={styles.row}><Text style={styles.cell}>Printer Devices</Text></TouchableOpacity>
            <TouchableOpacity style={styles.row}><Text style={styles.cell}>Customer Display / 2nd Monitor</Text></TouchableOpacity>
          </View>
        );
      case 'STAFF_ACCOUNTS':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Staff Accounts</Text>
            <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>+ Add Account</Text></TouchableOpacity>
            <FlatList
              data={accounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.fullName}</Text>
                  <Text style={styles.cell}>{item.username}</Text>
                  <Text style={styles.cell}>{item.roleId}</Text>
                  <Text style={styles.cell}>{item.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
              )}
            />
          </View>
        );
      case 'ROLE_TYPES':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Role Types</Text>
            <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>+ Add Role</Text></TouchableOpacity>
            <FlatList
              data={roles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.cell}>{item.name}</Text>
                  <Text style={styles.cellAction}>Edit Permissions</Text>
                </View>
              )}
            />
          </View>
        );
      case 'DATABASE_BACKUP':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Database Backup</Text>
            <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>Manual Backup Now</Text></TouchableOpacity>
            <Text style={{ marginTop: 20 }}>Auto-backup trigger:</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>By Time</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>At Z-Read</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>End of Day</Text></TouchableOpacity>
            </View>
          </View>
        );
      default:
        return <View style={styles.contentContainer}><Text>Select a menu item</Text></View>;
    }
  };

  return (
    <View style={styles.container}>
      {/* LEFT PANEL */}
      <View style={styles.leftPanel}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderSidebarItem('Order', 'ORDER', '🛒')}
          {renderSidebarItem('Switch Cashier (X-Read)', 'SWITCH_CASHIER', '🔄')}
          {renderSidebarItem('Calculator', 'CALCULATOR', '🖩')}

          {renderSectionHeader('RECORDS')}
          {renderSidebarItem('Terminal Record', 'TERMINAL_RECORD', '📋')}
          {renderSidebarItem('Transaction History', 'TRANSACTION_HISTORY', '🧾')}
          {renderSidebarItem('Delivery Report', 'DELIVERY_REPORT', '🚚')}
          {renderSidebarItem('Staff Record', 'STAFF_RECORD', '👤')}
          {renderSidebarItem('X-Read History', 'X_READ_HISTORY', '📊')}
          {renderSidebarItem('Z-Read History', 'Z_READ_HISTORY', '📊')}
          {renderSidebarItem('% Discount Report', 'DISCOUNT_REPORT', '%\u00A0')}
          {renderSidebarItem('✗ Void Report', 'VOID_REPORT', '✗\u00A0')}
          {renderSidebarItem('Audit Logs', 'AUDIT_LOGS', '🛡')}

          {renderSectionHeader('CUSTOMER')}
          {renderSidebarItem('Add / Enroll Member', 'ADD_ENROLL_MEMBER', '👥')}
          {renderSidebarItem('Add Points', 'ADD_POINTS', '➕')}
          {renderSidebarItem('Add Category / Division', 'ADD_CATEGORY_DIVISION', '🏷')}
          {renderSidebarItem('Member Transaction History', 'MEMBER_TRANSACTION_HISTORY', '📜')}
          {renderSidebarItem('Member Top-Up History', 'MEMBER_TOPUP_HISTORY', '💰')}
          {renderSidebarItem('Manage Discounts', 'MANAGE_DISCOUNTS', '🎁')}
          {renderSidebarItem('Manage Products', 'MANAGE_PRODUCTS', '📦')}

          {renderSectionHeader('OPERATIONS')}
          {renderSidebarItem('Manage Products', 'MANAGE_PRODUCTS', '📦')}
          {renderSidebarItem('Inventory of Products', 'INVENTORY_PRODUCTS', '📋')}
          {renderSidebarItem('Pay In / Pay Out', 'PAY_IN_OUT', '💵')}
          {renderSidebarItem('Close Store (Z-Reading)', 'CLOSE_STORE', '🛑')}
          {renderSidebarItem('Manage Payment Methods', 'MANAGE_PAYMENT_METHODS', '💳')}
          {renderSidebarItem('Database Management', 'DATABASE_MANAGEMENT', '📁')}

          {renderSectionHeader('SETTINGS')}
          {renderSidebarItem('Store', 'STORE_SETTINGS', '🏪')}
          {renderSidebarItem('Staff', 'STAFF_ACCOUNTS', '👥')}
          {renderSidebarItem('Role Types', 'ROLE_TYPES', '🛡')}
          {renderSidebarItem('Database Backup', 'DATABASE_BACKUP', '🗄')}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* RIGHT PANEL */}
      <View style={styles.rightPanel}>
        {renderContent()}
      </View>

      <ShiftReadingModal
        visible={xReadModalVisible}
        type="X_READ"
        onClose={() => setXReadModalVisible(false)}
      />
      <ShiftReadingModal
        visible={zReadModalVisible}
        type="Z_READ"
        onClose={() => setZReadModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: GRAY_100,
  },
  leftPanel: {
    width: 220,
    backgroundColor: NAVY,
    paddingTop: 10,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: GRAY_100,
  },
  sectionHeader: {
    color: GRAY_400,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 15,
    marginTop: 20,
    marginBottom: 5,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  sidebarItemActive: {
    backgroundColor: NAVY_SIDE,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
  },
  sidebarIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  sidebarItemText: {
    color: GRAY_200,
    fontSize: 13,
  },
  sidebarItemTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  contentTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: NAVY_DARK,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    color: NAVY_DARK,
  },
  cellAction: {
    color: BLUE,
    fontWeight: 'bold',
  },
  exportBtn: {
    backgroundColor: GRAY_200,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  exportBtnText: {
    color: NAVY_DARK,
    fontWeight: 'bold',
  },
  filterBar: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: GRAY_200,
  },
  btnPrimary: {
    backgroundColor: BLUE,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
