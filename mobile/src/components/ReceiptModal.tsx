import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { SaleRecord } from '../services/checkoutService';
import { DiscountType } from '../../../shared/src';

interface ReceiptModalProps {
  visible: boolean;
  sale: SaleRecord | null;
  onNewSale: () => void;
  onPrint?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  sale,
  onNewSale,
  onPrint,
}) => {
  if (!sale) return null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return 'Cash';
      case 'CARD': return 'Card';
      case 'EWALLET_GCASH': return 'GCash';
      case 'EWALLET_MAYA': return 'Maya';
      default: return method;
    }
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.receiptCard}>
          <ScrollView contentContainerStyle={styles.receiptContent}>
            {/* Receipt Header */}
            <Text style={styles.companyName}>FOODBASKETS CORP</Text>
            <Text style={styles.branchInfo}>
              Branch {sale.branchCode} • Terminal {sale.terminalNumber}
            </Text>
            <Text style={styles.vatTin}>VAT REG TIN: 000-000-000-000</Text>

            <View style={styles.divider} />

            {/* Invoice Details */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice #:</Text>
              <Text style={styles.detailValue}>{sale.invoiceNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{formatDate(sale.createdAt)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cashier:</Text>
              <Text style={styles.detailValue}>{sale.cashierName}</Text>
            </View>
            {sale.customerName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer:</Text>
                <Text style={styles.detailValue}>{sale.customerName}</Text>
              </View>
            )}
            {sale.seniorIdNumber && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>SC/PWD ID:</Text>
                <Text style={styles.detailValue}>{sale.seniorIdNumber}</Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Items Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>ITEM</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.5, textAlign: 'center' }]}>QTY</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>PRICE</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
            </View>

            {/* Items */}
            {sale.items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={[styles.tableCell, { flex: 0.5, textAlign: 'center' }]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {item.unitPrice.toFixed(2)}
                </Text>
                <Text style={[styles.tableCellBold, { flex: 1, textAlign: 'right' }]}>
                  {item.totalAmount.toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            {/* Summary */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₱{sale.subtotalAmount.toFixed(2)}</Text>
            </View>

            {sale.discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Discount {sale.discountType === DiscountType.SENIOR_PWD ? '(SC/PWD 20%)' : `(${sale.discountValue}%)`}
                </Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  -₱{sale.discountAmount.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelSm}>VATable Sales</Text>
              <Text style={styles.summaryValueSm}>₱{sale.vatableAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelSm}>VAT-Exempt Sales</Text>
              <Text style={styles.summaryValueSm}>₱{sale.vatExemptAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelSm}>12% VAT</Text>
              <Text style={styles.summaryValueSm}>₱{sale.taxAmount.toFixed(2)}</Text>
            </View>

            <View style={[styles.summaryRow, styles.totalSummaryRow]}>
              <Text style={styles.totalLabel}>TOTAL DUE</Text>
              <Text style={styles.totalValue}>₱{sale.totalAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            {/* Payment Details */}
            {sale.payments.map((payment) => (
              <View key={payment.id} style={styles.summaryRow}>
                <Text style={styles.paymentLabel}>
                  {getPaymentMethodLabel(payment.method)}
                  {payment.referenceNumber ? ` (${payment.referenceNumber})` : ''}
                </Text>
                <Text style={styles.paymentValue}>
                  ₱{payment.amountTendered.toFixed(2)}
                </Text>
              </View>
            ))}

            {sale.totalChange > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.changeLabel}>CHANGE</Text>
                <Text style={styles.changeValue}>₱{sale.totalChange.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Footer */}
            <Text style={styles.footerText}>Thank you for shopping at</Text>
            <Text style={styles.footerText}>FoodBaskets Corp!</Text>
            <Text style={styles.footerSmall}>This serves as your official receipt.</Text>
            <Text style={styles.footerSmall}>
              POS Accreditation No. FP000000000-0000000000
            </Text>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.printBtn}
              onPress={onPrint || (() => {})}
            >
              <Text style={styles.printBtnText}>🖨 Print Receipt</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.newSaleBtn} onPress={onNewSale}>
              <Text style={styles.newSaleBtnText}>✅ New Sale</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '60%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  receiptContent: {
    padding: 24,
  },

  // Header
  companyName: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  branchInfo: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  vatTin: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 11,
  },
  detailValue: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '600',
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  tableCell: {
    color: '#1E293B',
    fontSize: 11,
  },
  tableCellBold: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  summaryLabel: { color: '#475569', fontSize: 12 },
  summaryValue: { color: '#0F172A', fontSize: 12, fontWeight: '600' },
  summaryLabelSm: { color: '#94A3B8', fontSize: 10 },
  summaryValueSm: { color: '#64748B', fontSize: 10 },
  totalSummaryRow: {
    borderTopWidth: 2,
    borderTopColor: '#0F172A',
    marginTop: 6,
    paddingTop: 6,
  },
  totalLabel: { color: '#0F172A', fontSize: 16, fontWeight: 'bold' },
  totalValue: { color: '#0F172A', fontSize: 22, fontWeight: 'bold' },

  // Payment
  paymentLabel: { color: '#475569', fontSize: 12 },
  paymentValue: { color: '#0F172A', fontSize: 12, fontWeight: '600' },
  changeLabel: { color: '#10B981', fontSize: 14, fontWeight: 'bold' },
  changeValue: { color: '#10B981', fontSize: 18, fontWeight: 'bold' },

  // Footer
  footerText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
  footerSmall: {
    color: '#94A3B8',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  printBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  newSaleBtn: {
    flex: 1.5,
    height: 48,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSaleBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
