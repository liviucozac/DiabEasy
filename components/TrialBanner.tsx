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
      <View style={[s.banner, { backgroundColor: colors.normalBg, borderColor: colors.normal }]}>
        // Premium user
<Text style={[s.text, { color: colors.normal }]}>{t.premiumAccount}</Text>

// Free user
<Text style={[s.text, { color: colors.textMuted }]}>{t.tryPremiumFree}</Text>
<Text style={s.btnText}>{t.tryFree}</Text>

// Trial expired
<Text style={[s.text, { color: colors.low }]}>{t.trialExpired}</Text>
      </View>
    );
  }

  // Trial active
  if (isTrialActive) {
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

  // Free user — trial never started
  if (!trialStartDate) {
    return (
      <>
        <View style={[s.banner, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[s.text, { color: colors.textMuted }]}>🎁 Try Premium free for 7 days</Text>
          <TouchableOpacity
            onPress={() => setShowUpgrade(true)}
            activeOpacity={0.8}
            style={[s.btn, { backgroundColor: colors.red }]}
          >
            <Text style={s.btnText}>Try Free</Text>
          </TouchableOpacity>
        </View>
        <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </>
    );
  }

  // Trial expired, not premium
  return (
    <>
      <View style={[s.banner, { backgroundColor: colors.lowBg, borderColor: colors.low }]}>
        <Text style={[s.text, { color: colors.low }]}>⚠️ Trial expired — upgrade to keep premium features</Text>
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