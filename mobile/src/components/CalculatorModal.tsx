import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
} from "react-native";

interface CalculatorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  visible,
  onClose,
}) => {
  const [display, setDisplay] = useState("0");
  const [prevVal, setPrevVal] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [freshEntry, setFreshEntry] = useState(true);

  const handleDigit = (digit: string) => {
    if (freshEntry || display === "0") {
      setDisplay(digit === "." ? "0." : digit);
      setFreshEntry(false);
    } else {
      if (digit === "." && display.includes(".")) return;
      if (display.length < 12) setDisplay(display + digit);
    }
  };

  const handleOp = (nextOp: string) => {
    const current = parseFloat(display);
    if (prevVal !== null && op && !freshEntry) {
      const result = compute(prevVal, current, op);
      setDisplay(String(result));
      setPrevVal(result);
    } else {
      setPrevVal(current);
    }
    setOp(nextOp);
    setFreshEntry(true);
  };

  const compute = (a: number, b: number, operator: string): number => {
    switch (operator) {
      case "+": return Math.round((a + b) * 10000) / 10000;
      case "-": return Math.round((a - b) * 10000) / 10000;
      case "×": return Math.round((a * b) * 10000) / 10000;
      case "÷": return b !== 0 ? Math.round((a / b) * 10000) / 10000 : 0;
      default: return b;
    }
  };

  const handleEqual = () => {
    if (prevVal !== null && op) {
      const current = parseFloat(display);
      const result = compute(prevVal, current, op);
      setDisplay(String(result));
      setPrevVal(null);
      setOp(null);
      setFreshEntry(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPrevVal(null);
    setOp(null);
    setFreshEntry(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Register Calculator</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.screen}>
            {op && prevVal !== null && (
              <Text style={styles.subText}>{prevVal} {op}</Text>
            )}
            <Text style={styles.screenText} numberOfLines={1}>{display}</Text>
          </View>

          <View style={styles.keypad}>
            {[
              ["C", "±", "%", "÷"],
              ["7", "8", "9", "×"],
              ["4", "5", "6", "-"],
              ["1", "2", "3", "+"],
              ["0", ".", "Del", "="],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.row}>
                {row.map((btn) => {
                  const isOp = ["÷", "×", "-", "+", "="].includes(btn);
                  const isSpecial = ["C", "±", "%", "Del"].includes(btn);
                  return (
                    <TouchableOpacity
                      key={btn}
                      style={[
                        styles.btn,
                        isOp && styles.btnOp,
                        isSpecial && styles.btnSpecial,
                        btn === "=" && styles.btnEqual,
                      ]}
                      onPress={() => {
                        if (btn === "C") handleClear();
                        else if (btn === "Del") {
                          if (display.length > 1) setDisplay(display.slice(0, -1));
                          else setDisplay("0");
                        } else if (btn === "±") {
                          setDisplay(String(-parseFloat(display)));
                        } else if (btn === "%") {
                          setDisplay(String(parseFloat(display) / 100));
                        } else if (["÷", "×", "-", "+"].includes(btn)) {
                          handleOp(btn);
                        } else if (btn === "=") {
                          handleEqual();
                        } else {
                          handleDigit(btn);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          isOp && styles.btnTextOp,
                          btn === "=" && styles.btnTextEqual,
                        ]}
                      >
                        {btn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
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
    width: 320,
    backgroundColor: "#1a2340",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2a3756",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeBtnText: {
    color: "#9aa5b4",
    fontSize: 13,
  },
  screen: {
    backgroundColor: "#141a2e",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: "#2a3756",
  },
  subText: {
    fontSize: 12,
    color: "#9aa5b4",
    marginBottom: 2,
  },
  screenText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
  },
  keypad: {},
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  btn: {
    flex: 1,
    height: 46,
    backgroundColor: "#1e2d50",
    borderRadius: 6,
    marginHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOp: {
    backgroundColor: "#e05020",
  },
  btnSpecial: {
    backgroundColor: "#2a3756",
  },
  btnEqual: {
    backgroundColor: "#2d7a2d",
  },
  btnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
  },
  btnTextOp: {
    color: "#ffffff",
  },
  btnTextEqual: {
    color: "#ffffff",
  },
});
