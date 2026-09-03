import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useCartStore } from '../store/cartStore';
import { DiscountType } from '../../../shared/src';
import {
  TenderEntry,
  PaymentMethod,
  validatePayments,
  finalizeCheckout,
  SaleRecord,
  CheckoutConfig,
} from '../services/checkoutService';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────

type PaymentTab = 'CASH' | 'CARD' | 'GCASH' | 'MAYA' | 'SPLIT';

interface TenderModalProps {
  visible: boolean;
  onClose: () => void;
  onCheckoutComplete: (sale: SaleRecord) => void;
}

const CASH_DENOMINATIONS = [
  { label: 'EXACT', value: 0 }, // Special: uses totalDue
  { label: '₱20', value: 20 },
  { label: '₱50', value: 50 },
  { label: '₱100', value: 100 },
  { label: '₱200', value: 200 },
  { label: '₱500', value: 500 },
  { label: '₱1,000', value: 1000 },
  { label: '₱2,000', value: 2000 },
];

const CARD_BRANDS = ['Visa', 'Mastercard', 'BancNet', 'JCB'];

export const TenderModal: React.FC<TenderModalProps> = ({
  visible,
  onClose,
  onCheckoutComplete,
}) => {
  const {
    items,
    discountType,
    discountValue,
    customerName,
    customerTinId,
    seniorIdNumber,
    getSubtotal,
    getDiscountAmount,
    getVatableAmount,
    getVatExemptAmount,
    getTaxAmount,
    getTotalAmount,
  } = useCartStore();

  const [activeTab, setActiveTab] = useState<PaymentTab>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState('');

  // Card fields
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardRefCode, setCardRefCode] = useState('');

  // E-wallet fields
  const [ewalletRef, setEwalletRef] = useState('');

  const totalDue = getTotalAmount();

  const changeAmount = useMemo(() => {
    return Math.max(0, cashTendered - totalDue);
  }, [cashTendered, totalDue]);

  const handleDenomination = (value: number) => {
    if (value === 0) {
      // EXACT
      setCashTendered(totalDue);
    } else {
      setCashTendered(value);
    }
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text: string) => {
    setCustomAmount(text);
    const num = parseFloat(text);
    if (!isNaN(num)) {
      setCashTendered(num);
    }
  };

  const buildPayments = (): TenderEntry[] => {
    switch (activeTab) {
      case 'CASH':
        return [{
          id: uuidv4(),
          method: 'CASH' as PaymentMethod,
          amount: totalDue,
          amountTendered: cashTendered,
          changeAmount: Math.max(0, cashTendered - totalDue),
        }];

      case 'CARD':
        return [{
          id: uuidv4(),
          method: 'CARD' as PaymentMethod,
          amount: totalDue,
          amountTendered: totalDue,
          changeAmount: 0,
          referenceNumber: cardRefCode,
          cardBrand,
          cardLastFour,
        }];

      case 'GCASH':
        return [{
          id: uuidv4(),
          method: 'EWALLET_GCASH' as PaymentMethod,
          amount: totalDue,
          amountTendered: totalDue,
          changeAmount: 0,
          referenceNumber: ewalletRef,
        }];

      case 'MAYA':
        return [{
          id: uuidv4(),
          method: 'EWALLET_MAYA' as PaymentMethod,
          amount: totalDue,
          amountTendered: totalDue,
          changeAmount: 0,
          referenceNumber: ewalletRef,
        }];

      default:
        return [];
    }
  };

  const handleConfirmPayment = () => {
    const payments = buildPayments();
    const validation = validatePayments(payments, totalDue);

    if (!validation.isValid) {
      Alert.alert('Payment Error', validation.errors.join('\n'));
      return;
    }

    const config: CheckoutConfig = {
      branchCode: '001',
      terminalNumber: '1',
      cashierId: 'cashier-default',
      cashierName: 'Cashier',
    };

    const result = finalizeCheckout(
      items,
      payments,
      {
        subtotalAmount: getSubtotal(),
        discountType,
        discountValue,
        discountAmount: getDiscountAmount(),
        vatableAmount: getVatableAmount(),
        vatExemptAmount: getVatExemptAmount(),
        taxAmount: getTaxAmount(),
        totalAmount: totalDue,
      },
      { customerName, customerTinId, seniorIdNumber },
      config
    );

    if (result.success && result.sale) {
      onCheckoutComplete(result.sale);
    } else {
      Alert.alert('Checkout Failed', result.errors?.join('\n') || 'Unknown error.');
    }
  };

  const isPaymentReady = useMemo(() => {
    switch (activeTab) {
      case 'CASH':
        return cashTendered >= totalDue;
      case 'CARD':
        return cardRefCode.length > 0 && cardLastFour.length === 4;
      case 'GCASH':
      case 'MAYA':
        return ewalletRef.length >= 10;
      default:
        return false;
    }
  }, [activeTab, cashTendered, totalDue, cardRefCode, cardLastFour, ewalletRef]);

  const TABS: { key: PaymentTab; label: string; color: string }[] = [
    { key: 'CASH', label: 'CASH', color: '#10B981' },
    { key: 'CARD', label: 'CARD', color: '#6B7280' },
    { key: 'GCASH', label: 'GCASH', color: '#2563EB' },
    { key: 'MAYA', label: 'MAYA', color: '#059669' },
  ];

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* Left Panel: Order Summary */}
        <View style={styles.leftPanel}>
          <View style={styles.leftHeader}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.leftTitle}>Order Summary</Text>
          </View>

          <ScrollView style={styles.itemsList}>
            {items.map((item) => (
              <View key={item.productId} style={styles.summaryItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDetail}>
                    {item.quantity} × ₱{item.unitPrice.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>₱{item.total.toFixed(2)}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Financial Breakdown */}
          <View style={styles.financials}>
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>Subtotal</Text>
              <Text style={styles.finValue}>₱{getSubtotal().toFixed(2)}</Text>
            </View>
            {getDiscountAmount() > 0 && (
              <View style={styles.finRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.finLabel}>Discount</Text>
                  <View style={styles.discBadge}>
                    <Text style={styles.discBadgeText}>
                      {discountType === DiscountType.SENIOR_PWD ? 'SC/PWD' : `${discountValue}%`}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.finValue, { color: '#10B981' }]}>
                  -₱{getDiscountAmount().toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.finRow}>
              <Text style={styles.finLabelSm}>VATable Sales</Text>
              <Text style={styles.finValueSm}>₱{getVatableAmount().toFixed(2)}</Text>
            </View>
            <View style={styles.finRow}>
              <Text style={styles.finLabelSm}>VAT-Exempt</Text>
              <Text style={styles.finValueSm}>₱{getVatExemptAmount().toFixed(2)}</Text>
            </View>
            <View style={styles.finRow}>
              <Text style={styles.finLabelSm}>12% VAT</Text>
              <Text style={styles.finValueSm}>₱{getTaxAmount().toFixed(2)}</Text>
            </View>
            <View style={[styles.finRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL DUE</Text>
              <Text style={styles.totalValue}>₱{totalDue.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Right Panel: Payment Entry */}
        <View style={styles.rightPanel}>
          <Text style={styles.rightTitle}>Payment</Text>

          {/* Payment Method Tabs */}
          <View style={styles.tabRow}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabBtn,
                  activeTab === tab.key && { backgroundColor: tab.color },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === tab.key && styles.tabBtnTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cash Payment */}
          {activeTab === 'CASH' && (
            <View style={styles.paymentBody}>
              <View style={styles.denomGrid}>
                {CASH_DENOMINATIONS.map((denom) => (
                  <TouchableOpacity
                    key={denom.label}
                    style={[
                      styles.denomBtn,
                      cashTendered === (denom.value === 0 ? totalDue : denom.value) &&
                        styles.denomBtnActive,
                    ]}
                    onPress={() => handleDenomination(denom.value)}
                  >
                    <Text
                      style={[
                        styles.denomBtnText,
                        cashTendered === (denom.value === 0 ? totalDue : denom.value) &&
                          styles.denomBtnTextActive,
                      ]}
                    >
                      {denom.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.customInput}
                placeholder="Custom amount..."
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={customAmount}
                onChangeText={handleCustomAmountChange}
              />

              <View style={styles.tenderDisplay}>
                <Text style={styles.tenderedLabel}>
                  Amount Tendered: <Text style={styles.tenderedAmount}>₱{cashTendered.toFixed(2)}</Text>
                </Text>
                {cashTendered >= totalDue && (
                  <Text style={styles.changeText}>
                    Change: ₱{changeAmount.toFixed(2)}
                  </Text>
                )}
                {cashTendered > 0 && cashTendered < totalDue && (
                  <Text style={styles.shortText}>
                    Short: ₱{(totalDue - cashTendered).toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Card Payment */}
          {activeTab === 'CARD' && (
            <View style={styles.paymentBody}>
              <Text style={styles.fieldLabel}>Card Brand</Text>
              <View style={styles.brandRow}>
                {CARD_BRANDS.map((brand) => (
                  <TouchableOpacity
                    key={brand}
                    style={[styles.brandBtn, cardBrand === brand && styles.brandBtnActive]}
                    onPress={() => setCardBrand(brand)}
                  >
                    <Text
                      style={[styles.brandBtnText, cardBrand === brand && styles.brandBtnTextActive]}
                    >
                      {brand}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Last 4 Digits</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="XXXX"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                maxLength={4}
                value={cardLastFour}
                onChangeText={setCardLastFour}
              />
              <Text style={styles.fieldLabel}>Approval / Reference Code</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Enter terminal approval code"
                placeholderTextColor="#64748B"
                value={cardRefCode}
                onChangeText={setCardRefCode}
              />
              <Text style={styles.cardAmountText}>Amount: ₱{totalDue.toFixed(2)}</Text>
            </View>
          )}

          {/* GCash / Maya */}
          {(activeTab === 'GCASH' || activeTab === 'MAYA') && (
            <View style={styles.paymentBody}>
              <Text style={styles.fieldLabel}>
                {activeTab === 'GCASH' ? 'GCash' : 'Maya'} Transaction Reference
              </Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="12-digit reference number"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                maxLength={12}
                value={ewalletRef}
                onChangeText={setEwalletRef}
              />
              <Text style={styles.cardAmountText}>Amount: ₱{totalDue.toFixed(2)}</Text>
            </View>
          )}

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmBtn, !isPaymentReady && styles.confirmBtnDisabled]}
            disabled={!isPaymentReady}
            onPress={handleConfirmPayment}
          >
            <Text style={styles.confirmBtnText}>
              CONFIRM PAYMENT — ₱{totalDue.toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
  },

  // Left Panel
  leftPanel: {
    flex: 45,
    borderRightWidth: 1,
    borderRightColor: '#334155',
    display: 'flex',
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  backBtnText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  leftTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemsList: {
    flex: 1,
    padding: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  itemName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  itemDetail: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  itemTotal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Financials
  financials: {
    padding: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  finLabel: { color: '#94A3B8', fontSize: 12 },
  finValue: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },
  finLabelSm: { color: '#64748B', fontSize: 11 },
  finValueSm: { color: '#94A3B8', fontSize: 11 },
  discBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discBadgeText: { color: '#6EE7B7', fontSize: 9, fontWeight: 'bold' },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 6,
    paddingTop: 8,
  },
  totalLabel: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  totalValue: { color: '#10B981', fontSize: 24, fontWeight: 'bold' },

  // Right Panel
  rightPanel: {
    flex: 55,
    padding: 16,
    display: 'flex',
  },
  rightTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  tabBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },

  // Payment Body
  paymentBody: {
    flex: 1,
  },
  denomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  denomBtn: {
    width: '23%',
    height: 56,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  denomBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  denomBtnText: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: 'bold',
  },
  denomBtnTextActive: {
    color: '#FFFFFF',
  },
  customInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
  },
  tenderDisplay: {
    alignItems: 'center',
    padding: 16,
  },
  tenderedLabel: {
    color: '#94A3B8',
    fontSize: 16,
  },
  tenderedAmount: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 20,
  },
  changeText: {
    color: '#10B981',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  shortText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },

  // Card / E-wallet fields
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6,
    marginTop: 12,
  },
  fieldInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  brandRow: {
    flexDirection: 'row',
    gap: 8,
  },
  brandBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  brandBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  brandBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  brandBtnTextActive: {
    color: '#FFFFFF',
  },
  cardAmountText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },

  // Confirm Button
  confirmBtn: {
    height: 56,
    backgroundColor: '#10B981',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  confirmBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
