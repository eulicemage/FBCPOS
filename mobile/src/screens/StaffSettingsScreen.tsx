import React, { useState } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, Modal, Switch, ScrollView, Alert,
} from "react-native";
import { usePermissionStore, ALL_FEATURES, FEATURE_LABELS, FeatureKey, StaffRole, StaffAccount } from "../store/permissionStore";

const C = {
  navy: "#1a2340", navyDark: "#141a2e", navySide: "#1e2d50",
  green: "#2d7a2d", orange: "#e05020", yellow: "#f5c518",
  white: "#ffffff", gray100: "#f5f7fa", gray200: "#e8ecf0",
  gray400: "#9aa5b4", gray600: "#4a5568", red: "#c62828", blue: "#1565c0",
};

type StaffTab = "ACCOUNTS" | "ROLES" | "PERMISSIONS";

export const StaffSettingsScreen: React.FC = () => {
  const { roles, accounts, addRole, updateRoleFeatures, deleteRole, addAccount, updateAccount, deactivateAccount, getRoleById } = usePermissionStore();
  const [tab, setTab] = useState<StaffTab>("ACCOUNTS");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);

  // Add Account form
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRoleId, setNewRoleId] = useState(roles[0]?.id ?? "");

  // Add Role form
  const [newRoleName, setNewRoleName] = useState("");

  const handleSaveAccount = () => {
    if (!newName.trim() || !newPin.trim() || newPin.length < 4) {
      Alert.alert("Validation", "Enter full name and a 4-6 digit PIN.");
      return;
    }
    addAccount({ fullName: newName.trim(), username: newUsername.trim() || newName.toLowerCase().replace(" ","."), pin: newPin, roleId: newRoleId, isActive: true });
    setNewName(""); setNewUsername(""); setNewPin(""); setShowAddAccount(false);
    Alert.alert("Success", "Staff account created.");
  };

  const handleSaveRole = () => {
    if (!newRoleName.trim()) { Alert.alert("Validation", "Enter a role name."); return; }
    addRole(newRoleName.trim(), []);
    setNewRoleName(""); setShowAddRole(false);
  };

  const handleToggleFeature = (roleId: string, feature: FeatureKey) => {
    const role = getRoleById(roleId);
    if (!role || role.isBuiltIn) { Alert.alert("Notice", "Built-in roles cannot be edited. Duplicate this role to customize it."); return; }
    const current = role.allowedFeatures;
    const updated = current.includes(feature) ? current.filter((f) => f !== feature) : [...current, feature];
    updateRoleFeatures(roleId, updated);
  };

  const selectedRole = selectedRoleId ? getRoleById(selectedRoleId) : null;

  return (
    <View style={styles.root}>
      {/* Tab row */}
      <View style={styles.tabRow}>
        {(["ACCOUNTS", "ROLES", "PERMISSIONS"] as StaffTab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── ACCOUNTS ── */}
      {tab === "ACCOUNTS" && (
        <View style={styles.pane}>
          <View style={styles.paneHeader}>
            <Text style={styles.paneTitle}>Staff Accounts</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddAccount(true)}>
              <Text style={styles.addBtnText}>+ Add Account</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={accounts}
            keyExtractor={(a) => a.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowName}>{item.fullName}</Text>
                  <Text style={styles.rowSub}>@{item.username} · PIN: {"•".repeat(item.pin.length)}</Text>
                </View>
                <View style={styles.rowRight}>
                  <View style={[styles.roleBadge, { backgroundColor: item.roleId === "role-manager" || item.roleId === "role-programmer" ? C.green : C.blue }]}>
                    <Text style={styles.roleBadgeText}>{getRoleById(item.roleId)?.name ?? "Staff"}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: item.isActive ? "#4caf50" : C.gray400 }]} />
                  {!item.isActive ? null : (
                    <TouchableOpacity onPress={() => Alert.alert("Deactivate", `Deactivate ${item.fullName}?`, [{ text: "Cancel" }, { text: "Deactivate", style: "destructive", onPress: () => deactivateAccount(item.id) }])}>
                      <Text style={styles.deactivateLink}>Deactivate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* ── ROLES ── */}
      {tab === "ROLES" && (
        <View style={styles.pane}>
          <View style={styles.paneHeader}>
            <Text style={styles.paneTitle}>Role Types</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddRole(true)}>
              <Text style={styles.addBtnText}>+ New Role</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={roles}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, selectedRoleId === item.id && styles.rowSelected]}
                onPress={() => { setSelectedRoleId(item.id); setTab("PERMISSIONS"); }}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowSub}>{item.allowedFeatures.length} features granted {item.isBuiltIn ? "· Built-in" : "· Custom"}</Text>
                </View>
                <Text style={styles.chevron}>{">"}</Text>
              </TouchableOpacity>
            )}
          />
          <Text style={styles.hint}>Tap a role to edit its permissions.</Text>
        </View>
      )}

      {/* ── PERMISSIONS ── */}
      {tab === "PERMISSIONS" && (
        <View style={styles.pane}>
          <View style={styles.paneHeader}>
            <Text style={styles.paneTitle}>
              {selectedRole ? `Permissions: ${selectedRole.name}` : "Select a role from the Roles tab"}
            </Text>
            {selectedRole?.isBuiltIn && <Text style={styles.builtInTag}>Built-in (read-only)</Text>}
          </View>
          {!selectedRole ? (
            <View style={styles.emptyState}><Text style={styles.emptyText}>Go to the Roles tab and tap a role to manage its permissions.</Text></View>
          ) : (
            <ScrollView>
              {ALL_FEATURES.map((feature) => {
                const granted = selectedRole.allowedFeatures.includes(feature);
                return (
                  <View key={feature} style={styles.permRow}>
                    <View style={styles.permLeft}>
                      <Text style={[styles.permLabel, !granted && styles.permLabelOff]}>{FEATURE_LABELS[feature]}</Text>
                      {!granted && <Text style={styles.grayedTag}>GRAYED OUT in POS</Text>}
                    </View>
                    <Switch
                      value={granted}
                      onValueChange={() => handleToggleFeature(selectedRole.id, feature)}
                      trackColor={{ true: C.green, false: C.gray200 }}
                      disabled={selectedRole.isBuiltIn}
                    />
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Add Account Modal */}
      <Modal visible={showAddAccount} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Staff Account</Text>
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={C.gray400} value={newName} onChangeText={setNewName} />
            <TextInput style={styles.input} placeholder="Username (optional)" placeholderTextColor={C.gray400} value={newUsername} onChangeText={setNewUsername} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="PIN (4-6 digits)" placeholderTextColor={C.gray400} value={newPin} onChangeText={setNewPin} keyboardType="number-pad" maxLength={6} secureTextEntry />
            <Text style={styles.fieldLabel}>Role:</Text>
            <View style={styles.rolePickerRow}>
              {roles.map((r) => (
                <TouchableOpacity key={r.id} style={[styles.rolePill, newRoleId === r.id && styles.rolePillActive]} onPress={() => setNewRoleId(r.id)}>
                  <Text style={[styles.rolePillText, newRoleId === r.id && styles.rolePillTextActive]}>{r.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddAccount(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAccount}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Role Modal */}
      <Modal visible={showAddRole} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Role</Text>
            <TextInput style={styles.input} placeholder="Role name (e.g. Supervisor)" placeholderTextColor={C.gray400} value={newRoleName} onChangeText={setNewRoleName} />
            <Text style={styles.hint}>The role will start with no permissions. Go to Permissions tab to assign features.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddRole(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRole}><Text style={styles.saveBtnText}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray100 },
  tabRow: { flexDirection: "row", backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray200 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: C.green },
  tabText: { fontSize: 12, fontWeight: "700", color: C.gray400, letterSpacing: 1 },
  tabTextActive: { color: C.green },
  pane: { flex: 1, padding: 12 },
  paneHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  paneTitle: { fontSize: 15, fontWeight: "900", color: C.navy },
  addBtn: { backgroundColor: C.green, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: C.white, fontWeight: "700", fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 8, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: C.gray200 },
  rowSelected: { borderColor: C.green },
  rowLeft: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: "700", color: C.navy },
  rowSub: { fontSize: 11, color: C.gray400, marginTop: 2 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  roleBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeText: { color: C.white, fontSize: 10, fontWeight: "700" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  deactivateLink: { fontSize: 11, color: C.red, textDecorationLine: "underline" },
  chevron: { fontSize: 16, color: C.gray400 },
  hint: { fontSize: 11, color: C.gray400, marginTop: 8, fontStyle: "italic" },
  builtInTag: { fontSize: 10, color: C.orange, fontWeight: "700", backgroundColor: "#fff3e0", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, color: C.gray400, textAlign: "center" },
  permRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.gray200 },
  permLeft: { flex: 1 },
  permLabel: { fontSize: 13, color: C.navy },
  permLabelOff: { color: C.gray400 },
  grayedTag: { fontSize: 9, color: C.orange, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modal: { backgroundColor: C.white, borderRadius: 12, padding: 20, width: 360 },
  modalTitle: { fontSize: 16, fontWeight: "900", color: C.navy, marginBottom: 14 },
  input: { borderWidth: 1, borderColor: C.gray200, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.navy, marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: C.gray600, marginBottom: 6 },
  rolePickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  rolePill: { borderRadius: 16, borderWidth: 1.5, borderColor: C.gray200, paddingHorizontal: 12, paddingVertical: 6 },
  rolePillActive: { backgroundColor: C.green, borderColor: C.green },
  rolePillText: { fontSize: 12, color: C.gray600 },
  rolePillTextActive: { color: C.white, fontWeight: "700" },
  modalBtns: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.gray200 },
  cancelBtnText: { color: C.gray600 },
  saveBtn: { backgroundColor: C.green, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: C.white, fontWeight: "700" },
});
