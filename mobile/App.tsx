import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, StatusBar } from 'react-native';
import { POSScreen } from './src/screens/POSScreen';
import { useAuthStore } from './src/store/authStore';

export default function App() {
  const { currentBranch, currentTerminal, currentUser, isOnline } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
      <POSScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
