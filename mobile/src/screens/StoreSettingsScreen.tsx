import React, { useState } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, Switch,
} from "react-native";
import { useAuthStore } from "../store/authStore";

const C = {
  navy: "#1a2340", navyDark: "#141a2e", green: "#2d7a2d", orange: "#e05020",
  white: "#ffffff", gray100: "#f5f7fa", gray200: "#e8ecf0", gray400: "#9aa5b4",
  gray600: "#4a5568", blue: "#1565c0",
};

type StoreTab = "DETAILS" | "RECEIPT" | "PRINTER" | "DISPLAY";

export const StoreSettingsScreen: React.FC = () => {
  const { currentBranch, currentTerminal } = useAuthStore();
  const [tab, setTab] = useState<StoreTab>("DETAILS");

  // Store details (editable local state for demo)
  const [storeName, setStoreName] = useState(currentBranch?.name ?? "FoodBaskets Branch");
  const [storeAddress, setStoreAddress] = useState(currentBranch?.address ?? "123 Rizal Ave, Manila");
  const [storeTin, setStoreTin] = useState(currentBranch?.taxId ?? "000-000-000-000");
  const [storePhone, setStorePhone] = useState("+63 2 XXXX XXXX");

  // Receipt footer
  const [footerLine1, setFooterLine1] = useState("Thank you for shopping at FoodBaskets!");
  const [footerLine2, setFooterLine2] = useState("Goods sold are non-returnable without receipt.");
  const [footerLine3, setFooterLine3] = useState("*** VAT REG TIN: " + (currentBranch?.taxId ?? "000-000-000-000") + " ***");

  // Printer
  const [printerIp, setPrinterIp] = useState("192.168.1.100");
  const [printerPort, setPrinterPort] = useState("9100");
  const [paperWidth, setPaperWidth] = useState("70mm");
  const [autoKickDrawer, setAutoKickDrawer] = useState(true);
  const [autoPrint, setAutoPrint] = useState(true);

  // Display
  const [displayEnabled, setDisplayEnabled] = useState(false);
  const [displayIp, setDisplayIp] = useState("192.168.1.101");

  const TAB_LABELS: Record<StoreTab, string> = {
    DETAILS: "Store Details",
    RECEIPT: "Receipt Footer",
    PRINTER: "Printer Devices",
    DISPLAY: "Customer Display",
  };

  return (
    <View style={styles.root}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        {(["DETAILS","RECEIPT","PRINTER","DISPLAY"] as StoreTab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{TAB_LABELS[t]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.pane} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── DETAILS ── */}
        {tab === "DETAILS" && (
          <View>
            <Text style={styles.section}>Store Information</Text>
            <FieldRow label="Store / Branch Name" value={storeName} onChange={setStoreName} />
            <FieldRow label="Address" value={storeAddress} onChange={setStoreAddress} multiline />
            <FieldRow label="VAT Registered TIN" value={storeTin} onChange={setStoreTin} />
            <FieldRow label="Phone Number" value={storePhone} onChange={setStorePhone} keyboardType="phone-pad" />
            <Text style={styles.section}>Terminal Info (Read-only)</Text>
            <InfoRow label="Terminal" value={currentTerminal?.name ?? "T1"} />
            <InfoRow label="Terminal #" value={currentTerminal?.terminalNumber ?? "T1"} />
            <InfoRow label="Branch ID" value={currentBranch?.id ?? "BR-001"} />
            <TouchableOpacity style={styles.saveBtn} onPress={() => Alert.alert("Saved", "Store details saved successfully.")}>
              <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── RECEIPT ── */}
        {tab === "RECEIPT" && (
          <View>
            <Text style={styles.section}>Receipt Footer Text</Text>
            <Text style={styles.hint}>These lines appear at the bottom of every printed receipt (Xprinter 70x50mm, 40 columns).</Text>
            <FieldRow label="Footer Line 1" value={footerLine1} onChange={setFooterLine1} />
            <FieldRow label="Footer Line 2" value={footerLine2} onChange={setFooterLine2} />
            <FieldRow label="Footer Line 3" value={footerLine3} onChange={setFooterLine3} />
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>Preview (40 cols)</Text>
              <Text style={styles.previewText}>{"─".repeat(40)}</Text>
              <Text style={styles.previewText}>{footerLine1}</Text>
              <Text style={styles.previewText}>{footerLine2}</Text>
              <Text style={styles.previewText}>{footerLine3}</Text>
              <Text style={styles.previewText}>{"─".repeat(40)}</Text>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={() => Alert.alert("Saved", "Receipt footer text saved.")}>
              <Text style={styles.saveBtnText}>SAVE FOOTER</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PRINTER ── */}
        {tab === "PRINTER" && (
          <View>
            <Text style={styles.section}>Xprinter Configuration</Text>
            <FieldRow label="Printer IP Address" value={printerIp} onChange={setPrinterIp} keyboardType="numeric" />
            <FieldRow label="Port" value={printerPort} onChange={setPrinterPort} keyboardType="number-pad" />
            <Text style={styles.fieldLabel}>Paper Width</Text>
            <View style={styles.segRow}>
              {["58mm","70mm","80mm"].map((w) => (
                <TouchableOpacity key={w} style={[styles.seg, paperWidth===w && styles.segActive]} onPress={() => setPaperWidth(w)}>
                  <Text style={[styles.segText, paperWidth===w && styles.segTextActive]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ToggleRow label="Auto-kick cash drawer on payment" value={autoKickDrawer} onChange={setAutoKickDrawer} />
            <ToggleRow label="Auto-print receipt on checkout" value={autoPrint} onChange={setAutoPrint} />
            <TouchableOpacity style={styles.testBtn} onPress={() => Alert.alert("Test Print", "Sending test print to " + printerIp + ":" + printerPort)}>
              <Text style={styles.testBtnText}>🖨 Send Test Print</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => Alert.alert("Saved", "Printer settings saved.")}>
              <Text style={styles.saveBtnText}>SAVE PRINTER SETTINGS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── DISPLAY ── */}
        {tab === "DISPLAY" && (
          <View>
            <Text style={styles.section}>Customer Display / 2nd Monitor</Text>
            <ToggleRow label="Enable customer display output" value={displayEnabled} onChange={setDisplayEnabled} />
            {displayEnabled && (
              <FieldRow label="Display IP / Screen ID" value={displayIp} onChange={setDisplayIp} />
            )}
            <Text style={styles.hint}>The customer display shows the order summary and total to the customer during checkout.</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={() => Alert.alert("Saved", "Display settings saved.")}>
              <Text style={styles.saveBtnText}>SAVE DISPLAY SETTINGS</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const FieldRow: React.FC<{ label: string; value: string; onChange: (v: string) => void; multiline?: boolean; keyboardType?: any }> =
  ({ label, value, onChange, multiline, keyboardType }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && { height: 72, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={fieldStyles.infoRow}>
    <Text style={fieldStyles.infoLabel}>{label}</Text>
    <Text style={fieldStyles.infoValue}>{value}</Text>
  </View>
);

const ToggleRow: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <View style={fieldStyles.toggleRow}>
    <Text style={fieldStyles.toggleLabel}>{label}</Text>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: C.green }} />
  </View>
);

const fieldStyles = StyleSheet.create({
  label: { fontSize: 11, color: C.gray400, marginBottom: 4, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: C.gray200, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.navy, backgroundColor: C.white },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.gray200 },
  infoLabel: { fontSize: 13, color: C.gray600 },
  infoValue: { fontSize: 13, fontWeight: "700", color: C.navy },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.gray200 },
  toggleLabel: { fontSize: 13, color: C.navy, flex: 1 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray100 },
  tabScroll: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray200, maxHeight: 48 },
  tab: { paddingHorizontal: 16, paddingVertical: 14 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: C.green },
  tabText: { fontSize: 12, fontWeight: "700", color: C.gray400 },
  tabTextActive: { color: C.green },
  pane: { flex: 1, padding: 16 },
  section: { fontSize: 12, color: C.gray400, letterSpacing: 1, marginTop: 16, marginBottom: 10, textTransform: "uppercase" },
  hint: { fontSize: 12, color: C.gray400, fontStyle: "italic", marginBottom: 12 },
  fieldLabel: { fontSize: 11, color: C.gray400, marginBottom: 6 },
  segRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  seg: { borderRadius: 8, borderWidth: 1.5, borderColor: C.gray200, paddingHorizontal: 16, paddingVertical: 8 },
  segActive: { backgroundColor: C.green, borderColor: C.green },
  segText: { fontSize: 13, color: C.gray400 },
  segTextActive: { color: C.white, fontWeight: "700" },
  previewBox: { backgroundColor: C.navyDark, borderRadius: 8, padding: 12, marginVertical: 12 },
  previewTitle: { fontSize: 10, color: C.gray400, marginBottom: 6 },
  previewText: { fontFamily: "monospace", fontSize: 11, color: "#4ade80", lineHeight: 18 },
  testBtn: { borderWidth: 1.5, borderColor: C.blue, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginBottom: 10 },
  testBtnText: { color: C.blue, fontWeight: "700", fontSize: 13 },
  saveBtn: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { color: C.white, fontWeight: "900", fontSize: 14 },
});
