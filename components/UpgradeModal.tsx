import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../context/AppContext';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { PressBtn } from './PressBtn';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const FREE_FEATURES = [
  'Manual glucose logging',
  'Medication calculator & insulin log',
  'Food guide',
  'SOS & emergency screen',
  'Reminders',
  'History & charts — last 15 days',
  '7-day basic PDF (table only)',
];

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Automatic Bluetooth glucometer readings',
  'Use multiple devices at once',
  'Unlimited history & charts',
  'Full PDF — any date range',
  'All charts: TIR, trend, pie',
  'Future: caregiver mode & more',
];

export function UpgradeModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { setPremiumPaid, setOneTimePdfPurchased } = useSubscriptionStore();

  const handleSubscribe = () => {
    // TODO: replace with RevenueCat purchase when ready to publish
    setPremiumPaid(true);
    onClose();
  };

  const handleOneTimePdf = () => {
    // TODO: replace with RevenueCat one-time purchase
    setOneTimePdfPurchased(true);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: colors.bg }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>

            <Text style={[s.title, { color: colors.red }]}>DiabEasy Premium</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>Upgrade for the full experience</Text>

            <View style={s.compareRow}>
              <View style={[s.col, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[s.colHeader, { color: colors.textMuted }]}>Free</Text>
                {FREE_FEATURES.map((f, i) => (
                  <View key={i} style={s.featureRow}>
                    <Text style={[s.featureIcon, { color: colors.textMuted }]}>○</Text>
                    <Text style={[s.featureText, { color: colors.textMuted }]}>{f}</Text>
                  </View>
                ))}
              </View>

              <View style={[s.col, s.premiumCol, { backgroundColor: colors.bgCard, borderColor: colors.red }]}>
                <Text style={[s.colHeader, { color: colors.red }]}>★ Premium</Text>
                {PREMIUM_FEATURES.map((f, i) => (
                  <View key={i} style={s.featureRow}>
                    <Text style={[s.featureIcon, { color: colors.red }]}>✓</Text>
                    <Text style={[s.featureText, { color: colors.text }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>

            <PressBtn
              style={[s.primaryBtn, { backgroundColor: colors.red }, s.btnShadow]}
              onPress={handleSubscribe}
            >
              <Text style={s.primaryBtnText}>Go Premium — 10 RON / month</Text>
            </PressBtn>
            <Text style={[s.btnNote, { color: colors.textMuted }]}>
              Cancel anytime · Billed monthly via Google Play
            </Text>

            <View style={[s.divider, { backgroundColor: colors.border }]} />

            <PressBtn
              style={[s.outlineBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]}
              onPress={handleOneTimePdf}
              activeOpacity={0.75}
            >
              <Text style={[s.outlineBtnText, { color: colors.red }]}>One Full PDF Report — 2.99 RON</Text>
            </PressBtn>
            <Text style={[s.btnNote, { color: colors.textMuted }]}>
              Single export · All charts included · One-time purchase
            </Text>

            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={s.closeLink}>
              <Text style={[s.closeLinkText, { color: colors.textMuted }]}>Maybe later</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:        { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:          { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '92%' },
  title:          { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  subtitle:       { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  compareRow:     { flexDirection: 'row', gap: 10, marginBottom: 20 },
  col:            { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12 },
  premiumCol:     { borderWidth: 2 },
  colHeader:      { fontSize: 13, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  featureRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 7 },
  featureIcon:    { fontSize: 11, fontWeight: '700', marginTop: 1, width: 12 },
  featureText:    { flex: 1, fontSize: 11, lineHeight: 16 },
  primaryBtn:     { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 6 },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  btnShadow:      { shadowColor: '#7a1010', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.45, shadowRadius: 0, elevation: 4 },
  btnNote:        { fontSize: 11, textAlign: 'center', marginBottom: 16 },
  divider:        { height: 1, marginVertical: 12 },
  outlineBtn:     { borderRadius: 12, borderWidth: 1.5, paddingVertical: 13, alignItems: 'center', marginBottom: 6 },
  outlineBtnText: { fontSize: 14, fontWeight: '700' },
  closeLink:      { alignItems: 'center', marginTop: 10 },
  closeLinkText:  { fontSize: 13 },
});
