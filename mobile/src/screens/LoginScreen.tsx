import React, { useState } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, Alert, Modal, ScrollView, Switch,
} from "react-native";
import { useAuthStore } from "../store/authStore";
import { useDrawerStore } from "../store/drawerStore";
import { usePermissionStore } from "../store/permissionStore";
import { UserRole } from "../../../shared/src";

const C = {
  navy:     "#1a2340",
  navyDark: "#141a2e",
  green:    "#2d7a2d",
  orange:   "#e05020",
  yellow:   "#f5c518",
  white:    "#ffffff",
  gray400:  "#9aa5b4",
  gray600:  "#4a5568",
  gray100:  "#f5f7fa",
};

const PROGRAMMER_PIN = "9999";

interface LoginScreenProps {
  onLoginSuccess?: () => void;
  onProgrammerBypass?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onProgrammerBypass }) => {
  const { currentBranch, currentTerminal, setAuth, isBypassMode, toggleBypassMode } = useAuthStore();
  const { setOpeningFloat } = useDrawerStore();
  const { findAccountByPin, getRoleById } = usePermissionStore();

  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showProgrammer, setShowProgrammer] = useState(false);
  const [programmerPin, setProgrammerPin] = useState("");
  const [programmerError, setProgrammerError] = useState("");

  // Cash declaration modal
  const [showCashDecl, setShowCashDecl] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [cashInput, setCashInput] = useState("");

  // Programmer settings state
  const [serverMode, setServerMode] = useState<"standalone" | "lan" | "cloud">("standalone");
  const [serverIp, setServerIp] = useState("192.168.1.1");
  const [serverPort, setServerPort] = useState("3000");
  const [featInventory, setFeatInventory] = useState(true);
  const [featDrawer, setFeatDrawer] = useState(true);
  const [featPrint, setFeatPrint] = useState(true);
  const [featPricing, setFeatPricing] = useState(true);

  const handlePinDigit = (d: string) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setErrorMsg("");
    if (next.length >= 4) verifyPin(next);
  };

  const verifyPin = (p: string) => {
    // Check programmer PIN first
    if (p === PROGRAMMER_PIN) {
      setPin("");
      setShowProgrammer(true);
      return;
    }

    // Check staff accounts
    const account = findAccountByPin(p);
    if (account) {
      const role = getRoleById(account.roleId);
      const user = {
        id: account.id,
        username: account.username,
        fullName: account.fullName,
        role: role?.name === "Manager" ? UserRole.MANAGER : role?.name === "Programmer" ? UserRole.ADMIN : UserRole.CASHIER,
        branchId: currentBranch?.id || "BR-001",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPendingUser(user);
      setPin("");
      setShowCashDecl(true);
    } else if (p.length >= 4) {
      setErrorMsg("Incorrect PIN. Try again.");
      setPin("");
    }
  };

  const handleCashDeclConfirm = () => {
    const amount = parseFloat(cashInput.replace(/,/g, "")) || 0;
    setOpeningFloat(amount);
    setAuth(pendingUser, currentBranch!, currentTerminal!);
    setShowCashDecl(false);
    setCashInput("");
    setPendingUser(null);
    if (onLoginSuccess) onLoginSuccess();
  };

  const handleProgrammerBypass = () => {
    if (programmerPin !== PROGRAMMER_PIN) {
      setProgrammerError("Incorrect programmer PIN.");
      return;
    }
    setProgrammerError("");
    setShowProgrammer(false);
    setProgrammerPin("");
    if (onProgrammerBypass) {
      onProgrammerBypass();
    } else {
      // Enter POS directly as programmer
      const progUser = {
        id: "USR-PROG-001",
        username: "programmer",
        fullName: "Programmer",
        role: UserRole.ADMIN,
        branchId: currentBranch?.id || "BR-001",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAuth(progUser, currentBranch!, currentTerminal!);
      toggleBypassMode(true);
      if (onLoginSuccess) onLoginSuccess();
    }
  };

  const renderPinDots = () =>
    [0,1,2,3,4,5].map((i) => (
      <View key={i} style={[styles.pinDot, i < pin.length && styles.pinDotFilled]} />
    ));

  return (
    <SafeAreaView style={styles.root}>
      {/* FBC Logo */}
      <View style={styles.logoWrap}>
        <Text style={styles.logoF}>f</Text>
        <Text style={styles.logoB}>b</Text>
        <Text style={styles.logoC}>c</Text>
      </View>
      <Text style={styles.logoSubText}>FOOD BASKETS CORPORATION</Text>
      <Text style={styles.posLabel}>Point of Sale System</Text>

      {/* Branch / Terminal */}
      <Text style={styles.branchText}>{currentBranch?.name} — {currentTerminal?.name}</Text>

      {/* PIN dots */}
      <View style={styles.pinDotsRow}>{renderPinDots()}</View>
      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {/* PIN pad */}
      <View style={styles.pinPad}>
        {["1","2","3","4","5","6","7","8","9","CLR","0","⌫"].map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.pinKey, (k === "CLR" || k === "⌫") && styles.pinKeyAlt]}
            onPress={() => {
              if (k === "⌫") setPin((p) => p.slice(0,-1));
              else if (k === "CLR") { setPin(""); setErrorMsg(""); }
              else handlePinDigit(k);
            }}
          >
            <Text style={styles.pinKeyText}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Programmer bypass button */}
      <TouchableOpacity style={styles.progBtn} onPress={() => setShowProgrammer(true)}>
        <Text style={styles.progBtnText}>🛠 Programmer</Text>
      </TouchableOpacity>

      {/* ─── CASH DECLARATION MODAL ─────────────────────────── */}
      <Modal visible={showCashDecl} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.cashModal}>
            <Text style={styles.cashModalTitle}>💰 Opening Cash Declaration</Text>
            <Text style={styles.cashModalSub}>Welcome, {pendingUser?.fullName}. Enter the cash float in the drawer before starting your shift.</Text>
            <TextInput
              style={styles.cashInput}
              value={cashInput}
              onChangeText={setCashInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={C.gray400}
              autoFocus
            />
            <Text style={styles.cashHint}>₱ Amount in Drawer</Text>
            <TouchableOpacity style={styles.cashConfirmBtn} onPress={handleCashDeclConfirm}>
              <Text style={styles.cashConfirmText}>CONFIRM & OPEN REGISTER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── PROGRAMMER SETTINGS MODAL ──────────────────────── */}
      <Modal visible={showProgrammer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.progModal}>
            <View style={styles.progModalHeader}>
              <Text style={styles.progModalTitle}>🛠 Programmer Settings</Text>
              <TouchableOpacity onPress={() => { setShowProgrammer(false); setProgrammerPin(""); setProgrammerError(""); }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* PIN entry */}
              <Text style={styles.progSection}>Programmer PIN</Text>
              <TextInput
                style={styles.progInput}
                value={programmerPin}
                onChangeText={setProgrammerPin}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                placeholder="Enter programmer PIN"
                placeholderTextColor={C.gray400}
              />
              {programmerError ? <Text style={styles.errorText}>{programmerError}</Text> : null}

              {/* Server mode */}
              <Text style={styles.progSection}>Server Connection</Text>
              <View style={styles.segRow}>
                {(["standalone","lan","cloud"] as const).map((m) => (
                  <TouchableOpacity key={m} style={[styles.segBtn, serverMode===m && styles.segBtnActive]} onPress={() => setServerMode(m)}>
                    <Text style={[styles.segBtnText, serverMode===m && styles.segBtnTextActive]}>{m.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {serverMode !== "standalone" && (
                <View style={styles.inputRow}>
                  <TextInput style={[styles.progInput, { flex: 2 }]} value={serverIp} onChangeText={setServerIp} placeholder="Server IP" placeholderTextColor={C.gray400} />
                  <TextInput style={[styles.progInput, { flex: 1, marginLeft: 6 }]} value={serverPort} onChangeText={setServerPort} placeholder="Port" placeholderTextColor={C.gray400} keyboardType="number-pad" />
                </View>
              )}

              {/* Feature toggles */}
              <Text style={styles.progSection}>POS Feature Toggles</Text>
              {[
                ["Inventory Tracking", featInventory, setFeatInventory],
                ["Cash Drawer Kick on Sale", featDrawer, setFeatDrawer],
                ["Receipt Printing", featPrint, setFeatPrint],
                ["Pricing Editor (Add/Edit Products)", featPricing, setFeatPricing],
              ].map(([label, val, setter]: any) => (
                <View key={label as string} style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{label as string}</Text>
                  <Switch value={val as boolean} onValueChange={setter} trackColor={{ true: C.green }} />
                </View>
              ))}

              {/* Show main form */}
              <TouchableOpacity style={[styles.progActionBtn, { backgroundColor: C.green }]} onPress={handleProgrammerBypass}>
                <Text style={styles.progActionBtnText}>✔ AUTHENTICATE & ENTER POS</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.progActionBtn, { backgroundColor: C.navy, marginTop: 6 }]} onPress={() => Alert.alert("SQL Console", "SQL scripting console would open here.")}>
                <Text style={styles.progActionBtnText}>⚙ SQL Scripting Console</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navyDark, alignItems: "center", justifyContent: "center" },
  logoWrap: { flexDirection: "row", marginBottom: 4 },
  logoF: { fontSize: 64, fontWeight: "900", color: "#2d7a2d" },
  logoB: { fontSize: 64, fontWeight: "900", color: "#e05020" },
  logoC: { fontSize: 64, fontWeight: "900", color: "#f5c518" },
  logoSubText: { fontSize: 12, color: C.gray400, letterSpacing: 2, marginBottom: 4 },
  posLabel: { fontSize: 16, color: C.white, marginBottom: 6 },
  branchText: { fontSize: 12, color: C.gray400, marginBottom: 24 },
  pinDotsRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  pinDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.gray400 },
  pinDotFilled: { backgroundColor: C.green, borderColor: C.green },
  errorText: { color: "#ef5350", fontSize: 12, marginBottom: 8 },
  pinPad: { flexDirection: "row", flexWrap: "wrap", width: 216, gap: 8, justifyContent: "center", marginTop: 12 },
  pinKey: { width: 64, height: 56, borderRadius: 10, backgroundColor: "#243050", alignItems: "center", justifyContent: "center" },
  pinKeyAlt: { backgroundColor: "#1e2d50" },
  pinKeyText: { fontSize: 20, fontWeight: "700", color: C.white },
  progBtn: { marginTop: 20, paddingVertical: 8, paddingHorizontal: 20 },
  progBtnText: { fontSize: 12, color: C.gray400, textDecorationLine: "underline" },
  // Cash modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" },
  cashModal: { backgroundColor: C.white, borderRadius: 16, padding: 28, width: 340, alignItems: "center" },
  cashModalTitle: { fontSize: 18, fontWeight: "900", color: C.navyDark, marginBottom: 8 },
  cashModalSub: { fontSize: 13, color: C.gray600, textAlign: "center", marginBottom: 20 },
  cashInput: { fontSize: 36, fontWeight: "900", color: C.navyDark, textAlign: "center", borderBottomWidth: 2, borderBottomColor: C.green, width: "100%", paddingBottom: 4, marginBottom: 4 },
  cashHint: { fontSize: 12, color: C.gray400, marginBottom: 20 },
  cashConfirmBtn: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 24, width: "100%", alignItems: "center" },
  cashConfirmText: { color: C.white, fontWeight: "900", fontSize: 14 },
  // Programmer modal
  progModal: { backgroundColor: C.navyDark, borderRadius: 16, padding: 20, width: 440, maxHeight: "85%", borderWidth: 1, borderColor: "#2d3f6a" },
  progModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  progModalTitle: { fontSize: 16, fontWeight: "900", color: C.white },
  closeBtn: { fontSize: 18, color: C.gray400 },
  progSection: { fontSize: 11, color: C.gray400, letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  progInput: { backgroundColor: "#243050", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: C.white, fontSize: 14, marginBottom: 4 },
  segRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  segBtn: { flex: 1, borderRadius: 8, borderWidth: 1.5, borderColor: "#2d3f6a", paddingVertical: 8, alignItems: "center" },
  segBtnActive: { backgroundColor: C.green, borderColor: C.green },
  segBtnText: { fontSize: 11, fontWeight: "700", color: C.gray400 },
  segBtnTextActive: { color: C.white },
  inputRow: { flexDirection: "row" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1e2d50" },
  toggleLabel: { fontSize: 13, color: C.white },
  progActionBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  progActionBtnText: { color: C.white, fontWeight: "900", fontSize: 14 },
});
