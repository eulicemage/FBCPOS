import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useProductStore } from '../store/productStore';

interface QuickAddProductModalProps {
  visible: boolean;
  initialBarcode?: string;
  onClose: () => void;
  onProductAdded?: (product: any) => void;
}

const UNITS = ['PCS', 'PACK', 'CAN', 'KG', 'TRAY', 'BOTTLE', 'BOX'];

export const QuickAddProductModal: React.FC<QuickAddProductModalProps> = ({
  visible,
  initialBarcode,
  onClose,
  onProductAdded,
}) => {
  const { categories, addProduct } = useProductStore();

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('2');
  const [selectedUnit, setSelectedUnit] = useState('PCS');
  const [isTaxable, setIsTaxable] = useState(true);

  useEffect(() => {
    if (visible) {
      setBarcode(initialBarcode || '');
      setName('');
      setSellingPrice('');
      setCostPrice('');
      setSelectedCategory(categories[1]?.id || '2');
      setSelectedUnit('PCS');
      setIsTaxable(true);
    }
  }, [visible, initialBarcode]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Product name is required.');
      return;
    }

    const price = parseFloat(sellingPrice);
    if (isNaN(price) || price < 0) {
      Alert.alert('Validation', 'Please enter a valid selling price.');
      return;
    }

    const cost = parseFloat(costPrice) || 0;

    const product = addProduct({
      name: name.trim(),
      barcode: barcode.trim() || undefined,
      sellingPrice: price,
      costPrice: cost,
      categoryId: selectedCategory,
      unitOfMeasure: selectedUnit,
      isTaxable,
      taxRate: isTaxable ? 0.12 : 0,
    });

    Alert.alert('Product Added', `"${product.name}" added to catalog at P${product.sellingPrice.toFixed(2)}.`);
    if (onProductAdded) {
      onProductAdded(product);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>➕ Quick Add Product</Text>
              <Text style={styles.subtitle}>Add new item to POS catalog on the fly</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Name */}
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Gardenia Wheat Bread 600g"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
            />

            {/* Barcode */}
            <Text style={styles.label}>Barcode / SKU (Optional, auto-generated if blank)</Text>
            <TextInput
              style={styles.input}
              placeholder="Scan or type barcode..."
              placeholderTextColor="#64748B"
              value={barcode}
              onChangeText={setBarcode}
              keyboardType="numeric"
            />

            {/* Price & Cost */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Selling Price (P) *</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="0.00"
                  placeholderTextColor="#64748B"
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Cost Price (P)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#64748B"
                  value={costPrice}
                  onChangeText={setCostPrice}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
              {categories.filter((c) => c.code !== 'ALL').map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.pill,
                    selectedCategory === cat.id && styles.pillActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selectedCategory === cat.id && styles.pillTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Unit */}
            <Text style={styles.label}>Unit of Measure</Text>
            <View style={styles.unitRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, selectedUnit === u && styles.unitBtnActive]}
                  onPress={() => setSelectedUnit(u)}
                >
                  <Text style={[styles.unitText, selectedUnit === u && styles.unitTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Taxable Toggle */}
            <TouchableOpacity
              style={styles.taxToggleRow}
              onPress={() => setIsTaxable(!isTaxable)}
            >
              <View style={[styles.checkbox, isTaxable && styles.checkboxActive]}>
                {isTaxable ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.taxToggleText}>12% VAT Taxable (Standard Retail)</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save & Add to POS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    width: '65%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: { color: '#F8FAFC', fontSize: 17, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold' },
  body: { padding: 16 },
  label: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  priceInput: {
    borderColor: '#10B981',
    fontWeight: 'bold',
    color: '#10B981',
    fontSize: 16,
  },
  row: { flexDirection: 'row' },
  pillRow: { flexDirection: 'row', marginBottom: 6 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  pillActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  pillText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  unitBtnActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  unitText: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold' },
  unitTextActive: { color: '#FFFFFF' },
  taxToggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12, gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  taxToggleText: { color: '#F8FAFC', fontSize: 13 },
  footer: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#CBD5E1', fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    height: 46,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
});

