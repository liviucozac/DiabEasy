import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Platform, Alert, Switch,
} from 'react-native';
import { useGlucoseStore, DiabetesType, ThemeType, InsulinAnalogType, SecurityMethod, LockTimeout } from '../store/glucoseStore';
import { INSULIN_ANALOGS, getAnalogByType } from '../utils/insulinUtils';
import { useTheme } from '../context/AppContext';
import { PressBtn } from '../components/PressBtn';
import { ParamTrainingModal } from '../components/ParamTrainingModal';
import { hashValue, checkHash, biometricsAvailable } from '../utils/securityUtils';

const RED = '#EC5557';

type ActiveTab = 'profile' | 'settings';

function SectionCard({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[s.sectionCard, {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      shadowColor: isDark ? '#000' : '#6070a0',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.3 : 0.09,
      shadowRadius: 14,
      elevation: isDark ? 5 : 4,
    }]}>
      {children}
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{text}</Text>;
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[s.divider, { backgroundColor: colors.divider }]} />;
}

function FieldLabel({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{text}</Text>;
}

function StyledInput({ value, onChangeText, placeholder, keyboardType, secureTextEntry, autoCapitalize, maxLength, accessibilityLabel }: {
  value: string; onChangeText: (v: string) => void; placeholder: string;
  keyboardType?: any; secureTextEntry?: boolean; autoCapitalize?: any;
  maxLength?: number; accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[s.input, { borderColor: focused ? colors.red : colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={colors.placeholder} keyboardType={keyboardType ?? 'default'}
      secureTextEntry={secureTextEntry} autoCapitalize={autoCapitalize ?? 'sentences'}
      maxLength={maxLength} accessibilityLabel={accessibilityLabel}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} returnKeyType="done"
    />
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { profile, setProfile } = useGlucoseStore();
  const { colors } = useTheme();

  const DIABETES_TYPES: DiabetesType[] = ['Type 1', 'Type 2', 'LADA', 'Other'];

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
      <SectionCard>
        <SectionTitle text="Account" />
        <View style={[s.comingSoonBox, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
          <Text style={[s.comingSoonIcon]}>🔐</Text>
          <Text style={[s.comingSoonTitle, { color: colors.text }]}>Cloud accounts — coming soon</Text>
          <Text style={[s.comingSoonText, { color: colors.textMuted }]}>
            All your data is stored securely on this device. Account sync will be available in a future update.
          </Text>
        </View>
      </SectionCard>

      <SectionCard>
        <SectionTitle text="Personal Info" />
        <FieldLabel text="Full name" />
        <StyledInput value={profile.name} onChangeText={(v) => setProfile({ name: v })} placeholder="Your full name" />
        <FieldLabel text="Age" />
        <StyledInput value={profile.age} onChangeText={(v) => setProfile({ age: v })} placeholder="e.g. 28" keyboardType="number-pad" />
        <FieldLabel text="Diabetes type" />
        <View style={s.pillRow}>
          {DIABETES_TYPES.map((t) => {
            const active = profile.diabetesType === t;
            return (
              <TouchableOpacity key={t}
                style={[s.pill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
                onPress={() => setProfile({ diabetesType: t })} activeOpacity={0.75}>
                <Text style={[s.pillText, { color: active ? '#fff' : colors.textMuted }]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <FieldLabel text="Diagnosis date (MM/YYYY)" />
        <StyledInput value={profile.diagnosisDate} onChangeText={(v) => setProfile({ diagnosisDate: v })} placeholder="e.g. 03/2018" keyboardType="numbers-and-punctuation" />
        <FieldLabel text="Doctor / specialist name" />
        <StyledInput value={profile.doctorName} onChangeText={(v) => setProfile({ doctorName: v })} placeholder="e.g. Dr. Smith" />
        <FieldLabel text="Clinic / hospital" />
        <StyledInput value={profile.clinicName} onChangeText={(v) => setProfile({ clinicName: v })} placeholder="e.g. City Medical Centre" />
      </SectionCard>
    </ScrollView>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const LOCK_TIMEOUT_OPTIONS: { label: string; value: LockTimeout }[] = [
  { label: 'Immediately',    value: 'immediate' },
  { label: 'After 1 minute', value: '1min'      },
  { label: 'After 5 minutes',value: '5min'      },
  { label: 'On app close',   value: 'app-close' },
];

const SECURITY_METHOD_OPTIONS: { label: string; value: SecurityMethod; icon: string }[] = [
  { label: 'None',       value: 'none',       icon: '🔓' },
  { label: 'PIN',        value: 'pin',        icon: '🔢' },
  { label: 'Password',   value: 'password',   icon: '🔑' },
  { label: 'Biometrics', value: 'biometrics', icon: '🪪' },
];

function SettingsTab() {
  const { settings, setSettings, clearHistory, clearInsulinLog } = useGlucoseStore();
  const { colors } = useTheme();
  const [showTraining,    setShowTraining]    = useState(false);
  const [isfFocused,      setIsfFocused]      = useState(false);
  const [ratioFocused,    setRatioFocused]    = useState(false);
  const [targetFocused,   setTargetFocused]   = useState(false);
  const [diaFocused,      setDiaFocused]      = useState(false);
  // Security change state
  const [secNewPin,       setSecNewPin]       = useState('');
  const [secConfirmPin,   setSecConfirmPin]   = useState('');
  const [secNewPass,      setSecNewPass]      = useState('');
  const [secConfirmPass,  setSecConfirmPass]  = useState('');
  const [secError,        setSecError]        = useState('');
  const [secSuccess,      setSecSuccess]      = useState('');

  const handleMethodChange = async (method: SecurityMethod) => {
    setSecError(''); setSecSuccess('');
    setSecNewPin(''); setSecConfirmPin('');
    setSecNewPass(''); setSecConfirmPass('');
    if (method === 'biometrics') {
      const ok = await biometricsAvailable();
      if (!ok) { setSecError('No biometrics enrolled on this device.'); return; }
    }
    if (method === 'none') {
      setSettings({ securityMethod: 'none', securityHash: '' });
      setSecSuccess('Security disabled.');
    } else {
      setSettings({ securityMethod: method, securityHash: '' });
      if (method === 'biometrics') setSecSuccess('Biometrics enabled.');
    }
  };

  const handleSaveCredential = () => {
    setSecError(''); setSecSuccess('');
    if (settings.securityMethod === 'pin') {
      if (secNewPin.length !== 4 || !/^\d{4}$/.test(secNewPin)) { setSecError('PIN must be exactly 4 digits.'); return; }
      if (secNewPin !== secConfirmPin)  { setSecError('PINs do not match.'); return; }
      setSettings({ securityHash: hashValue(secNewPin) });
      setSecNewPin(''); setSecConfirmPin('');
      setSecSuccess('PIN saved.');
    } else if (settings.securityMethod === 'password') {
      if (secNewPass.length < 7)        { setSecError('Password must be at least 7 characters.'); return; }
      if (secNewPass !== secConfirmPass) { setSecError('Passwords do not match.'); return; }
      setSettings({ securityHash: hashValue(secNewPass) });
      setSecNewPass(''); setSecConfirmPass('');
      setSecSuccess('Password saved.');
    }
  };

  const THEMES: { label: string; value: ThemeType }[] = [
    { label: '☀️ Light', value: 'light' },
    { label: '🌙 Dark',  value: 'dark' },
    { label: '⚙️ System',value: 'system' },
  ];

  const handleClearData = () => {
    Alert.alert(
      'Clear all data?',
      'This will permanently delete your entire glucose history and insulin log. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, delete everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Last chance — all readings and insulin entries will be gone forever.',
              [
                { text: 'Go back', style: 'cancel' },
                { text: 'Delete permanently', style: 'destructive', onPress: () => { clearHistory(); clearInsulinLog(); } },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
      <SectionCard>
        <SectionTitle text="Appearance" />
        <FieldLabel text="Theme" />
        <View style={s.pillRow}>
          {THEMES.map((t) => {
            const active = settings.theme === t.value;
            return (
              <TouchableOpacity key={t.value}
                style={[s.pill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
                onPress={() => setSettings({ theme: t.value })} activeOpacity={0.75}>
                <Text style={[s.pillText, { color: active ? '#fff' : colors.textMuted }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard>
        <SectionTitle text="Units & Language" />
        <FieldLabel text="Default glucose unit" />
        <View style={s.pillRow}>
          {(['mg/dL', 'mmol/L'] as const).map((u) => {
            const active = settings.glucoseUnit === u;
            return (
              <TouchableOpacity key={u}
                style={[s.pill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
                onPress={() => setSettings({ glucoseUnit: u })} activeOpacity={0.75}>
                <Text style={[s.pillText, { color: active ? '#fff' : colors.textMuted }]}>{u}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Divider />
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.settingLabel, { color: colors.text }]}>Language</Text>
            <Text style={[s.settingSubLabel, { color: colors.textFaint }]}>Internationalisation coming soon</Text>
          </View>
          <View style={[s.pill, { borderColor: colors.red, backgroundColor: colors.red, paddingHorizontal: 12 }, s.primaryBtnShadow]}>
            <Text style={s.pillTextActive}>🇬🇧 EN</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard>
        <SectionTitle text="Insulin Calculator Defaults" />
        <Text style={[s.sectionHint, { color: colors.textMuted }]}>These values are used by the Meds calculator. Ask your healthcare provider for your personal settings.</Text>

        <FieldLabel text="Rapid-acting insulin type" />
        <View style={s.pillRow}>
          {INSULIN_ANALOGS.map((analog) => {
            const active = settings.insulinAnalogType === analog.value;
            return (
              <TouchableOpacity key={analog.value}
                style={[s.pill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
                onPress={() => {
                  setSettings({ insulinAnalogType: analog.value as InsulinAnalogType, dia: analog.defaultDia });
                }}
                activeOpacity={0.75}>
                <Text style={[s.pillText, { color: active ? '#fff' : colors.textMuted }]}>{analog.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[s.sectionHint, { color: colors.textFaint, marginTop: 2 }]}>
          {getAnalogByType(settings.insulinAnalogType).sublabel}
        </Text>

        <View style={s.paramGrid}>
          {[
            { label: 'Target glycemia\n(mg/dL)', value: String(settings.targetGlucose), focused: targetFocused, setFocused: setTargetFocused, onChange: (v: string) => { const n = parseFloat(v); if (!isNaN(n)) setSettings({ targetGlucose: n, insulinParamsSet: true }); } },
            { label: 'ISF\n(mg/dL per unit)',    value: String(settings.isf),           focused: isfFocused,    setFocused: setIsfFocused,    onChange: (v: string) => { const n = parseFloat(v); if (!isNaN(n)) setSettings({ isf: n, insulinParamsSet: true }); } },
            { label: 'Carb ratio\n(g per unit)', value: String(settings.carbRatio),     focused: ratioFocused,  setFocused: setRatioFocused,  onChange: (v: string) => { const n = parseFloat(v); if (!isNaN(n)) setSettings({ carbRatio: n, insulinParamsSet: true }); } },
            { label: 'DIA\n(hours)',              value: String(settings.dia),           focused: diaFocused,    setFocused: setDiaFocused,    onChange: (v: string) => { const n = parseFloat(v); if (!isNaN(n)) setSettings({ dia: n }); } },
          ].map((param, i) => (
            <View key={i} style={s.paramItem}>
              <Text style={[s.paramLabel, { color: colors.textMuted }]}>{param.label}</Text>
              <TextInput
                style={[s.paramInput, param.focused && { borderColor: colors.red }, { color: colors.text, backgroundColor: colors.inputBg }]}
                keyboardType="decimal-pad" value={param.value} onChangeText={param.onChange}
                onFocus={() => param.setFocused(true)} onBlur={() => param.setFocused(false)} returnKeyType="done"
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[s.trainingBtn, { borderColor: colors.red }]}
          onPress={() => setShowTraining(true)}
          activeOpacity={0.75}
        >
          <Text style={[s.trainingBtnText, { color: colors.red }]}>🎓 What do ISF, carb ratio, and DIA mean?</Text>
        </TouchableOpacity>

        <ParamTrainingModal visible={showTraining} onClose={() => setShowTraining(false)} />
      </SectionCard>

      <SectionCard>
        <SectionTitle text="Security" />
        <Text style={[s.sectionHint, { color: colors.textMuted }]}>Choose how the app locks when you leave it.</Text>

        {/* Method pills */}
        <FieldLabel text="Lock method" />
        <View style={s.pillRow}>
          {SECURITY_METHOD_OPTIONS.map((opt) => {
            const active = settings.securityMethod === opt.value;
            return (
              <TouchableOpacity key={opt.value}
                style={[s.pill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
                onPress={() => handleMethodChange(opt.value)} activeOpacity={0.75}
                accessibilityLabel={opt.label} accessibilityRole="radio" accessibilityState={{ checked: active }}>
                <Text style={[s.pillText, { color: active ? '#fff' : colors.textMuted }]}>{opt.icon} {opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* PIN entry */}
        {settings.securityMethod === 'pin' && (
          <View style={{ gap: 8, marginTop: 10 }}>
            <FieldLabel text="New PIN (4 digits)" />
            <StyledInput value={secNewPin} onChangeText={setSecNewPin} placeholder="••••" keyboardType="number-pad" maxLength={4} secureTextEntry accessibilityLabel="New PIN" />
            <FieldLabel text="Confirm PIN" />
            <StyledInput value={secConfirmPin} onChangeText={setSecConfirmPin} placeholder="••••" keyboardType="number-pad" maxLength={4} secureTextEntry accessibilityLabel="Confirm PIN" />
            <PressBtn style={[s.authBtn, { backgroundColor: colors.red }, s.primaryBtnShadow]} onPress={handleSaveCredential} accessibilityLabel="Save PIN">
              <Text style={s.authBtnText}>Save PIN</Text>
            </PressBtn>
          </View>
        )}

        {/* Password entry */}
        {settings.securityMethod === 'password' && (
          <View style={{ gap: 8, marginTop: 10 }}>
            <FieldLabel text="New password (7+ characters)" />
            <StyledInput value={secNewPass} onChangeText={setSecNewPass} placeholder="New password" secureTextEntry accessibilityLabel="New password" />
            <FieldLabel text="Confirm password" />
            <StyledInput value={secConfirmPass} onChangeText={setSecConfirmPass} placeholder="Repeat password" secureTextEntry accessibilityLabel="Confirm password" />
            <PressBtn style={[s.authBtn, { backgroundColor: colors.red }, s.primaryBtnShadow]} onPress={handleSaveCredential} accessibilityLabel="Save password">
              <Text style={s.authBtnText}>Save Password</Text>
            </PressBtn>
          </View>
        )}

        {!!secError   && <Text style={[s.secMsg, { color: '#e53935' }]}>{secError}</Text>}
        {!!secSuccess && <Text style={[s.secMsg, { color: '#2e7d32' }]}>{secSuccess}</Text>}

        {/* Lock timeout — only shown when a method is active */}
        {settings.securityMethod !== 'none' && (
          <>
            <Divider />
            <FieldLabel text="Lock after" />
            <View style={s.pillRow}>
              {LOCK_TIMEOUT_OPTIONS.map((opt) => {
                const active = settings.lockTimeout === opt.value;
                return (
                  <TouchableOpacity key={opt.value}
                    style={[s.pill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
                    onPress={() => setSettings({ lockTimeout: opt.value })} activeOpacity={0.75}
                    accessibilityLabel={opt.label} accessibilityRole="radio" accessibilityState={{ checked: active }}>
                    <Text style={[s.pillText, { color: active ? '#fff' : colors.textMuted }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </SectionCard>

      <SectionCard>
        <SectionTitle text="Notifications" />
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.settingLabel, { color: colors.text }]}>Enable notifications</Text>
            <Text style={[s.settingSubLabel, { color: colors.textFaint }]}>Reminder alerts from the Meds tab</Text>
          </View>
          <Switch value={settings.notificationsEnabled} onValueChange={(v) => setSettings({ notificationsEnabled: v })} trackColor={{ false: '#ccc', true: RED }} thumbColor="#fff" />
        </View>
      </SectionCard>

      <SectionCard>
        <SectionTitle text="Data" />
        <PressBtn style={[s.dangerBtn, s.dangerBtnShadow]} onPress={handleClearData} activeOpacity={0.75}>
          <Text style={s.dangerBtnText}>🗑 Clear all data</Text>
        </PressBtn>
        <Text style={[s.dangerHint, { color: colors.textFaint }]}>Deletes glucose history and insulin log. Cannot be undone.</Text>
      </SectionCard>

      <SectionCard>
        <SectionTitle text="About" />
        <View style={s.aboutRow}><Text style={[s.aboutLabel, { color: colors.textMuted }]}>App version</Text><Text style={[s.aboutValue, { color: colors.text }]}>2.0.0</Text></View>
        <Divider />
        <View style={s.aboutRow}><Text style={[s.aboutLabel, { color: colors.textMuted }]}>Built with</Text><Text style={[s.aboutValue, { color: colors.text }]}>Expo · React Native · Zustand</Text></View>
        <Divider />
        {['Privacy Policy', 'Terms of Use', 'Send Feedback'].map((item, i) => (
          <View key={i}>
            <TouchableOpacity style={s.aboutLinkRow} onPress={() => Alert.alert(item, `${item} not published yet.`)} activeOpacity={0.75}>
              <Text style={[s.aboutLink, { color: colors.text }]}>{item}</Text>
              <Text style={[s.aboutChevron, { color: colors.border }]}>›</Text>
            </TouchableOpacity>
            {i < 2 && <Divider />}
          </View>
        ))}
        <Divider />
        <View style={s.disclaimerCard}>
          <Text style={[s.disclaimerText, { color: colors.textMuted }]}>⚠️ DiabEasy is a personal management aid and not a medical device. Always confirm treatment decisions with your healthcare provider.</Text>
        </View>
      </SectionCard>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <Text style={[s.title, { color: colors.text }]}>Profile & Settings</Text>

      {/* Sub-tab bar with shadow */}
      <View style={[s.tabBar, { borderColor: colors.red }, s.tabBarShadow]}>
        {(['profile', 'settings'] as ActiveTab[]).map((t) => {
          const active = activeTab === t;
          return (
            <TouchableOpacity key={t}
              style={[s.tabBtn, { backgroundColor: active ? colors.red : colors.bg }]}
              onPress={() => setActiveTab(t)} activeOpacity={0.8}>
              <Text style={[s.tabBtnText, { color: active ? '#fff' : colors.red }]}>{t === 'profile' ? 'Profile' : 'Settings'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[s.content, { backgroundColor: colors.bg }]}>
        {activeTab === 'profile' ? <ProfileTab /> : <SettingsTab />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  title:   { fontSize: 18, fontWeight: '600', textAlign: 'center', paddingTop: 16, marginBottom: 12 },

  tabBar:    { flexDirection: 'row', marginHorizontal: 16, borderRadius: 8, borderWidth: 1.5, overflow: 'hidden', marginBottom: 4 },
  tabBtn:    { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabBtnText:{ fontSize: 14, fontWeight: '600' },

  sectionCard:  { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  sectionHint:  { fontSize: 12, marginBottom: 12, lineHeight: 17 },
  divider:      { height: 1, marginVertical: 8 },
  fieldLabel:   { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },

  input: { borderWidth: 1.5, borderRadius: 6, paddingVertical: Platform.OS === 'ios' ? 9 : 7, paddingHorizontal: 12, fontSize: 14, marginBottom: 4 },

  authBtn:        { borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  authBtnText:    { fontSize: 15, color: '#fff', fontWeight: '700', backgroundColor: 'transparent' },
  secMsg:         { fontSize: 13, textAlign: 'center', marginTop: 8, fontWeight: '600' },
  authToggleRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  authToggleText: { fontSize: 13 },
  authToggleLink: { fontSize: 13, fontWeight: '700' },
  forgotLink:     { fontSize: 13, textDecorationLine: 'underline' },

  avatarRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 22, fontWeight: '800', color: '#fff' },
  avatarName:  { fontSize: 15, fontWeight: '700' },
  avatarEmail: { fontSize: 13, marginTop: 2 },

  signOutBtn:     { borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, marginTop: 4, backgroundColor: 'transparent' },
  signOutBtnText: { fontSize: 14, fontWeight: '700', backgroundColor: 'transparent' },

  pillRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pill:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: 'transparent' },
  pillText:      { fontSize: 13, fontWeight: '600', backgroundColor: 'transparent' },
  pillTextActive:{ color: '#fff', backgroundColor: 'transparent' },

  settingRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  settingLabel:   { fontSize: 14, fontWeight: '600' },
  settingSubLabel:{ fontSize: 12, marginTop: 2 },

  paramGrid:  { flexDirection: 'row', gap: 8 },
  paramItem:  { flex: 1 },
  paramLabel: { fontSize: 11, marginBottom: 6, textAlign: 'center', lineHeight: 15 },
  paramInput: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 6, paddingVertical: Platform.OS === 'ios' ? 7 : 5, paddingHorizontal: 8, fontSize: 15, fontWeight: '700', textAlign: 'center' },

  dangerBtn:     { borderRadius: 8, paddingVertical: 11, alignItems: 'center', borderWidth: 1.5, borderColor: '#e53935', marginBottom: 6, backgroundColor: 'transparent' },
  dangerBtnText: { fontSize: 14, color: '#e53935', fontWeight: '700', backgroundColor: 'transparent' },
  dangerHint:    { fontSize: 12, textAlign: 'center' },

  aboutRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  aboutLabel:   { fontSize: 13 },
  aboutValue:   { fontSize: 13, fontWeight: '600' },
  aboutLinkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  aboutLink:    { fontSize: 14 },
  aboutChevron: { fontSize: 18 },

  disclaimerCard: { borderRadius: 8, padding: 12, marginTop: 8 },
  disclaimerText: { fontSize: 12, lineHeight: 18 },

  // ── Shadows ──────────────────────────────────────────────────────────────────
  tabBarShadow:     { shadowColor: '#EC5557', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
  primaryBtnShadow: { shadowColor: '#7a1010', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.45, shadowRadius: 0, elevation: 4 },
  outlineBtnShadow: { shadowColor: '#000', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  dangerBtnShadow:  { shadowColor: '#e53935', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3 },

  comingSoonBox:   { borderRadius: 10, borderWidth: 1, padding: 16, alignItems: 'center', gap: 6 },
  comingSoonIcon:  { fontSize: 32 },
  comingSoonTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  comingSoonText:  { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  trainingBtn:     { marginTop: 14, borderWidth: 1.5, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  trainingBtnText: { fontSize: 13, fontWeight: '600' },
});
