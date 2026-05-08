import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider, useTheme } from '../context/AppContext';
import {
  View, Text, Image, StyleSheet, Animated, AppState, AppStateStatus,
  TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, UIManager,
} from 'react-native';
import { useGlucoseStore } from '../store/glucoseStore';
import { useTranslation } from '../hooks/useTranslation';
import OnboardingScreen from './onboarding';
import { useRef, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import {
  registerForNotifications,
  rescheduleAllReminders,
  cancelAllReminderNotifications,
} from '../utils/notificationUtils';
import { LockScreen } from '../components/LockScreen';
import {
  onAuthStateChanged, signIn, signUp, sendPasswordReset,
} from '../utils/firebaseAuth';
import {
  fetchGlucoseHistory, fetchInsulinLog, fetchUserData,
  checkFirebasePremium, redeemCaregiverCode,
} from '../utils/firestoreSync';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { router } from 'expo-router';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ─── Auth Gate ────────────────────────────────────────────────────────────────

function AuthGateScreen() {
  const { colors } = useTheme();
  const t = useTranslation();
  const { setPremiumPaid } = useSubscriptionStore();

  const [mode, setMode]                 = useState<'login' | 'signup'>('login');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) { setError(t.pleaseEnterEmailAndPassword); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
      checkFirebasePremium().then(ok => { if (ok) setPremiumPaid(true); }).catch(() => {});
      setEmail(''); setPassword('');
      } catch (e: any) {
        if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
          setError('Wrong email and/or password. Please try again.');
        } else if (e.code === 'auth/too-many-requests') {
          setError('Too many failed attempts. Please try again later.');
        } else if (e.code === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
        } else {
          setError(e.message ?? t.authenticationFailed);
        }
      } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError(t.enterEmailFirst); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      await sendPasswordReset(email.trim());
      setSuccess(t.resetEmailSent);
    } catch (e: any) {
      setError(e.message ?? t.couldNotSendReset);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 72, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Image source={{ uri: 'https://i.imgur.com/XRrP3SM.png' }} style={{ width: 72, height: 72 }} resizeMode="contain" />
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.red, marginTop: 8 }}>DiabEasy</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>{t.yourDiabetesCompanion}</Text>
        </View>

        {/* Login / Sign up toggle */}
        <View style={{ flexDirection: 'row', borderRadius: 8, borderWidth: 1.5, borderColor: colors.red, overflow: 'hidden', marginBottom: 20 }}>
          {(['login', 'signup'] as const).map((m) => (
            <TouchableOpacity key={m}
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: mode === m ? colors.red : 'transparent' }}
              onPress={() => { setMode(m); setError(''); setSuccess(''); }} activeOpacity={0.8}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: mode === m ? '#fff' : colors.red }}>
                {m === 'login' ? t.signIn : t.signUp}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Email */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>{t.emailField}</Text>
        <TextInput
          style={{ borderWidth: 1.5, borderRadius: 6, borderColor: colors.border, paddingVertical: Platform.OS === 'ios' ? 10 : 8, paddingHorizontal: 12, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg, marginBottom: 10 }}
          value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor={colors.placeholder}
          keyboardType="email-address" autoCapitalize="none" returnKeyType="next"
        />

        {/* Password */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>{t.passwordField}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 6, borderColor: colors.border, backgroundColor: colors.inputBg, marginBottom: 10 }}>
          <TextInput
            style={{ flex: 1, paddingVertical: Platform.OS === 'ios' ? 10 : 8, paddingHorizontal: 12, fontSize: 14, color: colors.text }}
            value={password} onChangeText={setPassword} placeholder={t.passwordField} placeholderTextColor={colors.placeholder}
            secureTextEntry={!showPassword} returnKeyType="done"
          />
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7} style={{ paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        {!!error   && <Text style={{ fontSize: 12, color: '#e53935', marginTop: 8, textAlign: 'center' }}>{error}</Text>}
        {!!success && <Text style={{ fontSize: 12, color: '#2e7d32', marginTop: 8, textAlign: 'center' }}>{success}</Text>}

        {/* Sign in button */}
        <TouchableOpacity
          style={{
            borderRadius: 8, paddingVertical: 13, alignItems: 'center',
            backgroundColor: loading ? colors.border : colors.red, marginTop: 14,
            shadowColor: '#7a1010', shadowOffset: { width: 4, height: 4 },
            shadowOpacity: 0.45, shadowRadius: 0, elevation: 4,
          }}
          onPress={handleAuth} activeOpacity={0.75} disabled={loading}
        >
          <Text style={{ fontSize: 15, color: '#fff', fontWeight: '700' }}>
            {loading ? t.pleaseWait : mode === 'login' ? t.signIn : t.createAccount}
          </Text>
        </TouchableOpacity>

        {mode === 'login' && (
          <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} style={{ alignItems: 'center', marginTop: 10 }}>
            <Text style={{ fontSize: 13, color: colors.textMuted, textDecorationLine: 'underline' }}>{t.forgotPassword}</Text>
          </TouchableOpacity>
        )}


      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Role Selection Screen ────────────────────────────────────────────────────

function RoleSelectionScreen({ onPatient, onCaregiver }: {
  onPatient: () => void;
  onCaregiver: (session: { code: string; patientName: string; isPremium: boolean }) => void;
}) {
  const { colors } = useTheme();
  const t = useTranslation();
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showCode, setShowCode] = useState(false);

  const handleCaregiverActivate = async () => {
    if (code.trim().length < 6) {
      setError(t.invalidCode);
      return;
    }
    setLoading(true); setError('');
    try {
      const session = await redeemCaregiverCode(code.trim());
      onCaregiver(session);
    } catch (e: any) {
      setError(t.invalidCode);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Image source={{ uri: 'https://i.imgur.com/XRrP3SM.png' }} style={{ width: 64, height: 64 }} resizeMode="contain" />
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.red, marginTop: 8 }}>DiabEasy</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            {t.howWouldYouLikeToUseApp}
          </Text>
        </View>

        {/* Patient button */}
        <TouchableOpacity
          style={{
            borderRadius: 12, padding: 14, marginBottom: 12,
            backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: colors.border,
            shadowColor: '#6070a0', shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1, shadowRadius: 14, elevation: 4,
          }}
          onPress={onPatient}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 22, marginBottom: 6 }}>🩸</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 }}>
            {t.imAPatient}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>
            {t.patientModeDesc}
          </Text>
        </TouchableOpacity>

        {/* Caregiver button */}
        <TouchableOpacity
          style={{
            borderRadius: 12, padding: 14, marginBottom: 12,
            backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: showCode ? colors.red : colors.border,
            shadowColor: '#6070a0', shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1, shadowRadius: 14, elevation: 4,
          }}
          onPress={() => { setShowCode(v => !v); setError(''); setCode(''); }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 22, marginBottom: 6 }}>👩‍⚕️</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 }}>
            {t.imACaregiver}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>
            {t.caregiverModeDesc}
          </Text>
        </TouchableOpacity>

        {/* Code input */}
        {showCode && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>
              {t.enterPatientCode}
            </Text>
            <TextInput
              style={{
                borderWidth: 1.5, borderRadius: 8, borderColor: colors.red,
                paddingVertical: Platform.OS === 'ios' ? 12 : 10, paddingHorizontal: 12,
                fontSize: 26, letterSpacing: 10, textAlign: 'center',
                color: colors.text, backgroundColor: colors.inputBg, marginBottom: 10,
              }}
              value={code} onChangeText={setCode}
              placeholder="000000" placeholderTextColor={colors.placeholder}
              keyboardType="number-pad" maxLength={6}
              autoFocus
            />
            {!!error && (
              <Text style={{ fontSize: 12, color: '#e53935', marginBottom: 8, textAlign: 'center' }}>{error}</Text>
            )}
            <TouchableOpacity
              style={{
                borderRadius: 8, paddingVertical: 13, alignItems: 'center',
                backgroundColor: loading ? colors.border : colors.red,
                shadowColor: '#7a1010', shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 0.45, shadowRadius: 0, elevation: 4,
              }}
              onPress={handleCaregiverActivate}
              activeOpacity={0.75}
              disabled={loading}
            >
              <Text style={{ fontSize: 15, color: '#fff', fontWeight: '700' }}>
                {loading ? t.verifying : t.activateCaregiverMode}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sign out option */}
        <TouchableOpacity
          onPress={async () => {
            const { signOut } = await import('../utils/firebaseAuth');
            await signOut();
          }}
          activeOpacity={0.7}
          style={{ alignItems: 'center', marginTop: 24 }}
        >
          <Text style={{ fontSize: 13, color: colors.textMuted, textDecorationLine: 'underline' }}>
            {t.signOut}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  const { colors } = useTheme();
  const { caregiverSession } = useGlucoseStore();
  const t = useTranslation();
  return (
    <View style={{ backgroundColor: colors.bg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 }}>
      <View style={styles.header}>
        <Image source={{ uri: 'https://i.imgur.com/XRrP3SM.png' }} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.logoText, { color: colors.red }]}>DiabEasy</Text>
      </View>
      {caregiverSession && (
        <View style={{ backgroundColor: colors.red, paddingVertical: 5, paddingHorizontal: 16, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
            {t.viewingDataOf(caregiverSession.patientName)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Animated tab icon ────────────────────────────────────────────────────────

function AnimatedTabIcon({ name, color, focused }: { name: string; color: string; focused: boolean }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(focused ? 1.18 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.18 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{
      transform: [{ scale }],
      shadowColor: focused ? colors.red : 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: focused ? 0.75 : 0,
      shadowRadius: 8,
    }}>
      <Ionicons name={name as any} size={22} color={color} />
    </Animated.View>
  );
}

// ─── Tabs layout ──────────────────────────────────────────────────────────────

function TabsLayout() {
  const { colors } = useTheme();
  const { caregiverSession } = useGlucoseStore();
  const t = useTranslation();

  const ALL_TAB_SCREENS = [
    { name: 'index',      title: t.tabHome,    icon: 'home' },
    { name: 'history',    title: t.tabHistory, icon: 'time' },
    { name: 'foodguide',  title: t.tabFood,    icon: 'nutrition' },
    { name: 'medication', title: t.tabMeds,    icon: 'medical' },
    { name: 'emergency',  title: t.tabSos,     icon: 'warning' },
    { name: 'profile',    title: t.tabProfile, icon: 'person' },
  ];

  const CAREGIVER_TABS = ['history', 'foodguide', 'medication', 'profile'];

  return (
    <Tabs
      initialRouteName={caregiverSession ? 'history' : 'index'}
      screenOptions={{
        tabBarActiveTintColor:   colors.red,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          shadowColor: colors.red,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 16,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: { fontSize: 10 },
        headerShown:      true,
        header:           () => <Header />,
      }}
    >
      {ALL_TAB_SCREENS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            href: caregiverSession && !CAREGIVER_TABS.includes(name) ? null : undefined,
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon name={icon} color={color} focused={focused} />
            ),
          }}
        />
      ))}
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="legal" options={{ href: null }} />
    </Tabs>
  );
}
// ─── Root content ─────────────────────────────────────────────────────────────

function RootContent() {
  const {
    hasSeenOnboarding, reminders, settings,
    caregiverSession, setCaregiverSession,
    ownPremiumBeforeCaregiver, setOwnPremiumBeforeCaregiver,
  } = useGlucoseStore();
  const permGranted    = useRef(false);
  const [isLocked,     setIsLocked]     = useState(false);
  const [user,         setUser]         = useState<any>(null);
  const [authChecked,  setAuthChecked]  = useState(false);
  const [roleChosen,   setRoleChosen]   = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    registerForNotifications().then((granted) => {
      permGranted.current = granted;
      if (granted && settings.notificationsEnabled) rescheduleAllReminders(reminders, settings);
    });
  }, []);

  useEffect(() => {
    if (!settings.notificationsEnabled) cancelAllReminderNotifications();
    else if (permGranted.current) rescheduleAllReminders(reminders, settings);
  }, [settings.notificationsEnabled]);

  useEffect(() => {
    if (settings.securityMethod === 'none') return;
    const handleChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        backgroundedAt.current = Date.now();
        if (settings.lockTimeout === 'immediate') setIsLocked(true);
      } else if (next === 'active') {
        if (settings.lockTimeout === 'immediate') { setIsLocked(true); return; }
        if (settings.lockTimeout === 'app-close') return;
        const elapsed = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
        const threshold = settings.lockTimeout === '1min' ? 60_000 : 300_000;
        if (elapsed >= threshold) setIsLocked(true);
      }
    };
    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, [settings.securityMethod, settings.lockTimeout]);

  useEffect(() => {
    if ((settings.securityMethod ?? 'none') !== 'none' && hasSeenOnboarding) setIsLocked(true);
  }, []);

  useEffect(() => {
    const { loadFromFirestore, clearLocalData } = useGlucoseStore.getState();
    const unsub = onAuthStateChanged(async (u: any) => {
      setUser(u);
      setAuthChecked(true);
      if (u) setRoleChosen(false);
      if (u && !u.isAnonymous) {
        try {
          const [history, insulinEntries, userData, isPremium] = await Promise.all([
            fetchGlucoseHistory(),
            fetchInsulinLog(),
            fetchUserData(),
            checkFirebasePremium(),
          ]);
          loadFromFirestore(history, insulinEntries, userData?.profile ?? {});
          if (isPremium) useSubscriptionStore.getState().setPremiumPaid(true);
        } catch (e) {
          console.error('Firestore load error:', e);
        }
      } else if (!u) {
        clearLocalData();
        setRoleChosen(false);
        setCaregiverSession(null);
        // Reset premium to false on sign out — will be re-checked on next login
        useSubscriptionStore.getState().setPremiumPaid(false);
      }
    });
    return unsub;
  }, []);

  if (!authChecked) return null;
  if (!user)        return <AuthGateScreen />;
  if (isLocked)     return <LockScreen onUnlock={() => setIsLocked(false)} />;

  if (!roleChosen) {
    return (
      <RoleSelectionScreen
        onPatient={() => {
          // Restore own premium if coming back from caregiver mode
          if (caregiverSession) {
            useSubscriptionStore.getState().setPremiumPaid(ownPremiumBeforeCaregiver);
          }
          setCaregiverSession(null);
          setRoleChosen(true);
        }}
        onCaregiver={(session) => {
          // Snapshot own premium before overriding with patient's
          const ownPremium = useSubscriptionStore.getState().isPremiumPaid;
          setOwnPremiumBeforeCaregiver(ownPremium);
          // Apply patient's premium status
          useSubscriptionStore.getState().setPremiumPaid(session.isPremium);
          setCaregiverSession(session);
          setRoleChosen(true);
          setTimeout(() => router.replace('/history'), 500);
        }}
      />
    );
  }

  if (!hasSeenOnboarding && !caregiverSession) return <OnboardingScreen />;
  return <TabsLayout />;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <AppProvider>
      <RootContent />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: 55, paddingBottom: 12, gap: 8,
  },
  logo:     { width: 38, height: 38 },
  logoText: { fontSize: 22, fontWeight: 'bold' },
});