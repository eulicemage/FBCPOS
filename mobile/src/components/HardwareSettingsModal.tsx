import React, { useState } from 'react';
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
import { useHardwareStore } from '../store/hardwareStore';
import { PaperWidth, DrawerPin } from '../services/printerService';
import { PrinterInterface } from '../store/hardwareStore';

interface HardwareSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const HardwareSettingsModal: React.FC<HardwareSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    printerType,
    paperWidth,
    printerIp,
    printerPort,
    autoPrintOnCheckout,
    autoKickDrawerOnCash,
    drawerPin,
    setPrinterConfig,
    sendTestPrint,
    kickCashDrawer,
    lastPrintResult,
  } = useHardwareStore();

  const [ip, setIp] = useState(printerIp);
  const [port, setPort] = useState(printerPort.toString());

  const handleSave = () => {
    const portNum = parseInt(port, 10) || 9100;
    setPrinterConfig({
      printerIp: ip.trim(),
      printerPort: portNum,
    });
    Alert.alert('Saved', 'Hardware configuration saved successfully.');
  };

  const handleTestPrint = async () => {
    const res = await sendTestPrint();
    if (res.success) {
      Alert.alert(
        'Test Print Sent',
        `Diagnostic slip dispatched via ${res.transportType} (${res.bytesSent} bytes).`
      );
    } else {
      Alert.alert('Print Failed', res.error || 'Unknown error occurred.');
    }
  };

  const handleKickDrawer = async () => {
    const res = await kickCashDrawer();
    if (res.success) {
      Alert.alert('Cash Drawer Kicked', `Drawer kick pulse sent via ${res.transportType}.`);
    } else {
      Alert.alert('Failed', 'Could not send drawer kick pulse.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>⚙ Hardware & Printer Configuration</Text>
              <Text style={styles.subtitle}>Xprinter 70x50mm, thermal paper & cash drawer</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Paper Width Selection */}
            <Text style={styles.label}>Thermal Paper Width (Target Printer)</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selectorBtn, paperWidth === '70MM' && styles.selectorBtnActive]}
                onPress={() => setPrinterConfig({ paperWidth: '70MM' })}
              >
                <Text style={[styles.selectorText, paperWidth === '70MM' && styles.selectorTextActive]}>
                  70mm (Xprinter 70x50)
                </Text>
                <Text style={styles.colBadge}>40 cols</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectorBtn, paperWidth === '80MM' && styles.selectorBtnActive]}
                onPress={() => setPrinterConfig({ paperWidth: '80MM' })}
              >
                <Text style={[styles.selectorText, paperWidth === '80MM' && styles.selectorTextActive]}>
                  80mm Standard
                </Text>
                <Text style={styles.colBadge}>48 cols</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectorBtn, paperWidth === '58MM' && styles.selectorBtnActive]}
                onPress={() => setPrinterConfig({ paperWidth: '58MM' })}
              >
                <Text style={[styles.selectorText, paperWidth === '58MM' && styles.selectorTextActive]}>
                  58mm Mini
                </Text>
                <Text style={styles.colBadge}>32 cols</Text>
              </TouchableOpacity>
            </View>

            {/* Printer Interface Mode */}
            <Text style={styles.label}>Printer Connection Transport</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selectorBtn, printerType === 'VIRTUAL' && styles.selectorBtnActive]}
                onPress={() => setPrinterConfig({ printerType: 'VIRTUAL' })}
              >
                <Text style={[styles.selectorText, printerType === 'VIRTUAL' && styles.selectorTextActive]}>
                  Virtual (Preview/Expo)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectorBtn, printerType === 'NETWORK' && styles.selectorBtnActive]}
                onPress={() => setPrinterConfig({ printerType: 'NETWORK' })}
              >
                <Text style={[styles.selectorText, printerType === 'NETWORK' && styles.selectorTextActive]}>
                  Network TCP (LAN/Wi-Fi)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Network IP & Port (Visible if Network) */}
            {printerType === 'NETWORK' && (
              <View style={styles.networkConfig}>
                <Text style={styles.label}>Printer IP Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="192.168.2.100"
                  placeholderTextColor="#64748B"
                  value={ip}
                  onChangeText={setIp}
                  onBlur={handleSave}
                />
                <Text style={styles.label}>Raw Port (Default: 9100)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="9100"
                  placeholderTextColor="#64748B"
                  value={port}
                  onChangeText={setPort}
                  keyboardType="numeric"
                  onBlur={handleSave}
                />
              </View>
            )}

            {/* Cash Drawer Pin */}
            <Text style={styles.label}>RJ11 Cash Drawer Pulse Pin</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selectorBtn, drawerPin === 'PIN_2' && styles.selectorBtnActive]}
                onPress={() => setPrinterConfig({ drawerPin: 'PIN_2' })}
              >
                <Text style={[styles.selectorText, drawerPin === 'PIN_2' && styles.selectorTextActive]}>
                  Pin 2 (Standard Epson/Xprinter)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectorBtn, drawerPin === 'PIN_5' && styles.selectorBtnActive]}
                onPress={() => setPrinterConfig({ drawerPin: 'PIN_5' })}
              >
                <Text style={[styles.selectorText, drawerPin === 'PIN_5' && styles.selectorTextActive]}>
                  Pin 5 (Auxiliary)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Automation Toggles */}
            <Text style={styles.label}>POS Automation Settings</Text>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setPrinterConfig({ autoPrintOnCheckout: !autoPrintOnCheckout })}
            >
              <View style={[styles.checkbox, autoPrintOnCheckout && styles.checkboxActive]}>
                {autoPrintOnCheckout ? <Text style={styles.checkText}>✓</Text> : null}
              </View>
              <Text style={styles.toggleText}>Auto-print thermal receipt upon checkout completion</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setPrinterConfig({ autoKickDrawerOnCash: !autoKickDrawerOnCash })}
            >
              <View style={[styles.checkbox, autoKickDrawerOnCash && styles.checkboxActive]}>
                {autoKickDrawerOnCash ? <Text style={styles.checkText}>✓</Text> : null}
              </View>
              <Text style={styles.toggleText}>Auto-kick cash drawer pulse on Cash transactions</Text>
            </TouchableOpacity>

            {/* Diagnostics */}
            <Text style={[styles.label, { marginTop: 14 }]}>Hardware Diagnostics & Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.diagBtn} onPress={handleTestPrint}>
                <Text style={styles.diagBtnText}>🖨 Send Test Print ({paperWidth})</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.diagBtn, styles.diagBtnDrawer]} onPress={handleKickDrawer}>
                <Text style={styles.diagBtnDrawerText}>💵 Kick Cash Drawer (No-Sale)</Text>
              </TouchableOpacity>
            </View>

            {lastPrintResult && (
              <View style={styles.statusBox}>
                <Text style={styles.statusLabel}>Last Hardware Event:</Text>
                <Text style={styles.statusVal}>
                  {lastPrintResult.success ? '✓ SUCCESS' : '✕ ERROR'} — {lastPrintResult.transportType} ({lastPrintResult.bytesSent} bytes)
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose}>
              <Text style={styles.closeFooterBtnText}>Done</Text>
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
    width: '72%',
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
  closeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  body: { padding: 16 },
  label: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  selectorRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  selectorBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorBtnActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  selectorText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  selectorTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  colBadge: { color: '#64748B', fontSize: 10, marginTop: 2 },
  networkConfig: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  checkText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  toggleText: { color: '#CBD5E1', fontSize: 13 },
  actionGrid: { flexDirection: 'row', gap: 10, marginTop: 4 },
  diagBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#0284C7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  diagBtnDrawer: { backgroundColor: '#059669' },
  diagBtnDrawerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  statusBox: {
    marginTop: 12,
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusLabel: { color: '#64748B', fontSize: 11 },
  statusVal: { color: '#10B981', fontSize: 12, fontWeight: '600', marginTop: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  closeFooterBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeFooterBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
});

