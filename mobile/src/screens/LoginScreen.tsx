import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../../../shared/src';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { currentBranch, currentTerminal, isOnline, setAuth } = useAuthStore();
  const [mode, setMode] = useState<'PIN' | 'CREDENTIALS'>('PIN');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePinPress = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg('');
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handlePinBackspace = () => {
    setPin(pin.slice(0, -1));
    setErrorMsg('');
  };

  const handlePinClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const verifyPin = (enteredPin: string) => {
    // Demo verification (matches '1234' seeded PIN)
    if (enteredPin === '1234') {
      const cashierUser = {
        id: 'USR-001',
        username: 'cashier.001',
        fullName: 'Maria Santos',
        role: UserRole.CASHIER,
        branchId: currentBranch?.id || 'BR-001',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAuth(cashierUser, currentBranch!, currentTerminal!);
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setErrorMsg('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  const handleCredentialsSubmit = () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    if (username === 'admin' || username.startsWith('manager.')) {
      const role = username === 'admin' ? UserRole.ADMIN : UserRole.MANAGER;
      const user = {
        id: 'USR-ADMIN-01',
        username,
        fullName: username === 'admin' ? 'System Administrator' : 'Branch Manager',
        role,
        branchId: currentBranch?.id || 'BR-001',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAuth(user, currentBranch!, currentTerminal!);
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setErrorMsg('Invalid username or password.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {/* Branch & Terminal Info Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>FoodBaskets Corp POS</Text>
          <Text style={styles.branchSub}>
            {currentBranch?.name} — {currentTerminal?.name}
          </Text>
          <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
            <Text style={styles.badgeText}>{isOnline ? '● ONLINE' : '○ OFFLINE OPERATIONAL'}</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, mode === 'PIN' && styles.tabActive]}
            onPress={() => {
              setMode('PIN');
              setErrorMsg('');
            }}
          >
            <Text style={[styles.tabText, mode === 'PIN' && styles.tabTextActive]}>
              Cashier PIN Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'CREDENTIALS' && styles.tabActive]}
            onPress={() => {
              setMode('CREDENTIALS');
              setErrorMsg('');
            }}
          >
            <Text style={[styles.tabText, mode === 'CREDENTIALS' && styles.tabTextActive]}>
              Manager / Admin
            </Text>
          </TouchableOpacity>
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        {mode === 'PIN' ? (
          /* Numpad PIN View */
          <View style={styles.pinSection}>
            <Text style={styles.instruction}>Enter 4-Digit Cashier PIN</Text>
            <View style={styles.pinDotsContainer}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[styles.pinDot, pin.length > i && styles.pinDotFilled]}
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
                <View key={rIdx} style={styles.numpadRow}>
                  {row.map((btn) => (
                    <TouchableOpacity
                      key={btn}
                      style={[
                        styles.numBtn,
                        btn === 'CLEAR' && styles.actionBtn,
                        btn === '⌫' && styles.actionBtn,
                      ]}
                      onPress={() => {
                        if (btn === 'CLEAR') handlePinClear();
                        else if (btn === '⌫') handlePinBackspace();
                        else handlePinPress(btn);
                      }}
                    >
                      <Text style={styles.numBtnText}>{btn}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>
        ) : (
          /* Manager / Admin Credentials View */
          <View style={styles.credentialsSection}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. admin or manager.001"
              placeholderTextColor="#64748B"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.loginBtn} onPress={handleCredentialsSubmit}>
              <Text style={styles.loginBtnText}>Sign In as Supervisor</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: 480,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: 'bold',
  },
  branchSub: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  badge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeOnline: {
    backgroundColor: '#065F46',
  },
  badgeOffline: {
    backgroundColor: '#991B1B',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#0284C7',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '500',
  },
  pinSection: {
    alignItems: 'center',
  },
  instruction: {
    color: '#CBD5E1',
    fontSize: 14,
    marginBottom: 12,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#64748B',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  numpad: {
    width: '100%',
    gap: 10,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  numBtn: {
    flex: 1,
    height: 60,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtn: {
    backgroundColor: '#1E293B',
  },
  numBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  credentialsSection: {
    paddingVertical: 10,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    height: 48,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  loginBtn: {
    marginTop: 16,
    height: 50,
    backgroundColor: '#0284C7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
