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
  ScrollView,
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
    defaultMonthlyAllowance,
    setDefaultMonthlyAllowance,
    searchMembers,
    addMember,
    updateMember,
    topUpPoints,
    deleteMember,
    resetMemberPoints,
    resetAllMonthlyAllowances,
  } = useMemberStore();

  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'LIST' | 'ENROLL' | 'EDIT' | 'TOPUP'>('LIST');

  // Active editing member
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Form fields for Enroll / Edit
  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formAllowance, setFormAllowance] = useState('1500');
  const [formBalance, setFormBalance] = useState('1500');

  // Top-Up field
  const [topUpAmount, setTopUpAmount] = useState('');

  // Global Default Allowance field
  const [globalAllowanceInput, setGlobalAllowanceInput] = useState(
    defaultMonthlyAllowance.toString()
  );

  const filteredMembers = searchMembers(search);

  const handleOpenEnroll = () => {
    setFormName('');
    setFormBarcode('');
    setFormDept('');
    setFormAllowance(defaultMonthlyAllowance.toString());
    setFormBalance(defaultMonthlyAllowance.toString());
    setMode('ENROLL');
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setFormName(member.fullName);
    setFormBarcode(member.barcode);
    setFormDept(member.department || '');
    setFormAllowance(member.monthlyAllowance.toString());
    setFormBalance(member.currentPointsBalance.toString());
    setMode('EDIT');
  };

  const handleOpenTopUp = (member: Member) => {
    setEditingMember(member);
    setTopUpAmount('500');
    setMode('TOPUP');
  };

  const handleSaveEnroll = () => {
    if (!formName.trim()) {
      Alert.alert('Validation', 'Full Name is required.');
      return;
    }

    const allowance = parseFloat(formAllowance) || defaultMonthlyAllowance;
    const balance = parseFloat(formBalance) || allowance;

    const created = addMember({
      fullName: formName.trim(),
      barcode: formBarcode.trim() || undefined,
      department: formDept.trim() || 'Staff',
      monthlyAllowance: allowance,
      initialBalance: balance,
    });

    Alert.alert(
      'Member Created',
      `${created.fullName} enrolled with ₱${created.monthlyAllowance.toFixed(2)} monthly allowance.`
    );
    setMode('LIST');
  };

  const handleSaveEdit = () => {
    if (!editingMember) return;
    if (!formName.trim()) {
      Alert.alert('Validation', 'Full Name is required.');
      return;
    }

    const allowance = parseFloat(formAllowance) || editingMember.monthlyAllowance;
    const balance = parseFloat(formBalance) || editingMember.currentPointsBalance;

    updateMember(editingMember.id, {
      fullName: formName.trim(),
      barcode: formBarcode.trim() || editingMember.barcode,
      department: formDept.trim() || editingMember.department,
      monthlyAllowance: allowance,
      currentPointsBalance: balance,
    });

    Alert.alert('Member Updated', `${formName} profile & points updated.`);
    setMode('LIST');
    setEditingMember(null);
  };

  const handleApplyTopUp = () => {
    if (!editingMember) return;
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid top-up amount.');
      return;
    }

    const res = topUpPoints(editingMember.id, amount);
    if (res.success) {
      Alert.alert(
        'Top-Up Successful',
        `Added +₱${amount.toFixed(2)} to ${editingMember.fullName}.\nNew Balance: ₱${res.newBalance.toFixed(2)}.`
      );
      setMode('LIST');
      setEditingMember(null);
    }
  };

  const handleDelete = (member: Member) => {
    Alert.alert(
      'Deactivate Member',
      `Deactivate ${member.fullName}'s membership card (${member.barcode})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            deleteMember(member.id);
            Alert.alert('Deactivated', `${member.fullName} removed from active list.`);
          },
        },
      ]
    );
  };

  const handleUpdateGlobalDefault = () => {
    const val = parseFloat(globalAllowanceInput);
    if (!isNaN(val) && val > 0) {
      setDefaultMonthlyAllowance(val);
      Alert.alert('Default Updated', `Global default monthly allowance set to ₱${val.toFixed(2)}.`);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>👥 Dynamic Member Points & Allowance System</Text>
              <Text style={styles.subtitle}>
                Customizable allowances, ID barcode cards & on-the-fly points top-up
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Global Default Allowance Setting Banner */}
          <View style={styles.globalBanner}>
            <Text style={styles.globalLabel}>Store Default Monthly Allowance:</Text>
            <View style={styles.globalInputRow}>
              <Text style={styles.pesoPrefix}>₱</Text>
              <TextInput
                style={styles.globalInput}
                value={globalAllowanceInput}
                onChangeText={setGlobalAllowanceInput}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.globalSaveBtn} onPress={handleUpdateGlobalDefault}>
                <Text style={styles.globalSaveText}>Set Default</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Top Search & Actions Bar */}
          <View style={styles.topActions}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search name, ID barcode (e.g. 990001001), department..."
              placeholderTextColor="#64748B"
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity
              style={[styles.addBtn, mode !== 'LIST' && styles.addBtnActive]}
              onPress={mode === 'LIST' ? handleOpenEnroll : () => setMode('LIST')}
            >
              <Text style={styles.addBtnText}>
                {mode === 'LIST' ? '➕ Enroll Member' : '← Back to List'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode: ENROLL or EDIT */}
          {mode === 'ENROLL' || mode === 'EDIT' ? (
            <ScrollView style={styles.formContainer}>
              <Text style={styles.formTitle}>
                {mode === 'ENROLL' ? 'Enroll New Member ID Card' : `Edit ${editingMember?.fullName}`}
              </Text>

              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Roberto Santos"
                placeholderTextColor="#64748B"
                value={formName}
                onChangeText={setFormName}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.fieldLabel}>ID Card Barcode</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 990001005"
                    placeholderTextColor="#64748B"
                    value={formBarcode}
                    onChangeText={setFormBarcode}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.fieldLabel}>Department / Company</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Operations"
                    placeholderTextColor="#64748B"
                    value={formDept}
                    onChangeText={setFormDept}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.fieldLabel}>Monthly Allowance (₱) *</Text>
                  <TextInput
                    style={[styles.input, styles.greenInput]}
                    placeholder="1500"
                    placeholderTextColor="#64748B"
                    value={formAllowance}
                    onChangeText={setFormAllowance}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.fieldLabel}>Current Points Balance (₱)</Text>
                  <TextInput
                    style={[styles.input, styles.purpleInput]}
                    placeholder="1500"
                    placeholderTextColor="#64748B"
                    value={formBalance}
                    onChangeText={setFormBalance}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formButtonRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('LIST')}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={mode === 'ENROLL' ? handleSaveEnroll : handleSaveEdit}
                >
                  <Text style={styles.saveBtnText}>
                    {mode === 'ENROLL' ? 'Save & Issue Card' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : mode === 'TOPUP' && editingMember ? (
            /* Mode: Quick TOP-UP */
            <View style={styles.topUpContainer}>
              <Text style={styles.formTitle}>➕ Top-Up Allowance Points</Text>
              <Text style={styles.topUpSub}>
                Member: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{editingMember.fullName}</Text> (ID: {editingMember.barcode})
              </Text>
              <Text style={styles.topUpCurrentBal}>
                Current Balance: <Text style={{ color: '#8B5CF6' }}>₱{editingMember.currentPointsBalance.toFixed(2)}</Text>
              </Text>

              <Text style={styles.fieldLabel}>Amount to Add (₱):</Text>
              <TextInput
                style={[styles.input, styles.topUpInput]}
                placeholder="500"
                placeholderTextColor="#64748B"
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="numeric"
              />

              {/* Quick Preset Buttons */}
              <View style={styles.quickPresetRow}>
                {[200, 500, 1000, 1500].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.presetBtn}
                    onPress={() => setTopUpAmount(amt.toString())}
                  >
                    <Text style={styles.presetText}>+₱{amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formButtonRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('LIST')}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveTopUpBtn} onPress={handleApplyTopUp}>
                  <Text style={styles.saveBtnText}>Confirm +₱{topUpAmount || '0'} Top-Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Mode: LIST */
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12 }}
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
                        <Text style={styles.pointsLabel}>Available:</Text>
                        <Text style={styles.pointsValue}>
                          ₱{item.currentPointsBalance.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.allowanceText}>
                        Allowance: ₱{item.monthlyAllowance.toFixed(2)}/mo (Used: ₱{item.consumedThisMonth.toFixed(2)})
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

                    <View style={styles.subActionRow}>
                      <TouchableOpacity
                        style={styles.topUpActionBtn}
                        onPress={() => handleOpenTopUp(item)}
                      >
                        <Text style={styles.topUpActionText}>➕ Top-Up</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.editActionBtn}
                        onPress={() => handleOpenEdit(item)}
                      >
                        <Text style={styles.editActionText}>✏ Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.resetActionBtn}
                        onPress={() => {
                          Alert.alert(
                            'Replenish Allowance',
                            `Reset ${item.fullName}'s points to their monthly allowance of ₱${item.monthlyAllowance.toFixed(2)}?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Reset',
                                onPress: () => resetMemberPoints(item.id),
                              },
                            ]
                          );
                        }}
                      >
                        <Text style={styles.resetActionText}>↺</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteActionBtn}
                        onPress={() => handleDelete(item)}
                      >
                        <Text style={styles.deleteActionText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
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
                  'Replenish All Allowances',
                  'Reset all members back to their full monthly allowance (e.g. start of month)?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Replenish All',
                      onPress: () => {
                        resetAllMonthlyAllowances();
                        Alert.alert('Replenished', 'All member allowances replenished.');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.bulkResetBtnText}>🔄 Replenish All Members (1st of Month)</Text>
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    width: '80%',
    maxHeight: '92%',
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
  title: { color: '#F8FAFC', fontSize: 17, fontWeight: 'bold' },
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
  globalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    justifyContent: 'space-between',
  },
  globalLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  globalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pesoPrefix: { color: '#10B981', fontSize: 14, fontWeight: 'bold' },
  globalInput: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 80,
    textAlign: 'center',
  },
  globalSaveBtn: {
    backgroundColor: '#065F46',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  globalSaveText: { color: '#6EE7B7', fontSize: 11, fontWeight: 'bold' },
  topActions: {
    flexDirection: 'row',
    padding: 10,
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
    height: 40,
    color: '#FFFFFF',
    fontSize: 13,
  },
  addBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addBtnActive: { backgroundColor: '#475569' },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  memberCard: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  barcodeBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#475569',
  },
  barcodeText: { color: '#38BDF8', fontSize: 11, fontWeight: '600' },
  memberDept: { color: '#64748B', fontSize: 11, marginTop: 2 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pointsLabel: { color: '#A7F3D0', fontSize: 10, fontWeight: 'bold' },
  pointsValue: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  allowanceText: { color: '#94A3B8', fontSize: 11 },
  cardActions: { alignItems: 'flex-end', gap: 6 },
  selectBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  selectBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  subActionRow: { flexDirection: 'row', gap: 4 },
  topUpActionBtn: {
    backgroundColor: '#4C1D95',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  topUpActionText: { color: '#DDD6FE', fontSize: 10, fontWeight: 'bold' },
  editActionBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  editActionText: { color: '#CBD5E1', fontSize: 10, fontWeight: '600' },
  resetActionBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resetActionText: { color: '#93C5FD', fontSize: 11, fontWeight: 'bold' },
  deleteActionBtn: {
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deleteActionText: { color: '#FCA5A5', fontSize: 10 },
  formContainer: { padding: 16 },
  formTitle: { color: '#38BDF8', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  fieldLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 4, marginTop: 6 },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 6,
  },
  greenInput: { color: '#10B981', fontWeight: 'bold', borderColor: '#10B981' },
  purpleInput: { color: '#8B5CF6', fontWeight: 'bold', borderColor: '#8B5CF6' },
  row: { flexDirection: 'row' },
  formButtonRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#CBD5E1', fontSize: 13, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    height: 46,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  topUpContainer: { padding: 20 },
  topUpSub: { color: '#94A3B8', fontSize: 13, marginBottom: 4 },
  topUpCurrentBal: { color: '#CBD5E1', fontSize: 14, marginBottom: 14 },
  topUpInput: { color: '#10B981', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  quickPresetRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  presetBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    alignItems: 'center',
  },
  presetText: { color: '#38BDF8', fontSize: 13, fontWeight: 'bold' },
  saveTopUpBtn: {
    flex: 2,
    height: 46,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bulkResetBtnText: { color: '#38BDF8', fontSize: 11, fontWeight: 'bold' },
  closeFooterBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeFooterBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
