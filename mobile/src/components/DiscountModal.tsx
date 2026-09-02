import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { DiscountType } from '../../../shared/src';

interface DiscountModalProps {
  visible: boolean;
  onApplyDiscount: (type: DiscountType, value: number, seniorId?: string, customerName?: string) => void;
  onClose: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  visible,
  onApplyDiscount,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<DiscountType>(DiscountType.PERCENTAGE);
  const [percentValue, setPercentValue] = useState('10');
  const [fixedValue, setFixedValue] = useState('');
  const [seniorId, setSeniorId] = useState('');
  const [seniorName, setSeniorName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleApply = () => {
    setErrorMsg('');

    if (selectedType === DiscountType.SENIOR_PWD) {
      if (!seniorId.trim() || !seniorName.trim()) {
        setErrorMsg('Senior/PWD ID Number and Customer Name are required by law');
        return;
      }
      onApplyDiscount(DiscountType.SENIOR_PWD, 20, seniorId.trim(), seniorName.trim());
      onClose();
    } else if (selectedType === DiscountType.PERCENTAGE) {
      const p = parseFloat(percentValue);
      if (isNaN(p) || p <= 0 || p > 100) {
        setErrorMsg('Please enter a valid percentage (1-100)');
        return;
      }
      onApplyDiscount(DiscountType.PERCENTAGE, p);
      onClose();
    } else if (selectedType === DiscountType.FIXED) {
      const f = parseFloat(fixedValue);
      if (isNaN(f) || f <= 0) {
        setErrorMsg('Please enter a valid fixed discount amount');
        return;
      }
      onApplyDiscount(DiscountType.FIXED, f);
      onClose();
    } else {
      onApplyDiscount(DiscountType.NONE, 0);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Apply Transaction Discount</Text>

          {/* Discount Type Selector */}
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, selectedType === DiscountType.SENIOR_PWD && styles.typeBtnActive]}
              onPress={() => setSelectedType(DiscountType.SENIOR_PWD)}
            >
              <Text style={[styles.typeBtnText, selectedType === DiscountType.SENIOR_PWD && styles.typeBtnTextActive]}>
                Senior / PWD (20%)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, selectedType === DiscountType.PERCENTAGE && styles.typeBtnActive]}
              onPress={() => setSelectedType(DiscountType.PERCENTAGE)}
            >
              <Text style={[styles.typeBtnText, selectedType === DiscountType.PERCENTAGE && styles.typeBtnTextActive]}>
                Percentage (%)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, selectedType === DiscountType.FIXED && styles.typeBtnActive]}
              onPress={() => setSelectedType(DiscountType.FIXED)}
            >
              <Text style={[styles.typeBtnText, selectedType === DiscountType.FIXED && styles.typeBtnTextActive]}>
                Fixed (PHP)
              </Text>
            </TouchableOpacity>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* Content based on type */}
          {selectedType === DiscountType.SENIOR_PWD ? (
            <View style={styles.contentSection}>
              <Text style={styles.noticeText}>
                Under RA 9994 / RA 10754, qualified purchases are exempt from 12% VAT and granted a 20% discount.
              </Text>
              <Text style={styles.inputLabel}>Senior / PWD ID Number*</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. OSCA-1234-5678"
                placeholderTextColor="#64748B"
                value={seniorId}
                onChangeText={setSeniorId}
              />
              <Text style={styles.inputLabel}>Cardholder Full Name*</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Juan dela Cruz"
                placeholderTextColor="#64748B"
                value={seniorName}
                onChangeText={setSeniorName}
              />
            </View>
          ) : selectedType === DiscountType.PERCENTAGE ? (
            <View style={styles.contentSection}>
              <Text style={styles.inputLabel}>Discount Percentage</Text>
              <View style={styles.presetRow}>
                {['5', '10', '15', '20'].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.presetBtn, percentValue === val && styles.presetBtnActive]}
                    onPress={() => setPercentValue(val)}
                  >
                    <Text style={[styles.presetBtnText, percentValue === val && styles.presetBtnTextActive]}>
                      {val}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Custom % (1-100)"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={percentValue}
                onChangeText={setPercentValue}
              />
            </View>
          ) : (
            <View style={styles.contentSection}>
              <Text style={styles.inputLabel}>Fixed Discount Amount (PHP)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 50.00"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={fixedValue}
                onChangeText={setFixedValue}
              />
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.removeDiscountBtn} onPress={() => onApplyDiscount(DiscountType.NONE, 0)}>
              <Text style={styles.removeDiscountText}>Remove Discount</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                <Text style={styles.applyBtnText}>Apply Discount</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 480,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  typeBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  contentSection: {
    marginBottom: 16,
  },
  noticeText: {
    color: '#F59E0B',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    height: 46,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#0F172A',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetBtnActive: {
    backgroundColor: '#38BDF8',
  },
  presetBtnText: {
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  presetBtnTextActive: {
    color: '#0F172A',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  removeDiscountBtn: {
    paddingVertical: 10,
  },
  removeDiscountText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

