import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { UpgradeModal } from './UpgradeModal';

export function TrialBanner() {
  const { colors } = useTheme();
  const { isPremiumPaid } = useSubscriptionStore();
  const t = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  if (isPremiumPaid) return null;

  return (
    <>
      <View style={[s.banner, { backgroundColor: colors.bgCard, borderColor: colors.red }]}>
        <Text style={[s.text, { color: colors.text }]}>
          💎 <Text style={{ color: colors.red, fontWeight: '800' }}>{t.diabeasyPremium}</Text>
          {'  '}
          <Text style={{ color: colors.textMuted, fontWeight: '400' }}>{t.upgradeForFullExperience}</Text>
        </Text>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: colors.red }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={s.btnText}>{t.goPremium}</Text>
        </TouchableOpacity>
      </View>

      <UpgradeModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
    shadowColor: '#7a1010',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 3,
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  btn: {
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 13,
    shadowColor: '#7a1010',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 3,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
});