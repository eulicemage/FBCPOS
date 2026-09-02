import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
} from 'react-native';

interface SupervisorPinModalProps {
  visible: boolean;
  actionTitle: string;
  reason?: string;
  onAuthorize: (supervisorName: string) => void;
  onCancel: () => void;
}

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  visible,
  actionTitle,
  reason,
  onAuthorize,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg('');
      if (nextPin.length === 4) {
        verify(nextPin);
      }
    }
  };

  const verify = (code: string) => {
    // In production, queries backend or local SQLite manager PIN hash
    // Default manager demo PIN is '1234'
    if (code === '1234') {
      onAuthorize('Store Manager');
      setPin('');
      setErrorMsg('');
    } else {
      setErrorMsg('Invalid Supervisor PIN');
      setPin('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>Supervisor Override Required</Text>
          <Text style={styles.action}>{actionTitle}</Text>
          {reason ? <Text style={styles.reason}>Reason: {reason}</Text> : null}

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <View style={styles.pinDots}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.dot, pin.length > i && styles.dotFilled]}
              />
            ))}
          </View>

          <View style={styles.numpad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['CLEAR', '0', '⌫'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.row}>
                {row.map((btn) => (
                  <TouchableOpacity
                    key={btn}
                    style={[styles.btn, btn.length > 1 && styles.actionBtn]}
                    onPress={() => {
                      if (btn === 'CLEAR') setPin('');
                      else if (btn === '⌫') setPin(pin.slice(0, -1));
                      else handleDigit(btn);
                    }}
                  >
                    <Text style={styles.btnText}>{btn}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: 380,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    color: '#F59E0B',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  action: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  reason: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  pinDots: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#64748B',
  },
  dotFilled: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  numpad: {
    width: '100%',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  btn: {
    flex: 1,
    height: 52,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtn: {
    backgroundColor: '#1E293B',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});

