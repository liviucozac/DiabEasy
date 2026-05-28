import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { getLocales } from 'expo-localization';
import { useGlucoseStore } from '../store/glucoseStore';
import { useTheme } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';

const SUPPORTED = ['en', 'ro', 'it', 'de', 'fr', 'nl'];

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  ro: 'Română',
  it: 'Italiano',
  de: 'Deutsch',
  fr: 'Français',
  nl: 'Nederlands',
};

export function LanguagePromptModal() {
  const { settings, setSettings } = useGlucoseStore();
  const { colors } = useTheme();
  const t = useTranslation();

  const rawCode   = getLocales()[0]?.languageCode ?? 'en';
  const deviceLang = SUPPORTED.includes(rawCode) ? rawCode : 'en';

  const visible =
    settings.languageDetected &&
    !settings.languagePromptShown &&
    deviceLang !== settings.language &&
    SUPPORTED.includes(deviceLang);

  const dismiss    = () => setSettings({ languagePromptShown: true });
  const switchLang = () => setSettings({ language: deviceLang, languagePromptShown: true });

  const deviceLangName  = LANG_NAMES[deviceLang]          ?? deviceLang;
  const currentLangName = LANG_NAMES[settings.language]   ?? settings.language;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Image
            source={{ uri: 'https://i.imgur.com/XRrP3SM.png' }}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={[s.appName, { color: colors.red }]}>DiabEasy</Text>
          <Text style={[s.message, { color: colors.text }]}>
            {t.langSuggestMessage(deviceLangName)}
          </Text>
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.red }]}
            onPress={switchLang}
            activeOpacity={0.8}
          >
            <Text style={s.primaryBtnText}>{t.langSuggestSwitch(deviceLangName)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.secondaryBtn, { borderColor: colors.border }]}
            onPress={dismiss}
            activeOpacity={0.8}
          >
            <Text style={[s.secondaryBtnText, { color: colors.textMuted }]}>
              {t.langSuggestKeep(currentLangName)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:           { width: '100%', maxWidth: 340, borderRadius: 18, borderWidth: 1, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12 },
  logo:           { width: 56, height: 56, marginBottom: 8 },
  appName:        { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  message:        { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  primaryBtn:     { width: '100%', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 10, shadowColor: '#7a1010', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.35, shadowRadius: 0, elevation: 4 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn:   { width: '100%', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
});
