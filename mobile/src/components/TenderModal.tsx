import React, { useState, useMemo, useEffect } from 'react';
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
import { useMemberStore, Member } from '../store/memberStore';
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

type PaymentTab = 'CASH' | 'POINTS' | 'CARD' | 'GCASH' | 'MAYA';

interface TenderModalProps {
  visible: boolean;
  onClose: () => void;
  onCheckoutComplete: (sale: SaleRecord) => void;
}

const CASH_DENOMINATIONS = [
  { label: 'EXACT', value: 0 },
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

  const { members, findMemberByBarcode, deductPoints } = useMemberStore();

  const [activeTab, setActiveTab] = useState<PaymentTab>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState('');

  // Points & Member state
  const [scannedMemberBarcode, setScannedMemberBarcode] = useState('');
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [splitCashRemainder, setSplitCashRemainder] = useState<number>(0);

  // Card fields
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardRefCode, setCardRefCode] = useState('');

  // E-wallet fields
  const [ewalletRef, setEwalletRef] = useState('');

  const totalDue = getTotalAmount();

  // On modal show, if customerName matches a member, auto-link
  useEffect(() => {
    if (visible) {
      setCashTendered(0);
      setCustomAmount('');
      if (customerName) {
        const found = members.find(
          (m) => m.fullName.toLowerCase() === customerName.toLowerCase()
        );
        if (found) {
          setActiveMember(found);
          setScannedMemberBarcode(found.barcode);
        }
      } else {
        // Default to first member for quick testing
        setActiveMember(members[0]);
        setScannedMemberBarcode(members[0]?.barcode || '');
      }
    }
  }, [visible, customerName, members]);

  const changeAmount = useMemo(() => {
    return Math.max(0, cashTendered - totalDue);
  }, [cashTendered, totalDue]);

  const handleDenomination = (value: number) => {
    if (value === 0) {
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

  const handleMemberBarcodeSearch = (code: string) => {
    setScannedMemberBarcode(code);
    const found = findMemberByBarcode(code);
    if (found) {
      setActiveMember(found);
    }
  };

  const buildPayments = (): TenderEntry[] => {
    switch (activeTab) {
      case 'CASH':
        return [
          {
            id: uuidv4(),
            method: 'CASH',
            amount: totalDue,
            amountTendered: cashTendered,
            changeAmount: Math.max(0, cashTendered - totalDue),
          },
        ];

      case 'POINTS': {
        if (!activeMember) return [];
        const available = activeMember.currentPointsBalance;
        const pointsToPay = Math.min(available, totalDue);
        const remainder = Math.round((totalDue - pointsToPay) * 100) / 100;
        const newBal = Math.round((available - pointsToPay) * 100) / 100;

        const paymentsList: TenderEntry[] = [
          {
            id: uuidv4(),
            method: 'POINTS',
            amount: pointsToPay,
            amountTendered: pointsToPay,
            changeAmount: 0,
            referenceNumber: `CARD-${activeMember.barcode}`,
            memberBarcode: activeMember.barcode,
            memberPointsBalance: newBal,
          },
        ];

        // If split tender needed because points balance < total due
        if (remainder > 0) {
          paymentsList.push({
            id: uuidv4(),
            method: 'CASH',
            amount: remainder,
            amountTendered: remainder,
            changeAmount: 0,
            referenceNumber: 'SPLIT-CASH',
          });
        }

        return paymentsList;
      }

      case 'CARD':
        return [
          {
            id: uuidv4(),
            method: 'CARD',
            amount: totalDue,
            amountTendered: totalDue,
            changeAmount: 0,
            referenceNumber: cardRefCode,
            cardBrand,
            cardLastFour,
          },
        ];

      case 'GCASH':
        return [
          {
            id: uuidv4(),
            method: 'EWALLET_GCASH',
            amount: totalDue,
            amountTendered: totalDue,
            changeAmount: 0,
            referenceNumber: ewalletRef,
          },
        ];

      case 'MAYA':
        return [
          {
            id: uuidv4(),
            method: 'EWALLET_MAYA',
            amount: totalDue,
            amountTendered: totalDue,
            changeAmount: 0,
            referenceNumber: ewalletRef,
          },
        ];

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

    // If points tender, deduct from memberStore
    if (activeTab === 'POINTS') {
      if (!activeMember) {
        Alert.alert('Error', 'Please select or scan a valid Member ID card.');
        return;
      }
      const pointsPay = Math.min(activeMember.currentPointsBalance, totalDue);
      const res = deductPoints(activeMember.id, pointsPay);
      if (!res.success) {
        Alert.alert('Points Error', res.error || 'Failed to deduct points.');
        return;
      }
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
      {
        customerName: activeTab === 'POINTS' ? activeMember?.fullName : customerName,
        customerTinId,
        seniorIdNumber,
        memberBarcode: activeMember?.barcode,
        memberPointsBalance:
          activeTab === 'POINTS' && activeMember
            ? Math.round((activeMember.currentPointsBalance - Math.min(activeMember.currentPointsBalance, totalDue)) * 100) / 100
            : undefined,
      },
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
      case 'POINTS':
        return (
          activeMember !== null &&
          activeMember.currentPointsBalance > 0
        );
      case 'CARD':
        return cardRefCode.length > 0 && cardLastFour.length === 4;
      case 'GCASH':
      case 'MAYA':
        return ewalletRef.length >= 10;
      default:
        return false;
    }
  }, [activeTab, cashTendered, totalDue, activeMember, cardRefCode, cardLastFour, ewalletRef]);

  const TABS: { key: PaymentTab; label: string; color: string }[] = [
    { key: 'CASH', label: 'CASH', color: '#10B981' },
    { key: 'POINTS', label: '🏷 POINTS (ID)', color: '#8B5CF6' },
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

          {/* Financials */}
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
          <Text style={styles.rightTitle}>Payment Tender</Text>

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
                placeholder="Custom cash amount..."
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

          {/* Membership Points Tender */}
          {activeTab === 'POINTS' && (
            <View style={styles.paymentBody}>
              <Text style={styles.fieldLabel}>Scan or Select Member ID Card Barcode</Text>
              <View style={styles.memberInputRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  placeholder="Type or scan ID barcode (e.g. 990001001)..."
                  placeholderTextColor="#64748B"
                  value={scannedMemberBarcode}
                  onChangeText={handleMemberBarcodeSearch}
                  keyboardType="numeric"
                />
              </View>

              {/* Member Selector Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberChips}>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.memberChip,
                      activeMember?.id === m.id && styles.memberChipActive,
                    ]}
                    onPress={() => {
                      setActiveMember(m);
                      setScannedMemberBarcode(m.barcode);
                    }}
                  >
                    <Text
                      style={[
                        styles.memberChipText,
                        activeMember?.id === m.id && styles.memberChipTextActive,
                      ]}
                    >
                      {m.fullName} (₱{m.currentPointsBalance.toFixed(0)})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {activeMember ? (
                <View style={styles.memberInfoCard}>
                  <View style={styles.memberCardHeader}>
                    <Text style={styles.cardMemberName}>{activeMember.fullName}</Text>
                    <Text style={styles.cardMemberId}>ID: {activeMember.barcode}</Text>
                  </View>
                  <Text style={styles.cardMemberDept}>{activeMember.department || 'Staff'}</Text>

                  <View style={styles.balanceBreakdown}>
                    <View style={styles.balanceItem}>
                      <Text style={styles.balSub}>Monthly Allowance:</Text>
                      <Text style={styles.balVal}>₱{activeMember.monthlyAllowance.toFixed(2)}</Text>
                    </View>
                    <View style={styles.balanceItem}>
                      <Text style={styles.balSub}>Remaining Consumable:</Text>
                      <Text style={[styles.balVal, { color: '#8B5CF6', fontSize: 16 }]}>
                        ₱{activeMember.currentPointsBalance.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Deduction calculation */}
                  <View style={styles.deductBox}>
                    <View style={styles.deductRow}>
                      <Text style={styles.deductLabel}>Total Due:</Text>
                      <Text style={styles.deductVal}>₱{totalDue.toFixed(2)}</Text>
                    </View>
                    <View style={styles.deductRow}>
                      <Text style={styles.deductLabel}>Points to Deduct:</Text>
                      <Text style={[styles.deductVal, { color: '#10B981' }]}>
                        -₱{Math.min(activeMember.currentPointsBalance, totalDue).toFixed(2)}
                      </Text>
                    </View>
                    {activeMember.currentPointsBalance < totalDue ? (
                      <View style={styles.splitWarning}>
                        <Text style={styles.splitWarningText}>
                          ⚠ Points insufficient. Remaining ₱{(totalDue - activeMember.currentPointsBalance).toFixed(2)} will be split to Cash.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.deductRow}>
                        <Text style={styles.deductLabel}>New Remaining Balance:</Text>
                        <Text style={[styles.deductVal, { color: '#8B5CF6' }]}>
                          ₱{(activeMember.currentPointsBalance - totalDue).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.noMemberCard}>
                  <Text style={styles.noMemberText}>No member selected</Text>
                  <Text style={styles.noMemberSub}>
                    Scan member barcode or tap a name above
                  </Text>
                </View>
              )}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', flexDirection: 'row' },
  leftPanel: { flex: 42, borderRightWidth: 1, borderRightColor: '#334155' },
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
  backBtnText: { color: '#CBD5E1', fontSize: 13, fontWeight: '600' },
  leftTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  itemsList: { flex: 1, padding: 10 },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  itemName: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },
  itemDetail: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  itemTotal: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  financials: {
    padding: 10,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  finLabel: { color: '#94A3B8', fontSize: 11 },
  finValue: { color: '#F8FAFC', fontSize: 11, fontWeight: '600' },
  finLabelSm: { color: '#64748B', fontSize: 10 },
  finValueSm: { color: '#94A3B8', fontSize: 10 },
  discBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discBadgeText: { color: '#6EE7B7', fontSize: 9, fontWeight: 'bold' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#334155', marginTop: 4, paddingTop: 6 },
  totalLabel: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold' },
  totalValue: { color: '#10B981', fontSize: 20, fontWeight: 'bold' },
  rightPanel: { flex: 58, padding: 14 },
  rightTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 12, justifyContent: 'center' },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#FFFFFF' },
  paymentBody: { flex: 1 },
  denomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  denomBtn: {
    width: '23%',
    height: 52,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  denomBtnActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  denomBtnText: { color: '#CBD5E1', fontSize: 14, fontWeight: 'bold' },
  denomBtnTextActive: { color: '#FFFFFF' },
  customInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 8,
  },
  tenderDisplay: { alignItems: 'center', padding: 10 },
  tenderedLabel: { color: '#94A3B8', fontSize: 14 },
  tenderedAmount: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
  changeText: { color: '#10B981', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  shortText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  fieldLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 4, marginTop: 6 },
  fieldInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  memberInputRow: { flexDirection: 'row', marginBottom: 6 },
  memberChips: { maxHeight: 36, marginBottom: 8 },
  memberChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 6,
  },
  memberChipActive: { backgroundColor: '#8B5CF6', borderColor: '#C4B5FD' },
  memberChipText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  memberChipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  memberInfoCard: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    padding: 12,
    marginTop: 4,
  },
  memberCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMemberName: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  cardMemberId: { color: '#C4B5FD', fontSize: 12, fontWeight: '600' },
  cardMemberDept: { color: '#64748B', fontSize: 11, marginTop: 2 },
  balanceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  balanceItem: { alignItems: 'flex-start' },
  balSub: { color: '#94A3B8', fontSize: 11 },
  balVal: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  deductBox: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
    gap: 4,
  },
  deductRow: { flexDirection: 'row', justifyContent: 'space-between' },
  deductLabel: { color: '#94A3B8', fontSize: 12 },
  deductVal: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  splitWarning: { backgroundColor: '#78350F', padding: 6, borderRadius: 4, marginTop: 4 },
  splitWarningText: { color: '#FCD34D', fontSize: 11, fontWeight: '600' },
  noMemberCard: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 10,
  },
  noMemberText: { color: '#64748B', fontSize: 14, fontWeight: 'bold' },
  noMemberSub: { color: '#475569', fontSize: 11, marginTop: 4 },
  brandRow: { flexDirection: 'row', gap: 6 },
  brandBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  brandBtnActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  brandBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  brandBtnTextActive: { color: '#FFFFFF' },
  cardAmountText: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 14 },
  confirmBtn: {
    height: 52,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  confirmBtnDisabled: { backgroundColor: '#334155', opacity: 0.6 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
});
