import React, { useState } from "react";
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Switch,
} from "react-native";

const C = {
  navy: "#1a2340", green: "#2d7a2d", orange: "#e05020", yellow: "#f5c518",
  white: "#ffffff", gray100: "#f5f7fa", gray200: "#e8ecf0",
  gray400: "#9aa5b4", gray600: "#4a5568", blue: "#1565c0",
};

type BackupTrigger = "MANUAL" | "SCHEDULE" | "Z_READ" | "END_OF_DAY";

export const DatabaseBackupScreen: React.FC = () => {
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [trigger, setTrigger] = useState<BackupTrigger>("Z_READ");
  const [scheduleInterval, setScheduleInterval] = useState("2"); // hours
  const [lastBackup] = useState(new Date().toISOString());

  const handleManualBackup = () => {
    Alert.alert(
      "Backup Now",
      "This will create an immediate backup snapshot of the local database.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Backup Now",
          onPress: () => Alert.alert("Backup Complete", "Database snapshot saved successfully.\n" + new Date().toLocaleString()),
        },
      ]
    );
  };

  const TRIGGERS: { key: BackupTrigger; label: string; desc: string }[] = [
    { key: "SCHEDULE", label: "By Schedule", desc: "Auto-backup every N hours" },
    { key: "Z_READ", label: "At Z-Read", desc: "Auto-backup when store is closed" },
    { key: "END_OF_DAY", label: "End of Day", desc: "Auto-backup at midnight" },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={styles.heading}>Database Backup</Text>

      {/* Manual backup */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Manual Backup</Text>
        </View>
        <Text style={styles.cardSub}>Last backup: {new Date(lastBackup).toLocaleString()}</Text>
        <TouchableOpacity style={styles.backupNowBtn} onPress={handleManualBackup}>
          <Text style={styles.backupNowText}>🗄 BACKUP NOW</Text>
        </TouchableOpacity>
      </View>

      {/* Auto backup */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Auto-Backup</Text>
          <Switch value={autoBackupEnabled} onValueChange={setAutoBackupEnabled} trackColor={{ true: C.green }} />
        </View>
        {autoBackupEnabled && (
          <>
            <Text style={styles.section}>Trigger</Text>
            {TRIGGERS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.triggerRow, trigger === t.key && styles.triggerRowActive]}
                onPress={() => setTrigger(t.key)}
              >
                <View style={[styles.radioCircle, trigger === t.key && styles.radioCircleFilled]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.triggerLabel, trigger === t.key && styles.triggerLabelActive]}>{t.label}</Text>
                  <Text style={styles.triggerDesc}>{t.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {trigger === "SCHEDULE" && (
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Every</Text>
                {["1","2","4","8","12"].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.hrBtn, scheduleInterval === h && styles.hrBtnActive]}
                    onPress={() => setScheduleInterval(h)}
                  >
                    <Text style={[styles.hrBtnText, scheduleInterval === h && styles.hrBtnTextActive]}>{h}h</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
        <TouchableOpacity style={styles.saveBtn} onPress={() => Alert.alert("Saved", "Auto-backup settings saved.")}>
          <Text style={styles.saveBtnText}>SAVE SETTINGS</Text>
        </TouchableOpacity>
      </View>

      {/* Export options */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data Export</Text>
        <Text style={styles.cardSub}>Export entire database records as a backup file.</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={() => Alert.alert("Export", "Full database export would download here.")}>
          <Text style={styles.exportBtnText}>📥 Export Full Database (JSON)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.exportBtn, { borderColor: C.blue }]} onPress={() => Alert.alert("Import", "Select a backup file to restore.")}>
          <Text style={[styles.exportBtnText, { color: C.blue }]}>📤 Restore from Backup</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray100 },
  heading: { fontSize: 18, fontWeight: "900", color: C.navy, marginBottom: 16 },
  card: { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.gray200 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: "900", color: C.navy },
  cardSub: { fontSize: 12, color: C.gray400, marginBottom: 12 },
  backupNowBtn: { backgroundColor: C.navy, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  backupNowText: { color: C.white, fontWeight: "900", fontSize: 14 },
  section: { fontSize: 11, color: C.gray400, letterSpacing: 1, marginTop: 10, marginBottom: 8 },
  triggerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderRadius: 8, paddingHorizontal: 4 },
  triggerRowActive: { backgroundColor: "#e8f5e9" },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.gray400, marginRight: 12 },
  radioCircleFilled: { backgroundColor: C.green, borderColor: C.green },
  triggerLabel: { fontSize: 13, fontWeight: "700", color: C.gray600 },
  triggerLabelActive: { color: C.green },
  triggerDesc: { fontSize: 11, color: C.gray400 },
  scheduleRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 },
  scheduleLabel: { fontSize: 13, color: C.gray600 },
  hrBtn: { borderRadius: 16, borderWidth: 1.5, borderColor: C.gray200, paddingHorizontal: 12, paddingVertical: 6 },
  hrBtnActive: { backgroundColor: C.green, borderColor: C.green },
  hrBtnText: { fontSize: 12, color: C.gray400, fontWeight: "700" },
  hrBtnTextActive: { color: C.white },
  saveBtn: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 14 },
  saveBtnText: { color: C.white, fontWeight: "900", fontSize: 13 },
  exportBtn: { borderWidth: 1.5, borderColor: C.gray400, borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  exportBtnText: { color: C.gray600, fontWeight: "700", fontSize: 13 },
});
