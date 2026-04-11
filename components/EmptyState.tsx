import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/AppContext';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  icon:     { fontSize: 40, marginBottom: 10 },
  title:    { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
