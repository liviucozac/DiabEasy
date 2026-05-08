import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../context/AppContext';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { colors } = useTheme();

  const source = doc === 'privacy'
    ? require('../assets/legal/privacy_policy.html')
    : require('../assets/legal/terms_of_use.html');

  const title = doc === 'privacy' ? 'Privacy Policy' : 'Terms of Use';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.red }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={styles.backBtn} />
      </View>
      <WebView source={source} style={styles.webview} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 70 },
  backText: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 16, fontWeight: '600' },
  webview: { flex: 1 },
});