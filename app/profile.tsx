import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Platform, Alert, Switch,
} from 'react-native';
import { useGlucoseStore, DiabetesType, ThemeType } from '../store/glucoseStore';
import { useTheme } from '../context/AppContext';

const RED = '#EC5557';

type ActiveTab = 'profile' | 'settings';
type AuthMode = 'signIn' | 'signUp';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[s.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>{children}</View>;
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

function StyledInput({
  value, onChangeText, placeholder, keyboardType, secureTextEntry, autoCapitalize,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  autoCapitalize?: any;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[s.input, { borderColor: focused ? colors.red : colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      keyboardType={keyboardType ?? 'default'}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize ?? 'sentences'}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      returnKeyType="done"
    />
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { profile, setProfile } = useGlucoseStore();
  const { colors } = useTheme();
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const DIABETES_TYPES: DiabetesType[] = ['Type 1', 'Type 2', 'LADA', 'Other'];

  const handleAuth = () => {
    if (authMode === 'signUp') {
      if (!profile.name.trim() || !profile.email.trim()) {
        Alert.alert('Missing info', 'Please enter your name and email.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password mismatch', 'Passwords do not match.');
        return;
      }
    }
    if (!profile.email.trim()) {
      Alert.alert('Missing info', 'Please enter your email.');
      return;
    }
    // Simulated auth — replace with real backend later
    setIsLoggedIn(true);
    Alert.alert('Success', authMode === 'signIn' ? 'Signed in!' : 'Account created!');
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => setIsLoggedIn(false) },
    ]);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* ── Account ── */}
      <SectionCard>
        <SectionTitle text="Account" />

        {isLoggedIn ? (
          <>
            <View style={s.avatarRow}>
              <View style={[s.avatar, { backgroundColor: colors.red }]}>
                <Text style={s.avatarText}>
                  {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.avatarName, { color: colors.text }]}>{profile.name || 'No name set'}</Text>
                <Text style={[s.avatarEmail, { color: colors.textMuted }]}>{profile.email}</Text>
              </View>
            </View>
            <Divider />
            <TouchableOpacity style={[s.signOutBtn, { borderColor: colors.red }]} onPress={handleSignOut} activeOpacity={0.75}>
              <Text style={[s.signOutBtnText, { color: colors.red }]}>Sign Out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {authMode === 'signUp' && (
              <>
                <FieldLabel text="Name" />
                <StyledInput
                  value={profile.name}
                  onChangeText={(v) => setProfile({ name: v })}
                  placeholder="Your full name"
                />
              </>
            )}

            <FieldLabel text="Email" />
            <StyledInput
              value={profile.email}
              onChangeText={(v) => setProfile({ email: v })}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FieldLabel text="Password" />
            <StyledInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
            />

            {authMode === 'signUp' && (
              <>
                <FieldLabel text="Confirm Password" />
                <StyledInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </>
            )}

            <TouchableOpacity style={[s.authBtn, { backgroundColor: colors.red }]} onPress={handleAuth} activeOpacity={0.75}>
              <Text style={s.authBtnText}>
                {authMode === 'signIn' ? 'Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <View style={s.authToggleRow}>
              <Text style={[s.authToggleText, { color: colors.textMuted }]}>
                {authMode === 'signIn' ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity
                onPress={() => setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn')}
                activeOpacity={0.75}
              >
                <Text style={[s.authToggleLink, { color: colors.red }]}>
                  {authMode === 'signIn' ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>

            {authMode === 'signIn' && (
              <TouchableOpacity
                style={{ alignItems: 'center', marginTop: 8 }}
                onPress={() => Alert.alert('Reset password', 'Password reset not implemented yet.')}
                activeOpacity={0.75}
              >
                <Text style={[s.forgotLink, { color: colors.textFaint }]}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </SectionCard>

      {/* ── Personal Info ── */}
      <SectionCard>
        <SectionTitle text="Personal Info" />

        <FieldLabel text="Full name" />
        <StyledInput
          value={profile.name}
          onChangeText={(v) => setProfile({ name: v })}
          placeholder="Your full name"
        />

        <FieldLabel text="Age" />
        <StyledInput
          value={profile.age}
          onChangeText={(v) => setProfile({ age: v })}
          placeholder="e.g. 28"
          keyboardType="number-pad"
        />

        <FieldLabel text="Diabetes type" />
        <View style={s.pillRow}>
          {DIABETES_TYPES.map((t) => {
            const active = profile.diabetesType === t;
            return (
              <TouchableOpacity
                key={t}
                style={[s.pill, active && { borderColor: colors.red, backgroundColor: colors.red }]}
                onPress={() => setProfile({ diabetesType: t })}
                activeOpacity={0.75}
              >
                <Text style={[s.pillText, { color: colors.textMuted }, active && s.pillTextActive]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FieldLabel text="Diagnosis date (MM/YYYY)" />
        <StyledInput
          value={profile.diagnosisDate}
          onChangeText={(v) => setProfile({ diagnosisDate: v })}
          placeholder="e.g. 03/2018"
          keyboardType="numbers-and-punctuation"
        />

        <FieldLabel text="Doctor / specialist name" />
        <StyledInput
          value={profile.doctorName}
          onChangeText={(v) => setProfile({ doctorName: v })}
          placeholder="e.g. Dr. Smith"
        />

        <FieldLabel text="Clinic / hospital" />
        <StyledInput
          value={profile.clinicName}
          onChangeText={(v) => setProfile({ clinicName: v })}
          placeholder="e.g. City Medical Centre"
        />
      </SectionCard>
    </ScrollView>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const { settings, setSettings, clearHistory, clearInsulinLog } = useGlucoseStore();
  const { colors } = useTheme();
  const [isfFocused,    setIsfFocused]    = useState(false);
  const [ratioFocused,  setRatioFocused]  = useState(false);
  const [targetFocused, setTargetFocused] = useState(false);

  const THEMES: { label: string; value: ThemeType }[] = [
    { label: '☀️ Light',  value: 'light' },
    { label: '🌙 Dark',   value: 'dark' },
    { label: '⚙️ System', value: 'system' },
  ];

  const handleClearData = () => {
    Alert.alert(
      'Clear all data',
      'This will delete your entire glucose history and insulin log. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: () => { clearHistory(); clearInsulinLog(); },
        },
      ],
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* ── Appearance ── */}
      <SectionCard>
        <SectionTitle text="Appearance" />
        <FieldLabel text="Theme" />
        <View style={s.pillRow}>
          {THEMES.map((t) => {
            const active = settings.theme === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[s.pill, active && { borderColor: colors.red, backgroundColor: colors.red }]}
                onPress={() => setSettings({ theme: t.value })}
                activeOpacity={0.75}
              >
                <Text style={[s.pillText, { color: colors.textMuted }, active && s.pillTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      {/* ── Units & Language ── */}
      <SectionCard>
        <SectionTitle text="Units & Language" />

        <FieldLabel text="Default glucose unit" />
        <View style={s.pillRow}>
          {(['mg/dL', 'mmol/L'] as const).map((u) => {
            const active = settings.glucoseUnit === u;
            return (
              <TouchableOpacity
                key={u}
                style={[s.pill, active && { borderColor: colors.red, backgroundColor: colors.red }]}
                onPress={() => setSettings({ glucoseUnit: u })}
                activeOpacity={0.75}
              >
                <Text style={[s.pillText, { color: colors.textMuted }, active && s.pillTextActive]}>{u}</Text>
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
          <View style={[s.pill, { borderColor: colors.red, backgroundColor: colors.red, paddingHorizontal: 12 }]}>
            <Text style={s.pillTextActive}>🇬🇧 EN</Text>
          </View>
        </View>
      </SectionCard>

      {/* ── Insulin Calculator Defaults ── */}
      <SectionCard>
        <SectionTitle text="Insulin Calculator Defaults" />
        <Text style={[s.sectionHint, { color: colors.textMuted }]}>
          These values are used by the Meds calculator. Ask your healthcare provider for your personal settings.
        </Text>

        <View style={s.paramGrid}>
          <View style={s.paramItem}>
            <Text style={[s.paramLabel, { color: colors.textMuted }]}>Target glycemia{'\n'}(mg/dL)</Text>
            <TextInput
              style={[s.paramInput, targetFocused && { borderColor: colors.red }, { color: colors.text, backgroundColor: colors.inputBg }]}
              keyboardType="decimal-pad"
              value={String(settings.targetGlucose)}
              onChangeText={(v) => setSettings({ targetGlucose: parseFloat(v) || 100 })}
              onFocus={() => setTargetFocused(true)}
              onBlur={() => setTargetFocused(false)}
              returnKeyType="done"
            />
          </View>
          <View style={s.paramItem}>
            <Text style={[s.paramLabel, { color: colors.textMuted }]}>ISF{'\n'}(mg/dL per unit)</Text>
            <TextInput
              style={[s.paramInput, isfFocused && { borderColor: colors.red }, { color: colors.text, backgroundColor: colors.inputBg }]}
              keyboardType="decimal-pad"
              value={String(settings.isf)}
              onChangeText={(v) => setSettings({ isf: parseFloat(v) || 50 })}
              onFocus={() => setIsfFocused(true)}
              onBlur={() => setIsfFocused(false)}
              returnKeyType="done"
            />
          </View>
          <View style={s.paramItem}>
            <Text style={[s.paramLabel, { color: colors.textMuted }]}>Carb ratio{'\n'}(g per unit)</Text>
            <TextInput
              style={[s.paramInput, ratioFocused && { borderColor: colors.red }, { color: colors.text, backgroundColor: colors.inputBg }]}
              keyboardType="decimal-pad"
              value={String(settings.carbRatio)}
              onChangeText={(v) => setSettings({ carbRatio: parseFloat(v) || 10 })}
              onFocus={() => setRatioFocused(true)}
              onBlur={() => setRatioFocused(false)}
              returnKeyType="done"
            />
          </View>
        </View>
      </SectionCard>

      {/* ── Notifications ── */}
      <SectionCard>
        <SectionTitle text="Notifications" />
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.settingLabel, { color: colors.text }]}>Enable notifications</Text>
            <Text style={[s.settingSubLabel, { color: colors.textFaint }]}>Reminder alerts from the Meds tab</Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(v) => setSettings({ notificationsEnabled: v })}
            trackColor={{ false: '#ccc', true: RED }}
            thumbColor="#fff"
          />
        </View>
      </SectionCard>

      {/* ── Data ── */}
      <SectionCard>
        <SectionTitle text="Data" />
        <TouchableOpacity style={s.dangerBtn} onPress={handleClearData} activeOpacity={0.75}>
          <Text style={s.dangerBtnText}>🗑 Clear all data</Text>
        </TouchableOpacity>
        <Text style={[s.dangerHint, { color: colors.textFaint }]}>Deletes glucose history and insulin log. Cannot be undone.</Text>
      </SectionCard>

      {/* ── About ── */}
      <SectionCard>
        <SectionTitle text="About" />
        <View style={s.aboutRow}>
          <Text style={[s.aboutLabel, { color: colors.textMuted }]}>App version</Text>
          <Text style={[s.aboutValue, { color: colors.text }]}>2.0.0</Text>
        </View>
        <Divider />
        <View style={s.aboutRow}>
          <Text style={[s.aboutLabel, { color: colors.textMuted }]}>Built with</Text>
          <Text style={[s.aboutValue, { color: colors.text }]}>Expo · React Native · Zustand</Text>
        </View>
        <Divider />
        <TouchableOpacity
          style={s.aboutLinkRow}
          onPress={() => Alert.alert('Privacy Policy', 'Privacy policy not published yet.')}
          activeOpacity={0.75}
        >
          <Text style={[s.aboutLink, { color: colors.text }]}>Privacy Policy</Text>
          <Text style={[s.aboutChevron, { color: colors.border }]}>›</Text>
        </TouchableOpacity>
        <Divider />
        <TouchableOpacity
          style={s.aboutLinkRow}
          onPress={() => Alert.alert('Terms of Use', 'Terms of use not published yet.')}
          activeOpacity={0.75}
        >
          <Text style={[s.aboutLink, { color: colors.text }]}>Terms of Use</Text>
          <Text style={[s.aboutChevron, { color: colors.border }]}>›</Text>
        </TouchableOpacity>
        <Divider />
        <TouchableOpacity
          style={s.aboutLinkRow}
          onPress={() => Alert.alert('Feedback', 'Feedback feature coming soon.')}
          activeOpacity={0.75}
        >
          <Text style={[s.aboutLink, { color: colors.text }]}>Send Feedback</Text>
          <Text style={[s.aboutChevron, { color: colors.border }]}>›</Text>
        </TouchableOpacity>
        <Divider />
        <View style={s.disclaimerCard}>
          <Text style={[s.disclaimerText, { color: colors.textMuted }]}>
            ⚠️ DiabEasy is a personal management aid and not a medical device. Always confirm treatment decisions with your healthcare provider.
          </Text>
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

      <View style={[s.tabBar, { borderColor: colors.red }]}>
        {(['profile', 'settings'] as ActiveTab[]).map((t) => {
          const active = activeTab === t;
          return (
            <TouchableOpacity
              key={t}
              style={[s.tabBtn, { backgroundColor: active ? colors.red : colors.bg }, active && s.tabBtnActive]}
              onPress={() => setActiveTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabBtnText, { color: active ? '#fff' : colors.red }, active && s.tabBtnTextActive]}>
                {t === 'profile' ? 'Profile' : 'Settings'}
              </Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  title: {
    fontSize: 18, fontWeight: '600', textAlign: 'center',
    color: '#222222', paddingTop: 16, marginBottom: 12,
  },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 16,
    borderRadius: 8, borderWidth: 1.5,
    overflow: 'hidden', marginBottom: 4,
  },
  tabBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabBtnActive:     {},
  tabBtnText:       { fontSize: 14, fontWeight: '600' },
  tabBtnTextActive: { color: '#fff' },

  sectionCard: {
    borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0',
    backgroundColor: '#fafafa', padding: 14, marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#666666',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  sectionHint: { fontSize: 12, color: '#666666', marginBottom: 12, lineHeight: 17 },

  divider: { height: 1, backgroundColor: '#ececec', marginVertical: 8 },

  fieldLabel: { fontSize: 12, color: '#666666', fontWeight: '600', marginBottom: 4, marginTop: 8 },

  input: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 6,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    paddingHorizontal: 12, fontSize: 14, color: '#222222',
    backgroundColor: '#ffffff', marginBottom: 4,
  },
  inputFocused: {},

  // Auth
  authBtn:     { borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  authBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  authToggleRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  authToggleText:{ fontSize: 13, color: '#666666' },
  authToggleLink:{ fontSize: 13, fontWeight: '700' },
  forgotLink:    { fontSize: 13, color: '#aaaaaa', textDecorationLine: 'underline' },

  // Avatar
  avatarRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 22, fontWeight: '800', color: '#fff' },
  avatarName:  { fontSize: 15, fontWeight: '700', color: '#222222' },
  avatarEmail: { fontSize: 13, color: '#666666', marginTop: 2 },

  signOutBtn:     { borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, marginTop: 4 },
  signOutBtnText: { fontSize: 14, fontWeight: '700' },

  // Pills
  pillRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pill:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, borderWidth: 1.5, borderColor: '#e0e0e0' },
  pillActive:    {},
  pillText:      { fontSize: 13, fontWeight: '600', color: '#666666' },
  pillTextActive:{ color: '#fff' },

  // Settings rows
  settingRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  settingLabel:   { fontSize: 14, fontWeight: '600', color: '#222222' },
  settingSubLabel:{ fontSize: 12, color: '#aaaaaa', marginTop: 2 },

  // Insulin params grid
  paramGrid:        { flexDirection: 'row', gap: 8 },
  paramItem:        { flex: 1 },
  paramLabel:       { fontSize: 11, color: '#666666', marginBottom: 6, textAlign: 'center', lineHeight: 15 },
  paramInput:       {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 6,
    paddingVertical: Platform.OS === 'ios' ? 7 : 5,
    paddingHorizontal: 8, fontSize: 15, fontWeight: '700',
    color: '#222222', textAlign: 'center', backgroundColor: '#ffffff',
  },
  paramInputFocused:{},

  // Danger
  dangerBtn:     { borderRadius: 8, paddingVertical: 11, alignItems: 'center', borderWidth: 1.5, borderColor: '#e53935', marginBottom: 6 },
  dangerBtnText: { fontSize: 14, color: '#e53935', fontWeight: '700' },
  dangerHint:    { fontSize: 12, color: '#aaaaaa', textAlign: 'center' },

  // About
  aboutRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  aboutLabel:    { fontSize: 13, color: '#666666' },
  aboutValue:    { fontSize: 13, color: '#222222', fontWeight: '600' },
  aboutLinkRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  aboutLink:     { fontSize: 14, color: '#222222' },
  aboutChevron:  { fontSize: 18, color: '#e0e0e0' },

  // Disclaimer
  disclaimerCard: { borderRadius: 8, backgroundColor: 'transparent', padding: 12, marginTop: 8 },
  disclaimerText: { fontSize: 12, lineHeight: 18 },
});