import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';

interface Props {
  locked:    boolean;
  onUnlock:  () => void;
  label?:    string;
  children:  React.ReactNode;
}

export function PremiumGate({ locked, onUnlock, label, children }: Props) {
  const { colors } = useTheme();
  const t = useTranslation();
  const displayLabel = label ?? t.premiumFeatureLabel;

  if (!locked) return <>{children}</>;

  return (
    <View style={s.wrapper}>
      <View style={s.dimmed} pointerEvents="none">
        {children}
      </View>
      <View style={s.overlay}>
        <TouchableOpacity
          style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.red }]}
          onPress={onUnlock}
          activeOpacity={0.85}
        >
          <Text style={s.icon}>🔒</Text>
          <Text style={[s.label, { color: colors.text }]}>{displayLabel}</Text>
          <Text style={[s.cta, { color: colors.red }]}>{t.tapToUpgrade}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { position: 'relative' },
  dimmed:  { opacity: 0.2 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  card:    { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 28, paddingVertical: 18, alignItems: 'center', minWidth: 180 },
  icon:    { fontSize: 28, marginBottom: 6 },
  label:   { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cta:     { fontSize: 13, fontWeight: '600' },
});
