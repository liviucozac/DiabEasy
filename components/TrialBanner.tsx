import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSubscription } from '../hooks/useSubscription';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useTheme } from '../context/AppContext';
import { UpgradeModal } from './UpgradeModal';
import { useTranslation } from '../hooks/useTranslation';

export function TrialBanner() {
  const { isTrialActive, daysLeftInTrial, isPremiumPaid } = useSubscription();
  const { trialStartDate } = useSubscriptionStore();
  const { colors } = useTheme();
  const t = useTranslation();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Paid premium user
  if (isPremiumPaid) {
    return (
      <View style={s.row}>
        <Text style={[s.status, { color: colors.normal }]}>{t.premiumAccount}</Text>
      </View>
    );
  }

  // Trial active
  if (isTrialActive) {
    const urgent = daysLeftInTrial <= 3;
    return (
      <>
        <View style={s.row}>
          <Text style={[s.status, { color: urgent ? colors.low : colors.normal }]}>
            {urgent ? '⚠️' : '⏳'} {t.trialDaysLeft(daysLeftInTrial)}
          </Text>
          <TouchableOpacity onPress={() => setShowUpgrade(true)} activeOpacity={0.8} style={[s.btn, { backgroundColor: colors.red }]}>
            <Text style={s.btnText}>{t.upgrade}</Text>
          </TouchableOpacity>
        </View>
        <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </>
    );
  }

  // Free user — trial never started
  if (!trialStartDate) {
    return (
      <>
        <View style={s.row}>
          <Text style={[s.status, { color: colors.textMuted }]}>{t.tryPremiumFree}</Text>
          <TouchableOpacity onPress={() => setShowUpgrade(true)} activeOpacity={0.8} style={[s.btn, { backgroundColor: colors.red }]}>
            <Text style={s.btnText}>{t.tryFree}</Text>
          </TouchableOpacity>
        </View>
        <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </>
    );
  }

  // Trial expired
  return (
    <>
      <View style={s.row}>
        <Text style={[s.status, { color: colors.low }]}>{t.trialExpired}</Text>
        <TouchableOpacity onPress={() => setShowUpgrade(true)} activeOpacity={0.8} style={[s.btn, { backgroundColor: colors.red }]}>
          <Text style={s.btnText}>{t.upgrade}</Text>
        </TouchableOpacity>
      </View>
      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}

const s = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 10 },
  status:  { fontSize: 13, fontWeight: '700' },
  btn:     { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  btnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});