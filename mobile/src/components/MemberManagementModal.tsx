import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useMemberStore, Member } from '../store/memberStore';

interface MemberManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMember?: (member: Member) => void;
}

export const MemberManagementModal: React.FC<MemberManagementModalProps> = ({
  visible,
  onClose,
  onSelectMember,
}) => {
  const {
    members,
    searchMembers,
    addMember,
    updateMember,
    resetMemberPoints,
    resetAllMonthlyAllowances,
  } = useMemberStore();

  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newAllowance, setNewAllowance] = useState('1500');

  const filteredMembers = searchMembers(search);

  const handleCreateMember = () => {
    if (!newFullName.trim()) {
      Alert.alert('Validation', 'Full Name is required.');
      return;
    }

    const allowance = parseFloat(newAllowance);
    if (isNaN(allowance) || allowance < 0) {
      Alert.alert('Validation', 'Please enter a valid monthly points allowance.');
      return;
    }

    const created = addMember({
      fullName: newFullName.trim(),
      barcode: newBarcode.trim() || undefined,
      department: newDept.trim() || 'Staff',
      monthlyAllowance: allowance,
    });

    Alert.alert('Member Created', `${created.fullName} enrolled with P${created.monthlyAllowance.toFixed(2)} monthly allowance.`);
    setIsAdding(false);
    setNewFullName('');
    setNewBarcode('');
    setNewDept('');
    setNewAllowance('1500');
  };

  const handleResetPoints = (member: Member) => {
    Alert.alert(
      'Reset Points',
      `Reset ${member.fullName}'s points balance back to full monthly allowance of P${member.monthlyAllowance.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Points',
          onPress: () => {
            resetMemberPoints(member.id);
            Alert.alert('Points Reset', `${member.fullName}'s balance restored to P${member.monthlyAllowance.toFixed(2)}.`);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>👥 Member ID & Monthly Points Allowance</Text>
              <Text style={styles.subtitle}>
                Scan or manage consumable monthly allowance (e.g. ₱1,500/mo)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search & Actions Bar */}
          <View style={styles.topActions}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search member name, ID barcode (e.g. 990001001)..."
              placeholderTextColor="#64748B"
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setIsAdding(!isAdding)}
            >
              <Text style={styles.addBtnText}>{isAdding ? 'List View' : '➕ Enroll Member'}</Text>
            </TouchableOpacity>
          </View>

          {/* Enroll Form */}
          {isAdding ? (
            <View style={styles.enrollForm}>
              <Text style={styles.formTitle}>Enroll New Member / Employee Card</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name (e.g. Roberto Santos) *"
                placeholderTextColor="#64748B"
                value={newFullName}
                onChangeText={setNewFullName}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="ID Card Barcode (e.g. 990001005)"
                  placeholderTextColor="#64748B"
                  value={newBarcode}
                  onChangeText={setNewBarcode}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 8 }]}
                  placeholder="Department / Company"
                  placeholderTextColor="#64748B"
                  value={newDept}
                  onChangeText={setNewDept}
                />
              </View>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Monthly Consumable Allowance (PHP):</Text>
                  <TextInput
                    style={[styles.input, styles.pointsInput]}
                    placeholder="1500"
                    placeholderTextColor="#64748B"
                    value={newAllowance}
                    onChangeText={setNewAllowance}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.saveMemberBtn} onPress={handleCreateMember}>
                <Text style={styles.saveMemberBtnText}>Save & Issue Membership Card</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Member List */
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 14 }}
              renderItem={({ item }) => (
                <View style={styles.memberCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.memberName}>{item.fullName}</Text>
                      <View style={styles.barcodeBadge}>
                        <Text style={styles.barcodeText}>ID: {item.barcode}</Text>
                      </View>
                    </View>
                    <Text style={styles.memberDept}>
                      {item.department || 'Staff'} • {item.memberNumber}
                    </Text>

                    {/* Points Progress */}
                    <View style={styles.pointsRow}>
                      <View style={styles.pointsBadge}>
                        <Text style={styles.pointsLabel}>Balance:</Text>
                        <Text style={styles.pointsValue}>
                          P{item.currentPointsBalance.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.allowanceText}>
                        Allowance: P{item.monthlyAllowance.toFixed(2)} / mo (Used: P{item.consumedThisMonth.toFixed(2)})
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    {onSelectMember && (
                      <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() => {
                          onSelectMember(item);
                          onClose();
                        }}
                      >
                        <Text style={styles.selectBtnText}>Select for Cart</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.resetPointsBtn}
                      onPress={() => handleResetPoints(item)}
                    >
                      <Text style={styles.resetPointsText}>↺ Reset</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.bulkResetBtn}
              onPress={() => {
                Alert.alert(
                  'Monthly Reset',
                  'Reset all members to their full monthly allowance (e.g. 1st of month replenishment)?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Replenish All',
                      onPress: () => {
                        resetAllMonthlyAllowances();
                        Alert.alert('Monthly Allowance Reset', 'All member balances replenished to full monthly allowance.');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.bulkResetBtnText}>🔄 Monthly Replenishment (All)</Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    width: '75%',
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
  topActions: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 42,
    color: '#FFFFFF',
    fontSize: 13,
  },
  addBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  memberCard: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  barcodeBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#475569',
  },
  barcodeText: { color: '#38BDF8', fontSize: 11, fontWeight: '600' },
  memberDept: { color: '#64748B', fontSize: 12, marginTop: 2 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pointsLabel: { color: '#A7F3D0', fontSize: 11, fontWeight: 'bold' },
  pointsValue: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  allowanceText: { color: '#94A3B8', fontSize: 11 },
  cardActions: { alignItems: 'flex-end', gap: 6 },
  selectBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  resetPointsBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resetPointsText: { color: '#CBD5E1', fontSize: 11, fontWeight: '600' },
  enrollForm: { padding: 16 },
  formTitle: { color: '#38BDF8', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 10,
  },
  pointsInput: { color: '#10B981', fontWeight: 'bold', fontSize: 16, borderColor: '#10B981' },
  fieldLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 4 },
  row: { flexDirection: 'row' },
  saveMemberBtn: {
    height: 48,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveMemberBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkResetBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bulkResetBtnText: { color: '#38BDF8', fontSize: 12, fontWeight: 'bold' },
  closeFooterBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeFooterBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
