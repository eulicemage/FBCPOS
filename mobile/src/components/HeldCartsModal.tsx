import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useHeldCartStore, HeldCart } from '../store/heldCartStore';

interface HeldCartsModalProps {
  visible: boolean;
  onRecallCart: (cart: HeldCart) => void;
  onClose: () => void;
}

export const HeldCartsModal: React.FC<HeldCartsModalProps> = ({
  visible,
  onRecallCart,
  onClose,
}) => {
  const { heldCarts, removeHeldCart } = useHeldCartStore();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Held Sales Queue ({heldCarts.length})</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {heldCarts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No suspended sales currently held.</Text>
            </View>
          ) : (
            <FlatList
              data={heldCarts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const time = new Date(item.heldAt).toLocaleTimeString();
                return (
                  <View style={styles.cartCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ticketNumber}>{item.ticketNumber}</Text>
                      <Text style={styles.heldTime}>Held at: {time}</Text>
                      <Text style={styles.itemSummary}>
                        {item.itemCount} items — ₱{item.subtotal.toFixed(2)}
                      </Text>
                      {item.customerName ? (
                        <Text style={styles.customerName}>Customer: {item.customerName}</Text>
                      ) : null}
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.discardBtn}
                        onPress={() => removeHeldCart(item.id)}
                      >
                        <Text style={styles.discardBtnText}>Discard</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.recallBtn}
                        onPress={() => {
                          onRecallCart(item);
                          onClose();
                        }}
                      >
                        <Text style={styles.recallBtnText}>Recall Sale</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
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
    width: 520,
    maxHeight: 500,
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
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  cartCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ticketNumber: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  heldTime: {
    color: '#64748B',
    fontSize: 12,
  },
  itemSummary: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  customerName: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  discardBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  discardBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recallBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  recallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

