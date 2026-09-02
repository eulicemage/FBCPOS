import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Product } from '../../../shared/src';

interface PriceCheckModalProps {
  visible: boolean;
  products: Product[];
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export const PriceCheckModal: React.FC<PriceCheckModalProps> = ({
  visible,
  products,
  onClose,
  onAddToCart,
}) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Product | null>(null);

  const handleLookup = () => {
    if (!query.trim()) return;
    const clean = query.trim().toLowerCase();
    const match = products.find(
      (p) =>
        p.barcode === query.trim() ||
        p.sku.toLowerCase() === clean ||
        p.name.toLowerCase().includes(clean)
    );
    setResult(match || null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Price Inquiry / Checker (F6)</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Scan barcode or enter SKU/Name..."
              placeholderTextColor="#64748B"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleLookup}
              autoFocus
            />
            <TouchableOpacity style={styles.lookupBtn} onPress={handleLookup}>
              <Text style={styles.lookupBtnText}>Lookup</Text>
            </TouchableOpacity>
          </View>

          {result ? (
            <View style={styles.resultCard}>
              <Text style={styles.productName}>{result.name}</Text>
              <Text style={styles.skuBarcode}>
                SKU: {result.sku} | Barcode: {result.barcode}
              </Text>
              <Text style={styles.priceText}>₱{result.sellingPrice.toFixed(2)}</Text>
              <Text style={styles.taxInfo}>
                {result.isTaxable ? 'VAT-Inclusive (12% Standard)' : 'VAT-Exempt'} | UOM: {result.unitOfMeasure}
              </Text>

              <TouchableOpacity
                style={styles.addCartBtn}
                onPress={() => {
                  onAddToCart(result);
                  onClose();
                }}
              >
                <Text style={styles.addCartBtnText}>+ Add to Active Cart</Text>
              </TouchableOpacity>
            </View>
          ) : query ? (
            <View style={styles.notFound}>
              <Text style={styles.notFoundText}>No product found matching "{query}"</Text>
            </View>
          ) : null}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  lookupBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  productName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skuBarcode: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  priceText: {
    color: '#10B981',
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  taxInfo: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 16,
  },
  addCartBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addCartBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  notFound: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  notFoundText: {
    color: '#EF4444',
    fontSize: 14,
  },
});

