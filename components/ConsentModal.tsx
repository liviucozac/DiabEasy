import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Linking, Alert, BackHandler,
} from 'react-native';
import { useTheme } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { useGlucoseStore } from '../store/glucoseStore';

const PRIVACY_URL = 'https://liviucozac.github.io/DiabEasy/privacy_policy.html';

export function ConsentModal() {
  const { colors } = useTheme();
  const t = useTranslation();
  const { settings, setSettings } = useGlucoseStore();

  if (settings.hasConsented) return null;

  const openPrivacy = () => Linking.openURL(PRIVACY_URL);

  const handleAgree = () => setSettings({ hasConsented: true });

  const handleDecline = () => {
    Alert.alert(
      'Unable to continue',
      'DiabEasy requires your consent to store and process health data (GDPR Art. 9). Without consent the app cannot function. Please accept to continue, or uninstall the app to remove all local data.',
      [
        { text: 'Go back', style: 'cancel' },
        { text: 'Close app', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ],
    );
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={s.icon}>🔒</Text>
          <Text style={[s.title, { color: colors.text }]}>{t.consentTitle}</Text>

          <ScrollView style={s.bodyScroll} showsVerticalScrollIndicator={false}>
            <Text style={[s.body, { color: colors.textMuted }]}>{t.consentBody}</Text>

            <View style={[s.dataBox, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              {t.consentDataPoints.map((point, i) => (
                <View key={i} style={s.dataRow}>
                  <Text style={[s.dataDot, { color: colors.red }]}>•</Text>
                  <Text style={[s.dataText, { color: colors.text }]}>{point}</Text>
                </View>
              ))}
            </View>

            <Text style={[s.noSell, { color: colors.textMuted }]}>{t.consentNoSell}</Text>

            <TouchableOpacity onPress={openPrivacy} activeOpacity={0.7} style={s.ppRow}>
              <Text style={[s.link, { color: colors.red }]}>{t.privacyPolicy}</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={[s.agreeBtn, { backgroundColor: colors.red }]}
            onPress={handleAgree}
            activeOpacity={0.8}
          >
            <Text style={s.agreeBtnText}>{t.consentAgree}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.declineBtn, { borderColor: colors.border }]}
            onPress={handleDecline}
            activeOpacity={0.7}
          >
            <Text style={[s.declineBtnText, { color: colors.textMuted }]}>{t.consentDecline}</Text>
          </TouchableOpacity>

          <Text style={[s.footer, { color: colors.textFaint }]}>{t.consentFooter}</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet:        { width: '100%', maxWidth: 420, borderRadius: 16, borderWidth: 1, padding: 24, maxHeight: '88%' },
  icon:         { fontSize: 36, textAlign: 'center', marginBottom: 10 },
  title:        { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  bodyScroll:   { flexGrow: 0 },
  body:         { fontSize: 14, lineHeight: 21, marginBottom: 14 },
  dataBox:      { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12, gap: 6 },
  dataRow:      { flexDirection: 'row', gap: 8 },
  dataDot:      { fontSize: 14, lineHeight: 20, width: 12 },
  dataText:     { flex: 1, fontSize: 13, lineHeight: 19 },
  noSell:       { fontSize: 12, lineHeight: 18, marginBottom: 10, fontStyle: 'italic' },
  ppRow:        { alignItems: 'center', marginBottom: 6 },
  link:         { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  agreeBtn:     { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16,
                  shadowColor: '#7a1010', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, shadowRadius: 0, elevation: 4 },
  agreeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  declineBtn:   { borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 8, borderWidth: 1 },
  declineBtnText: { fontSize: 14, fontWeight: '600' },
  footer:       { fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 16 },
});
