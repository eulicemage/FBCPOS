import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
} from "react-native";

interface QuantityModalProps {
  visible: boolean;
  initialQuantity: number;
  itemName?: string;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export const QuantityModal: React.FC<QuantityModalProps> = ({
  visible,
  initialQuantity,
  itemName,
  onClose,
  onConfirm,
}) => {
  const [qtyStr, setQtyStr] = useState(String(initialQuantity || 1));

  useEffect(() => {
    if (visible) {
      setQtyStr(String(initialQuantity || 1));
    }
  }, [visible, initialQuantity]);

  const handleDigit = (digit: string) => {
    if (qtyStr === "0" || qtyStr === "1") {
      setQtyStr(digit);
    } else {
      setQtyStr((prev) => (prev.length < 4 ? prev + digit : prev));
    }
  };

  const handleBackspace = () => {
    setQtyStr((prev) => (prev.length > 1 ? prev.slice(0, -1) : "1"));
  };

  const handleQuickAdd = (delta: number) => {
    const current = parseInt(qtyStr, 10) || 1;
    const next = Math.max(1, current + delta);
    setQtyStr(String(next));
  };

  const handleConfirm = () => {
    const val = parseInt(qtyStr, 10);
    if (!isNaN(val) && val > 0) {
      onConfirm(val);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Change Quantity</Text>
              {itemName ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {itemName}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.displayRow}>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => handleQuickAdd(-1)}
            >
              <Text style={styles.adjustBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.displayInput}
              value={qtyStr}
              onChangeText={(t) => {
                const clean = t.replace(/[^0-9]/g, "");
                setQtyStr(clean || "1");
              }}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => handleQuickAdd(1)}
            >
              <Text style={styles.adjustBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.presetsRow}>
            {[2, 3, 5, 10, 12, 24].map((preset) => (
              <TouchableOpacity
                key={preset}
                style={styles.presetChip}
                onPress={() => setQtyStr(String(preset))}
              >
                <Text style={styles.presetChipText}>{preset}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.keypad}>
            {[
              ["1", "2", "3"],
              ["4", "5", "6"],
              ["7", "8", "9"],
              ["C", "0", "Del"],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((btn) => (
                  <TouchableOpacity
                    key={btn}
                    style={[
                      styles.keypadBtn,
                      btn === "C" && styles.keypadBtnSecondary,
                      btn === "Del" && styles.keypadBtnSecondary,
                    ]}
                    onPress={() => {
                      if (btn === "C") setQtyStr("1");
                      else if (btn === "Del") handleBackspace();
                      else handleDigit(btn);
                    }}
                  >
                    <Text
                      style={[
                        styles.keypadBtnText,
                        (btn === "C" || btn === "Del") && styles.keypadBtnTextSec,
                      ]}
                    >
                      {btn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Set Quantity ({qtyStr})</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 14, 26, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: 340,
    backgroundColor: "#1a2340",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2a3756",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 12,
    color: "#9aa5b4",
    marginTop: 2,
    maxWidth: 220,
  },
  closeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  closeBtnText: {
    color: "#9aa5b4",
    fontSize: 12,
  },
  displayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141a2e",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2a3756",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  adjustBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: "#2a3756",
    alignItems: "center",
    justifyContent: "center",
  },
  adjustBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  displayInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: "#4ade80",
    textAlign: "center",
  },
  presetsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    backgroundColor: "#2a3756",
    paddingVertical: 5,
    marginHorizontal: 2,
    borderRadius: 4,
    alignItems: "center",
  },
  presetChipText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  keypad: {
    marginBottom: 12,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  keypadBtn: {
    flex: 1,
    height: 42,
    backgroundColor: "#141a2e",
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a3756",
  },
  keypadBtnSecondary: {
    backgroundColor: "#1e2d50",
  },
  keypadBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  keypadBtnTextSec: {
    fontSize: 13,
    color: "#9aa5b4",
  },
  confirmBtn: {
    backgroundColor: "#2d7a2d",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
