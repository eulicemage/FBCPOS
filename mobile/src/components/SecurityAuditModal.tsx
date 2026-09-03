import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useSecurityAuditStore, SecurityAuditEvent, SecurityEventType } from '../store/securityAuditStore';

interface SecurityAuditModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  visible,
  onClose,
}) => {
  const { events } = useSecurityAuditStore();
  const [filter, setFilter] = useState<'ALL' | 'BYPASS' | 'DRAWER' | 'VOID'>('ALL');

  const filteredEvents = events.filter((e) => {
    if (filter === 'ALL') return true;
    if (filter === 'BYPASS') return e.eventType.includes('BYPASS');
    if (filter === 'DRAWER') return e.eventType.includes('DRAWER');
    if (filter === 'VOID') return e.eventType.includes('VOID');
    return true;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🛡 Security & Privilege Audit Log</Text>
              <Text style={styles.subtitle}>
                Immutable event trail for bypass mode, drawer kicks & overrides
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {(['ALL', 'BYPASS', 'DRAWER', 'VOID'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    filter === f && styles.filterBtnTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Events Log List */}
          <ScrollView style={styles.list}>
            {filteredEvents.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No security events recorded.</Text>
              </View>
            ) : (
              filteredEvents.map((item) => (
                <View key={item.id} style={styles.eventCard}>
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.typeBadge,
                        item.eventType.includes('BYPASS') && styles.badgeBypass,
                        item.eventType.includes('DRAWER') && styles.badgeDrawer,
                        item.eventType.includes('VOID') && styles.badgeVoid,
                      ]}
                    >
                      <Text style={styles.typeBadgeText}>{item.eventType}</Text>
                    </View>

                    <View
                      style={[
                        styles.sevBadge,
                        item.severity === 'CRITICAL' && styles.sevCrit,
                        item.severity === 'HIGH' && styles.sevHigh,
                        item.severity === 'MEDIUM' && styles.sevMed,
                        item.severity === 'LOW' && styles.sevLow,
                      ]}
                    >
                      <Text style={styles.sevBadgeText}>{item.severity}</Text>
                    </View>
                  </View>

                  <Text style={styles.details}>{item.details}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      👤 {item.userName} ({item.userId})
                    </Text>
                    <Text style={styles.metaText}>Terminal: {item.terminalId}</Text>
                    <Text style={styles.metaText}>
                      🕒 {item.timestamp.slice(0, 16).replace('T', ' ')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerInfo}>
              Total Audit Entries: {events.length} • Certified Anti-Tamper
            </Text>
            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose}>
              <Text style={styles.closeFooterBtnText}>Close</Text>
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    width: '80%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#111827',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  filterBtnActive: { backgroundColor: '#0284C7' },
  filterBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  filterBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  list: { flex: 1, padding: 12 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748B', fontStyle: 'italic' },
  eventCard: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#334155' },
  badgeBypass: { backgroundColor: '#78350F' },
  badgeDrawer: { backgroundColor: '#065F46' },
  badgeVoid: { backgroundColor: '#7F1D1D' },
  typeBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  sevBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  sevCrit: { backgroundColor: '#7F1D1D' },
  sevHigh: { backgroundColor: '#C2410C' },
  sevMed: { backgroundColor: '#B45309' },
  sevLow: { backgroundColor: '#1E3A8A' },
  sevBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' },
  details: { color: '#F8FAFC', fontSize: 12, marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 6 },
  metaText: { color: '#64748B', fontSize: 10 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerInfo: { color: '#64748B', fontSize: 11 },
  closeFooterBtn: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  closeFooterBtnText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
});

