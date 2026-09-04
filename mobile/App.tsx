import React, { useState } from "react";
import { StyleSheet, View, Alert, StatusBar } from "react-native";
import { POSScreen } from "./src/screens/POSScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { TenderModal } from "./src/components/TenderModal";
import { ReceiptModal } from "./src/components/ReceiptModal";
import { SaleRecord } from "./src/services/checkoutService";
import { useAuthStore } from "./src/store/authStore";
import { useCartStore } from "./src/store/cartStore";
import { useShiftStore } from "./src/store/shiftStore";
import { useReturnStore } from "./src/services/returnService";
import { useInventoryStore } from "./src/store/inventoryStore";
import { useSyncQueueStore } from "./src/store/syncQueueStore";
import { SyncService } from "./src/services/syncService";
import { DraftCartService } from "./src/services/draftCartService";
import { useDrawerStore } from "./src/store/drawerStore";

import { MoreMenuScreen } from "./src/screens/MoreMenuScreen";

type AppScreen = "POS" | "LOGIN" | "MORE";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("LOGIN");
  const [tenderVisible, setTenderVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);

  const clearCart = useCartStore((s) => s.clearCart);
  const loadCart = useCartStore((s) => s.loadCart);
  const { recordSale, startShift, currentShift } = useShiftStore();
  const { currentUser, isBypassMode } = useAuthStore();
  const { clearEntries } = useDrawerStore();

  // Start background auto-sync loop & check for crash recovery draft
  React.useEffect(() => {
    SyncService.startAutoSync(15000);

    const pendingDraft = DraftCartService.getPendingDraft();
    if (pendingDraft && pendingDraft.items.length > 0) {
      Alert.alert(
        "Unfinished Sale Detected",
        `A previous transaction with ${pendingDraft.itemCount} items (P${pendingDraft.totalAmount.toFixed(2)}) was interrupted. Recover this ticket?`,
        [
          { text: "Discard", style: "destructive", onPress: () => DraftCartService.clearDraft() },
          {
            text: "Recover Ticket",
            onPress: () => {
              loadCart(
                pendingDraft.items,
                pendingDraft.discountType,
                pendingDraft.discountValue,
                pendingDraft.customerName,
                pendingDraft.customerTinId,
                pendingDraft.seniorIdNumber
              );
              DraftCartService.clearDraft();
            },
          },
        ]
      );
    }

    return () => SyncService.stopAutoSync();
  }, [loadCart]);

  const handleNavigateToCheckout = () => {
    setTenderVisible(true);
  };

  const handleCheckoutComplete = (sale: SaleRecord) => {
    setTenderVisible(false);
    recordSale(sale);
    useReturnStore.getState().archiveSale(sale);

    useSyncQueueStore.getState().enqueue("SALE", sale.id, "INSERT", sale);

    for (const item of sale.items) {
      useInventoryStore.getState().recordMovement({
        productId: item.productId,
        productName: item.productName,
        quantityChange: -item.quantity,
        movementType: "SALE",
        referenceId: sale.invoiceNumber,
        reason: "Point-of-Sale Counter Sale",
        performedBy: sale.cashierName,
      });

      useSyncQueueStore.getState().enqueue("STOCK_MOVEMENT", item.productId, "INSERT", {
        productId: item.productId,
        productName: item.productName,
        quantityChange: -item.quantity,
        movementType: "SALE",
        referenceId: sale.invoiceNumber,
      });
    }

    DraftCartService.clearDraft();
    setLastSale(sale);
    setReceiptVisible(true);
  };

  const handleNewSale = () => {
    setReceiptVisible(false);
    setLastSale(null);
    clearCart();
    DraftCartService.clearDraft();
  };

  const handleSwitchCashier = () => {
    clearCart();
    clearEntries();
    setCurrentScreen("LOGIN");
  };

  const handleLoginSuccess = () => {
    if (!currentShift || currentShift.status === "CLOSED") {
      const cashierName = useAuthStore.getState().currentUser?.fullName || "Cashier";
      startShift(cashierName, useDrawerStore.getState().openingFloat);
    }
    setCurrentScreen("POS");
  };

  const handleOpenMore = () => {
    setCurrentScreen("MORE");
  };

  const handleCloseMore = () => {
    setCurrentScreen("POS");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#141a2e" />

      {currentScreen === "LOGIN" && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}

      {currentScreen === "POS" && (
        <POSScreen
          onNavigateToCheckout={handleNavigateToCheckout}
          onSwitchCashier={handleSwitchCashier}
          onOpenMore={handleOpenMore}
        />
      )}

      {currentScreen === "MORE" && (
        <MoreMenuScreen
          onClose={handleCloseMore}
          onSwitchCashier={handleSwitchCashier}
        />
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#141a2e",
  },
});
