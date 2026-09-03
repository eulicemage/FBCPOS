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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'POS' | 'INVENTORY' | 'LOGIN'>('POS');
  const [tenderVisible, setTenderVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);

  const clearCart = useCartStore((s) => s.clearCart);

  const handleNavigateToCheckout = () => {
    setTenderVisible(true);
  };

  const handleCheckoutComplete = (sale: SaleRecord) => {
    setTenderVisible(false);
    setLastSale(sale);
    setReceiptVisible(true);
  };

  const handleNewSale = () => {
    setReceiptVisible(false);
    setLastSale(null);
    clearCart();
    setCurrentScreen('POS');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Screen Navigation Bar */}
      <View style={styles.navBar}>
        <Text style={styles.navBrand}>FBCPOS Tablet v1.0</Text>
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
          <POSScreen onNavigateToCheckout={handleNavigateToCheckout} />
        )}
        {currentScreen === 'INVENTORY' && <InventoryScreen />}
        {currentScreen === 'LOGIN' && (
          <LoginScreen onLoginSuccess={() => setCurrentScreen('POS')} />
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
  navBrand: {
    color: '#38BDF8',
    fontSize: 14,
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
