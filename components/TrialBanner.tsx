import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../context/AppContext';
import { UpgradeModal } from './UpgradeModal';
import { useTranslation } from '../hooks/useTranslation';

export function TrialBanner() {
  const { isTrialActive, daysLeftInTrial } = useSubscription();
  const { colors } = useTheme();
  const t = useTranslation();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!isTrialActive) return null;

  const urgent = daysLeftInTrial <= 3;

  return (
    <>
      <View style={[s.banner, {
        backgroundColor: urgent ? colors.lowBg : colors.normalBg,
        borderColor:     urgent ? colors.low   : colors.normal,
      }]}>
        <Text style={[s.text, { color: urgent ? colors.low : colors.normal }]}>
          {urgent ? '⚠️' : '⏳'}{' '}
          {t.trialDaysLeft(daysLeftInTrial)}
        </Text>
        <TouchableOpacity
          onPress={() => setShowUpgrade(true)}
          activeOpacity={0.8}
          style={[s.btn, { backgroundColor: colors.red }]}
        >
          <Text style={s.btnText}>{t.upgrade}</Text>
        </TouchableOpacity>
      </View>

      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}

const s = StyleSheet.create({
  banner:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  text:    { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  btn:     { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginLeft: 10 },
  btnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});
