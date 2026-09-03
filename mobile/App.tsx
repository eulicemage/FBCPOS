import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { POSScreen } from './src/screens/POSScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { TenderModal } from './src/components/TenderModal';
import { ReceiptModal } from './src/components/ReceiptModal';
import { SaleRecord } from './src/services/checkoutService';
import { useAuthStore } from './src/store/authStore';
import { useCartStore } from './src/store/cartStore';
import { useShiftStore } from './src/store/shiftStore';
import { useReturnStore } from './src/services/returnService';
import { useInventoryStore } from './src/store/inventoryStore';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'POS' | 'INVENTORY' | 'LOGIN'>('POS');
  const [tenderVisible, setTenderVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);

  const clearCart = useCartStore((s) => s.clearCart);
  const { recordSale, startShift, currentShift } = useShiftStore();
  const { currentUser, isBypassMode } = useAuthStore();

  const handleNavigateToCheckout = () => {
    setTenderVisible(true);
  };

  const handleCheckoutComplete = (sale: SaleRecord) => {
    setTenderVisible(false);
    recordSale(sale);
    useReturnStore.getState().archiveSale(sale);

    // Immutable inventory deduction
    for (const item of sale.items) {
      useInventoryStore.getState().recordMovement({
        productId: item.productId,
        productName: item.productName,
        quantityChange: -item.quantity,
        movementType: 'SALE',
        referenceId: sale.invoiceNumber,
        reason: 'Point-of-Sale Counter Sale',
        performedBy: sale.cashierName,
      });
    }

    setLastSale(sale);
    setReceiptVisible(true);
  };

  const handleNewSale = () => {
    setReceiptVisible(false);
    setLastSale(null);
    clearCart();
    setCurrentScreen('POS');
  };

  const handleSwitchCashier = () => {
    clearCart();
    setCurrentScreen('LOGIN');
  };

  const handleLoginSuccess = () => {
    const cashierName = currentUser?.fullName || 'Incoming Cashier';
    if (!currentShift || currentShift.status === 'CLOSED') {
      startShift(cashierName, 2000.0);
    }
    setCurrentScreen('POS');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Screen Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.brandRow}>
          <Text style={styles.navBrand}>FBCPOS Tablet v1.0</Text>
          {isBypassMode && (
            <View style={styles.bypassIndicator}>
              <Text style={styles.bypassIndicatorText}>🔓 BYPASS ON</Text>
            </View>
          )}
        </View>

        <View style={styles.navTabs}>
          <TouchableOpacity
            style={[styles.tabBtn, currentScreen === 'POS' && styles.tabBtnActive]}
            onPress={() => setCurrentScreen('POS')}
          >
            <Text style={[styles.tabText, currentScreen === 'POS' && styles.tabTextActive]}>
              🛒 POS Cashier
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, currentScreen === 'INVENTORY' && styles.tabBtnActive]}
            onPress={() => setCurrentScreen('INVENTORY')}
          >
            <Text style={[styles.tabText, currentScreen === 'INVENTORY' && styles.tabTextActive]}>
              📦 Inventory & Stock
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, currentScreen === 'LOGIN' && styles.tabBtnActive]}
            onPress={() => setCurrentScreen('LOGIN')}
          >
            <Text style={[styles.tabText, currentScreen === 'LOGIN' && styles.tabTextActive]}>
              🔐 Cashier PIN / Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Content */}
      <View style={styles.content}>
        {currentScreen === 'POS' && (
          <POSScreen
            onNavigateToCheckout={handleNavigateToCheckout}
            onSwitchCashier={handleSwitchCashier}
          />
        )}
        {currentScreen === 'INVENTORY' && <InventoryScreen />}
        {currentScreen === 'LOGIN' && (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
      </View>

      {/* Checkout Flow Modals */}
      <TenderModal
        visible={tenderVisible}
        onClose={() => setTenderVisible(false)}
        onCheckoutComplete={handleCheckoutComplete}
      />

      <ReceiptModal
        visible={receiptVisible}
        sale={lastSale}
        onNewSale={handleNewSale}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  navBar: {
    height: 48,
    backgroundColor: '#0B1120',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navBrand: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bypassIndicator: {
    backgroundColor: '#78350F',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  bypassIndicatorText: {
    color: '#FCD34D',
    fontSize: 10,
    fontWeight: 'bold',
  },
  navTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  tabBtnActive: {
    backgroundColor: '#0284C7',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
});
