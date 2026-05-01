import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Platform, Alert, Switch, Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGlucoseStore, DiabetesType, ThemeType, InsulinAnalogType, SecurityMethod, LockTimeout } from '../store/glucoseStore';
import { INSULIN_ANALOGS, getAnalogByType } from '../utils/insulinUtils';
import { useTheme } from '../context/AppContext';
import { PressBtn } from '../components/PressBtn';
import { ParamTrainingModal } from '../components/ParamTrainingModal';
import { hashValue, biometricsAvailable } from '../utils/securityUtils';
import { signIn, signUp, signOut, onAuthStateChanged, sendPasswordReset, changePassword } from '../utils/firebaseAuth';
import firestore from '@react-native-firebase/firestore';
import {
  checkFirebasePremium, generateCaregiverCode,
  revokeCaregiverCode, fetchActiveCaregiverCodes,
  CaregiverCodeType, ActiveCaregiverCodes,
} from '../utils/firestoreSync';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useTranslation } from '../hooks/useTranslation';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradeModal } from '../components/UpgradeModal';

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

function AccountSection({ user }: { user: any }) {
  const { colors } = useTheme();
  const t = useTranslation();
  const [mode, setMode]               = useState<'login' | 'signup'>('login');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  const [showChangePw, setShowChangePw]   = useState(false);
  const [currentPw, setCurrentPw]         = useState('');
  const [newPw, setNewPw]                 = useState('');
  const [confirmPw, setConfirmPw]         = useState('');
  const [pwLoading, setPwLoading]         = useState(false);
  const [pwError, setPwError]             = useState('');
  const [pwSuccess, setPwSuccess]         = useState('');

  const { setPremiumPaid } = useSubscriptionStore();

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) { setError(t.pleaseEnterEmailAndPassword); return; }
    setLoading(true); setError('');
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        checkFirebasePremium().then(isOverride => { if (isOverride) setPremiumPaid(true); }).catch(() => {});
      } else {
        await signUp(email.trim(), password);
      }
      setEmail(''); setPassword('');
    } catch (e: any) {
      setError(e.message ?? t.authenticationFailed);
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

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { setPwError(t.allFieldsRequired); return; }
    if (newPw.length < 6) { setPwError(t.newPasswordTooShort); return; }
    if (newPw !== confirmPw) { setPwError(t.newPasswordsDoNotMatch); return; }
    setPwLoading(true); setPwError(''); setPwSuccess('');
    try {
      await changePassword(currentPw, newPw);
      setPwSuccess(t.passwordUpdated);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setShowChangePw(false); setPwSuccess(''); }, 1500);
    } catch (e: any) {
      setPwError(e.message ?? t.couldNotUpdatePassword);
    } finally {
      setPwLoading(false);
    }
  };

  const handleSignOut = async () => { await signOut(); };

  if (user) {
    return (
      <SectionCard>
        <SectionTitle text={t.account} />
        <View style={s.avatarRow}>
          <View style={[s.avatar, { backgroundColor: colors.red }]}>
            <Text style={s.avatarText}>{user.email?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View>
            <Text style={[s.avatarName, { color: colors.text }]}>{t.signedIn}</Text>
            <Text style={[s.avatarEmail, { color: colors.textMuted }]}>{user.email}</Text>
          </View>
        </View>

        {!showChangePw ? (
          <>
            <TouchableOpacity onPress={() => { setShowChangePw(true); setPwError(''); setPwSuccess(''); }} activeOpacity={0.7} style={s.changePwLink}>
              <Text style={[s.changePwLinkText, { color: colors.red }]}>{t.changePassword}</Text>
            </TouchableOpacity>
            <PressBtn style={[s.signOutBtn, { borderColor: colors.red }]} onPress={handleSignOut} activeOpacity={0.75}>
              <Text style={[s.signOutBtnText, { color: colors.red }]}>{t.signOut}</Text>
            </PressBtn>
          </>
        ) : (
          <>
            <FieldLabel text={t.currentPassword} />
            <StyledInput value={currentPw} onChangeText={setCurrentPw} placeholder={t.currentPassword} secureTextEntry />
            <FieldLabel text={t.newPassword} />
            <StyledInput value={newPw} onChangeText={setNewPw} placeholder={t.newPasswordPlaceholder} secureTextEntry />
            <FieldLabel text={t.confirmNewPassword} />
            <StyledInput value={confirmPw} onChangeText={setConfirmPw} placeholder={t.confirmPasswordPlaceholder} secureTextEntry />
            {!!pwError   && <Text style={{ fontSize: 12, color: '#e53935', marginTop: 4, textAlign: 'center' }}>{pwError}</Text>}
            {!!pwSuccess && <Text style={{ fontSize: 12, color: '#2e7d32', marginTop: 4, textAlign: 'center' }}>{pwSuccess}</Text>}
            <PressBtn style={[s.authBtn, { backgroundColor: pwLoading ? colors.border : colors.red }, s.primaryBtnShadow]} onPress={handleChangePassword} activeOpacity={0.75}>
              <Text style={s.authBtnText}>{pwLoading ? t.updating : t.updatePassword}</Text>
            </PressBtn>
            <TouchableOpacity onPress={() => { setShowChangePw(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwError(''); }} activeOpacity={0.7} style={s.changePwLink}>
              <Text style={[s.changePwLinkText, { color: colors.textMuted }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionTitle text={t.account} />
      <View style={{ flexDirection: 'row', marginBottom: 12, borderRadius: 8, borderWidth: 1.5, borderColor: colors.red, overflow: 'hidden' }}>
        {(['login', 'signup'] as const).map((m) => (
          <TouchableOpacity key={m} style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: mode === m ? colors.red : 'transparent' }}
            onPress={() => { setMode(m); setError(''); setSuccess(''); }} activeOpacity={0.8}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: mode === m ? '#fff' : colors.red }}>
              {m === 'login' ? t.signIn : t.signUp}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FieldLabel text={t.emailField} />
      <StyledInput value={email} onChangeText={setEmail} placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" />
      <FieldLabel text={t.passwordField} />
      <StyledInput value={password} onChangeText={setPassword} placeholder={t.passwordField} secureTextEntry />
      {!!error   && <Text style={{ fontSize: 12, color: '#e53935', marginTop: 4, textAlign: 'center' }}>{error}</Text>}
      {!!success && <Text style={{ fontSize: 12, color: '#2e7d32', marginTop: 4, textAlign: 'center' }}>{success}</Text>}
      <PressBtn style={[s.authBtn, { backgroundColor: loading ? colors.border : colors.red }, s.primaryBtnShadow]} onPress={handleAuth} activeOpacity={0.75}>
        <Text style={s.authBtnText}>{loading ? t.pleaseWait : mode === 'login' ? t.signIn : t.createAccount}</Text>
      </PressBtn>
      {mode === 'login' && (
        <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} style={s.changePwLink}>
          <Text style={[s.forgotLink, { color: colors.textMuted }]}>{t.forgotPassword}</Text>
        </TouchableOpacity>
      )}
    </SectionCard>
  );
}

// ─── Caregiver Code Section ───────────────────────────────────────────────────

function CaregiverCodeSection({ patientName, patientAddress }: { patientName: string; patientAddress: string }) {
  const { colors } = useTheme();
  const { history, insulinEntries, savedMeals, setCaregiverSyncEnabled } = useGlucoseStore();
  const { isPremium } = useSubscription();

  const [selectedType, setSelectedType] = useState<CaregiverCodeType>('temporary');
  const [activeCodes,  setActiveCodes]  = useState<ActiveCaregiverCodes>({ temporary: null, permanent: null });
  const [tempExpiresAt, setTempExpiresAt] = useState<Date | null>(null);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [generating,   setGenerating]   = useState(false);
  const [genError,     setGenError]     = useState('');
  const [revoking,     setRevoking]     = useState<CaregiverCodeType | null>(null);
  const [showUpgrade,  setShowUpgrade]  = useState(false);

  useEffect(() => {
    fetchActiveCaregiverCodes()
      .then(codes => {
        setActiveCodes(codes);
        if (codes.temporary) {
          firestore().collection('inviteCodes').doc(codes.temporary).get()
            .then(doc => {
              console.log('EXISTS:', doc.exists());
              console.log('DATA:', JSON.stringify(doc.data()));
              if (doc.exists()) setTempExpiresAt(doc.data()?.expiresAt?.toDate() ?? null);
            }).catch(e => console.log('EXPIRY FETCH ERROR:', e));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCodes(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true); setGenError('');
    try {
      const code = await generateCaregiverCode(
        patientName || 'Patient',
        patientAddress ?? '',
        selectedType,
        history,
        insulinEntries,
        savedMeals,
      );
      setCaregiverSyncEnabled(true);
      setActiveCodes(prev => ({ ...prev, [selectedType]: code }));
      if (selectedType === 'temporary') {
        setTempExpiresAt(new Date(Date.now() + 24 * 60 * 60 * 1000));
      }
    } catch (e: any) {
      setGenError(e.message ?? 'Failed to generate code. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (type: CaregiverCodeType) => {
    const code = activeCodes[type];
    if (!code) return;
    setRevoking(type);
    try {
      await revokeCaregiverCode(code);
      setActiveCodes(prev => ({ ...prev, [type]: null }));
      if (type === 'temporary') setTempExpiresAt(null);
    } catch {
    } finally {
      setRevoking(null);
    }
  };

  const ActiveCodeCard = ({ type }: { type: CaregiverCodeType }) => {
    const code = activeCodes[type];
    if (!code) return null;
    const isPermanent = type === 'permanent';

    const expiryLabel = !isPermanent && tempExpiresAt
      ? `Expires: ${tempExpiresAt.toLocaleDateString()} at ${tempExpiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : null;

    return (
      <View style={[cg.codeCard, { borderColor: isPermanent ? colors.red : colors.normal, backgroundColor: colors.inputBg }]}>
        <View style={cg.codeCardHeader}>
          <Text style={[cg.codeCardLabel, { color: colors.textMuted }]}>
            {isPermanent ? '🔒 Permanent' : '⏳ 24-hour'}
          </Text>
          <TouchableOpacity
            onPress={() => handleRevoke(type)}
            disabled={revoking === type}
            activeOpacity={0.75}
            style={[cg.revokeBtn, { borderColor: '#e53935' }]}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: revoking === type ? colors.textMuted : '#e53935' }}>
              {revoking === type ? 'Revoking…' : 'Revoke'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[cg.codeDigits, { color: isPermanent ? colors.red : colors.normal }]}>{code}</Text>
        <Text style={[cg.codeHint, { color: colors.textFaint }]}>
          {isPermanent
            ? 'Active until revoked. Share only with a parent or tutor.'
            : expiryLabel ?? 'Active for 24 hours or until revoked.'}
        </Text>
      </View>
    );
  };

  return (
    <SectionCard>
      <SectionTitle text="Caregiver Access" />

      {!isPremium ? (
        <View style={{ alignItems: 'center', paddingVertical: 12, gap: 10 }}>
          <Text style={{ fontSize: 36 }}>👑</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
            Premium Feature
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 }}>
            Caregiver access lets doctors and family members view your data in read-only mode. Upgrade to unlock code generation.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 6, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 24,
              backgroundColor: colors.red,
              shadowColor: '#7a1010', shadowOffset: { width: 4, height: 4 },
              shadowOpacity: 0.45, shadowRadius: 0, elevation: 4,
            }}
            onPress={() => setShowUpgrade(true)}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Upgrade to Premium</Text>
          </TouchableOpacity>
          <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
        </View>
      ) : (
        <>
          <Text style={[s.sectionHint, { color: colors.textMuted }]}>
            Share a code with a doctor, parent, or caregiver so they can view your data in read-only mode.
          </Text>

          {loadingCodes ? (
            <Text style={{ fontSize: 12, color: colors.textFaint, textAlign: 'center', marginBottom: 8 }}>Loading…</Text>
          ) : (
            <>
              <ActiveCodeCard type="temporary" />
              <ActiveCodeCard type="permanent" />
            </>
          )}

          {(activeCodes.temporary || activeCodes.permanent) && (
            <View style={[s.divider, { backgroundColor: colors.border, marginVertical: 14 }]} />
          )}

          <FieldLabel text="Generate a new code" />
          <View style={cg.typeRow}>
            {(['temporary', 'permanent'] as CaregiverCodeType[]).map((type) => {
              const active = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[cg.typePill, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }, active ? s.primaryBtnShadow : null]}
                  onPress={() => setSelectedType(type)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : colors.textMuted }}>
                    {type === 'temporary' ? '⏳ 24-hour' : '🔒 Permanent'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedType === 'permanent' && (
            <View style={[cg.warningBox, { backgroundColor: colors.lowBg, borderColor: colors.low }]}>
              <Text style={[cg.warningText, { color: colors.low }]}>
                ⚠️  Only share a permanent code with a parent or tutor you fully trust. It stays active until you revoke it.
              </Text>
            </View>
          )}

          {!!genError && (
            <Text style={{ fontSize: 12, color: '#e53935', marginBottom: 8, textAlign: 'center' }}>{genError}</Text>
          )}

          <PressBtn
            style={[s.authBtn, { backgroundColor: generating ? colors.border : colors.red }, s.primaryBtnShadow]}
            onPress={handleGenerate}
            activeOpacity={0.75}
          >
            <Text style={s.authBtnText}>
              {generating
                ? '…'
                : activeCodes[selectedType]
                  ? `Replace ${selectedType === 'temporary' ? '24-hour' : 'permanent'} code`
                  : `Generate ${selectedType === 'temporary' ? '24-hour' : 'permanent'} code`}
            </Text>
          </PressBtn>
        </>
      )}
    </SectionCard>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { profile, setProfile, caregiverSession } = useGlucoseStore();
  const { colors } = useTheme();
  const t = useTranslation();

  const [user,  setUser]  = useState<any>(null);
  const [draft, setDraft] = useState({ ...profile });
  const [saved, setSaved] = useState(false);
  const [showDiagnosisPicker, setShowDiagnosisPicker] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  const set = (field: Partial<typeof draft>) => setDraft(d => ({ ...d, ...field }));

  const handleSave = () => {
    setProfile(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const DIABETES_TYPES: DiabetesType[] = ['Type 1', 'Type 2', 'LADA', 'Other'];

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
      <AccountSection user={user} />

      {!caregiverSession && user && <CaregiverCodeSection patientName={draft.name} patientAddress={draft.address ?? ''} />}

      {user && <SectionCard>
        <SectionTitle text={t.personalInfo} />
        <FieldLabel text={t.fullName} />
        <StyledInput value={draft.name} onChangeText={(v) => set({ name: v })} placeholder={t.fullNamePlaceholder} />
        {!caregiverSession && <>
          <FieldLabel text={t.age} />
          <StyledInput value={draft.age} onChangeText={(v) => set({ age: v })} placeholder={t.agePlaceholder} keyboardType="number-pad" />
          <FieldLabel text={t.diabetesType} />
          <View style={s.pillRow}>
            {DIABETES_TYPES.map((tp) => {
              const active = draft.diabetesType === tp;
              return (
                <TouchableOpacity key={tp}
                  style={[s.pill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
                  onPress={() => set({ diabetesType: tp })} activeOpacity={0.75}>
                  <Text style={[s.pillText, { color: active ? '#fff' : colors.textMuted }]}>{tp}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <FieldLabel text={t.diagnosisDate} />
          <TouchableOpacity
            style={[s.input, s.datePickerBtn, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
            onPress={() => setShowDiagnosisPicker(true)}
            activeOpacity={0.75}
          >
            <Text style={{ color: draft.diagnosisDate ? colors.text : colors.placeholder, fontSize: 15 }}>
              {draft.diagnosisDate || t.diagnosisDatePlaceholder}
            </Text>
          </TouchableOpacity>
          {showDiagnosisPicker && (
            Platform.OS === 'ios' ? (
              <Modal transparent animationType="fade" onRequestClose={() => setShowDiagnosisPicker(false)}>
                <View style={s.dateModalOverlay}>
                  <View style={[s.dateModalSheet, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <DateTimePicker
                      value={(() => { if (draft.diagnosisDate) { const [m, y] = draft.diagnosisDate.split('/'); const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1); return isNaN(d.getTime()) ? new Date() : d; } return new Date(); })()}
                      mode="date" display="spinner" maximumDate={new Date()}
                      onChange={(_, date) => { if (date) { set({ diagnosisDate: `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` }); } }}
                    />
                    <TouchableOpacity style={[s.dateModalDone, { backgroundColor: colors.red }]} onPress={() => setShowDiagnosisPicker(false)}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t.done}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={(() => { if (draft.diagnosisDate) { const [m, y] = draft.diagnosisDate.split('/'); const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1); return isNaN(d.getTime()) ? new Date() : d; } return new Date(); })()}
                mode="date" display="spinner" maximumDate={new Date()}
                onChange={(_, date) => { setShowDiagnosisPicker(false); if (date) { set({ diagnosisDate: `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` }); } }}
              />
            )
          )}
          <FieldLabel text={t.doctorName} />
          <StyledInput value={draft.doctorName} onChangeText={(v) => set({ doctorName: v })} placeholder={t.doctorNamePlaceholder} />
          <FieldLabel text={t.clinicHospital} />
          <StyledInput value={draft.clinicName} onChangeText={(v) => set({ clinicName: v })} placeholder={t.clinicPlaceholder} />
          <FieldLabel text={t.address} />
          <StyledInput value={draft.address ?? ''} onChangeText={(v) => set({ address: v })} placeholder={t.addressPlaceholder} />
        </>}
        <PressBtn
          style={[s.saveProfileBtn, { backgroundColor: colors.red }, s.primaryBtnShadow]}
          onPress={handleSave}
          activeOpacity={0.8}
          accessibilityLabel={t.saveProfile}
        >
          <Text style={s.saveProfileBtnText}>{saved ? t.savedCheck : t.saveProfile}</Text>
        </PressBtn>
      </SectionCard>}
    </ScrollView>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const { settings, setSettings, clearHistory, clearInsulinLog, caregiverSession } = useGlucoseStore();
  const { colors } = useTheme();
  const t = useTranslation();
  const [showTraining,    setShowTraining]    = useState(false);
  const [isfFocused,      setIsfFocused]      = useState(false);
  const [ratioFocused,    setRatioFocused]    = useState(false);
  const [targetFocused,   setTargetFocused]   = useState(false);
  const [diaFocused,      setDiaFocused]      = useState(false);
  const [secNewPin,       setSecNewPin]       = useState('');
  const [secConfirmPin,   setSecConfirmPin]   = useState('');
  const [secNewPass,      setSecNewPass]      = useState('');
  const [secConfirmPass,  setSecConfirmPass]  = useState('');
  const [secError,        setSecError]        = useState('');
  const [secSuccess,      setSecSuccess]      = useState('');

  const LOCK_TIMEOUT_OPTIONS: { label: string; value: LockTimeout }[] = [
    { label: t.lockImmediate, value: 'immediate' },
    { label: t.lock1min,      value: '1min'      },
    { label: t.lock5min,      value: '5min'      },
    { label: t.lockOnClose,   value: 'app-close' },
  ];

  const SECURITY_METHOD_OPTIONS: { label: string; value: SecurityMethod; icon: string }[] = [
    { label: t.lockMethodNone,       value: 'none',       icon: '🔓' },
    { label: t.lockMethodPin,        value: 'pin',        icon: '🔢' },
    { label: t.lockMethodPassword,   value: 'password',   icon: '🔑' },
    { label: t.lockMethodBiometrics, value: 'biometrics', icon: '🪪' },
  ];

  const handleMethodChange = async (method: SecurityMethod) => {
    setSecError(''); setSecSuccess('');
    setSecNewPin(''); setSecConfirmPin('');
    setSecNewPass(''); setSecConfirmPass('');
    if (method === 'biometrics') {
      const ok = await biometricsAvailable();
      if (!ok) { setSecError(t.noGiometrics); return; }
    }
    if (method === 'none') {
      setSettings({ securityMethod: 'none', securityHash: '' });
      setSecSuccess(t.securityDisabled);
    } else {
      setSettings({ securityMethod: method, securityHash: '' });
      if (method === 'biometrics') setSecSuccess(t.biometricsEnabled);
    }
  };

  const handleSaveCredential = () => {
    setSecError(''); setSecSuccess('');
    if (settings.securityMethod === 'pin') {
      if (secNewPin.length !== 4 || !/^\d{4}$/.test(secNewPin)) { setSecError(t.pinMust4Digits); return; }
      if (secNewPin !== secConfirmPin) { setSecError(t.pinsDoNotMatch); return; }
      setSettings({ securityHash: hashValue(secNewPin) });
      setSecNewPin(''); setSecConfirmPin('');
      setSecSuccess(t.pinSaved);
    } else if (settings.securityMethod === 'password') {
      if (secNewPass.length < 7)         { setSecError(t.passwordMin7); return; }
      if (secNewPass !== secConfirmPass)  { setSecError(t.passwordsDoNotMatch); return; }
      setSettings({ securityHash: hashValue(secNewPass) });
      setSecNewPass(''); setSecConfirmPass('');
      setSecSuccess(t.passwordSaved);
    }
  };

  const THEMES: { label: string; value: ThemeType }[] = [
    { label: t.themeLight,  value: 'light' },
    { label: t.themeDark,   value: 'dark' },
    { label: t.themeSystem, value: 'system' },
  ];

  const handleClearData = () => {
    Alert.alert(
      t.clearAllDataConfirmTitle,
      t.clearAllDataConfirmBody,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.yesDeleteEverything,
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t.areYouSure,
              t.lastChance,
              [
                { text: t.goBack, style: 'cancel' },
                { text: t.deletePermanently, style: 'destructive', onPress: () => { clearHistory(); clearInsulinLog(); } },
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
        <SectionTitle text={t.appearance} />
        <FieldLabel text={t.theme} />
        <View style={s.pillRow}>
          {THEMES.map((th) => {
            const active = settings.theme === th.value;
            return (
              <TouchableOpacity key={th.value}
                style={[s.pill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
                onPress={() => setSettings({ theme: th.value })} activeOpacity={0.75}>
                <Text style={[s.pillText, { color: active ? '#fff' : colors.textMuted }]}>{th.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard>
        <SectionTitle text={t.unitsAndLanguage} />
        <FieldLabel text={t.defaultGlucoseUnit} />
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
            <Text style={[s.settingLabel, { color: colors.text }]}>{t.language}</Text>
          </View>
          <View style={s.pillRow}>
            {(['en', 'ro'] as const).map((lang) => {
              const active = (settings.language ?? 'en') === lang;
              return (
                <TouchableOpacity key={lang}
                  style={[s.pill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
                  onPress={() => setSettings({ language: lang })} activeOpacity={0.75}>
                  <Text style={[s.pillText, { color: active ? '#fff' : colors.textMuted }]}>{lang === 'en' ? '🇬🇧 EN' : '🇷🇴 RO'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SectionCard>

      {!caregiverSession && <SectionCard>
        <SectionTitle text={t.insulinCalcDefaults} />
        <Text style={[s.sectionHint, { color: colors.textMuted }]}>{t.insulinCalcHint}</Text>
        <FieldLabel text={t.rapidActingInsulinType} />
        <View style={s.pillRow}>
          {INSULIN_ANALOGS.map((analog) => {
            const active = settings.insulinAnalogType === analog.value;
            return (
              <TouchableOpacity key={analog.value}
                style={[s.pill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
                onPress={() => setSettings({ insulinAnalogType: analog.value as InsulinAnalogType, dia: analog.defaultDia })}
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
            { label: t.targetGlycemia, value: String(settings.targetGlucose), focused: targetFocused, setFocused: setTargetFocused, onChange: (v: string) => { const n = parseFloat(v); if (!isNaN(n)) setSettings({ targetGlucose: n, insulinParamsSet: true }); } },
            { label: t.isfParam,       value: String(settings.isf),           focused: isfFocused,    setFocused: setIsfFocused,    onChange: (v: string) => { const n = parseFloat(v); if (!isNaN(n)) setSettings({ isf: n, insulinParamsSet: true }); } },
            { label: t.carbRatioParam, value: String(settings.carbRatio),     focused: ratioFocused,  setFocused: setRatioFocused,  onChange: (v: string) => { const n = parseFloat(v); if (!isNaN(n)) setSettings({ carbRatio: n, insulinParamsSet: true }); } },
            { label: t.diaParam,       value: String(settings.dia),           focused: diaFocused,    setFocused: setDiaFocused,    onChange: (v: string) => { const n = parseFloat(v); if (!isNaN(n)) setSettings({ dia: n }); } },
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
        <PressBtn style={[s.authBtn, { backgroundColor: colors.red }, s.primaryBtnShadow]} onPress={() => setSettings({ insulinParamsSet: true })} activeOpacity={0.8}>
          <Text style={s.authBtnText}>{t.saveParameters}</Text>
        </PressBtn>
        <TouchableOpacity style={[s.trainingBtn, { borderColor: colors.red }]} onPress={() => setShowTraining(true)} activeOpacity={0.75}>
          <Text style={[s.trainingBtnText, { color: colors.red }]}>{t.whatDoParamsMean}</Text>
        </TouchableOpacity>
        <ParamTrainingModal visible={showTraining} onClose={() => setShowTraining(false)} />
      </SectionCard>}

      <SectionCard>
        <SectionTitle text={t.security} />
        <Text style={[s.sectionHint, { color: colors.textMuted }]}>{t.securityHint}</Text>
        <FieldLabel text={t.lockMethod} />
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
        {settings.securityMethod === 'pin' && (
          <View style={{ gap: 8, marginTop: 10 }}>
            <FieldLabel text={t.newPin} />
            <StyledInput value={secNewPin} onChangeText={setSecNewPin} placeholder="••••" keyboardType="number-pad" maxLength={4} secureTextEntry accessibilityLabel={t.newPin} />
            <FieldLabel text={t.confirmPin} />
            <StyledInput value={secConfirmPin} onChangeText={setSecConfirmPin} placeholder="••••" keyboardType="number-pad" maxLength={4} secureTextEntry accessibilityLabel={t.confirmPin} />
            <PressBtn style={[s.authBtn, { backgroundColor: colors.red }, s.primaryBtnShadow]} onPress={handleSaveCredential} accessibilityLabel={t.savePin}>
              <Text style={s.authBtnText}>{t.savePin}</Text>
            </PressBtn>
          </View>
        )}
        {settings.securityMethod === 'password' && (
          <View style={{ gap: 8, marginTop: 10 }}>
            <FieldLabel text={t.newPasswordSetting} />
            <StyledInput value={secNewPass} onChangeText={setSecNewPass} placeholder={t.newPasswordSetting} secureTextEntry accessibilityLabel={t.newPasswordSetting} />
            <FieldLabel text={t.confirmPin} />
            <StyledInput value={secConfirmPass} onChangeText={setSecConfirmPass} placeholder={t.confirmPasswordPlaceholder} secureTextEntry accessibilityLabel={t.confirmPin} />
            <PressBtn style={[s.authBtn, { backgroundColor: colors.red }, s.primaryBtnShadow]} onPress={handleSaveCredential} accessibilityLabel={t.savePasswordBtn}>
              <Text style={s.authBtnText}>{t.savePasswordBtn}</Text>
            </PressBtn>
          </View>
        )}
        {!!secError   && <Text style={[s.secMsg, { color: '#e53935' }]}>{secError}</Text>}
        {!!secSuccess && <Text style={[s.secMsg, { color: '#2e7d32' }]}>{secSuccess}</Text>}
        {settings.securityMethod !== 'none' && (
          <>
            <Divider />
            <FieldLabel text={t.lockAfter} />
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

      {!caregiverSession && <SectionCard>
        <SectionTitle text={t.notifications} />
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.settingLabel, { color: colors.text }]}>{t.enableNotifications}</Text>
            <Text style={[s.settingSubLabel, { color: colors.textFaint }]}>{t.enableNotificationsSubtitle}</Text>
          </View>
          <Switch value={settings.notificationsEnabled} onValueChange={(v) => setSettings({ notificationsEnabled: v })} trackColor={{ false: '#ccc', true: RED }} thumbColor="#fff" />
        </View>
      </SectionCard>}

      {!caregiverSession && <SectionCard>
        <SectionTitle text={t.data} />
        <PressBtn style={[s.dangerBtn]} onPress={handleClearData} activeOpacity={0.75}>
          <Text style={s.dangerBtnText}>{t.clearAllData}</Text>
        </PressBtn>
        <Text style={[s.dangerHint, { color: colors.textFaint }]}>{t.clearAllDataHint}</Text>
      </SectionCard>}

      <SectionCard>
        <SectionTitle text={t.about} />
        <View style={s.aboutRow}><Text style={[s.aboutLabel, { color: colors.textMuted }]}>{t.appVersion}</Text><Text style={[s.aboutValue, { color: colors.text }]}>2.0.0</Text></View>
        <Divider />
        <View style={s.aboutRow}><Text style={[s.aboutLabel, { color: colors.textMuted }]}>{t.builtWith}</Text><Text style={[s.aboutValue, { color: colors.text }]}>Expo · React Native · Zustand</Text></View>
        <Divider />
        {[t.privacyPolicy, t.termsOfUse, t.sendFeedback].map((item, i) => (
          <View key={i}>
            <TouchableOpacity style={s.aboutLinkRow} onPress={() => Alert.alert(item, t.notPublishedYet(item))} activeOpacity={0.75}>
              <Text style={[s.aboutLink, { color: colors.text }]}>{item}</Text>
              <Text style={[s.aboutChevron, { color: colors.border }]}>›</Text>
            </TouchableOpacity>
            {i < 2 && <Divider />}
          </View>
        ))}
        <Divider />
        <View style={s.disclaimerCard}>
          <Text style={[s.disclaimerText, { color: colors.textMuted }]}>{t.appDisclaimer}</Text>
        </View>
      </SectionCard>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colors } = useTheme();
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <Text style={[s.title, { color: colors.text }]}>{t.profileSettings}</Text>
      <View style={[s.tabBar, { borderColor: colors.red }, s.tabBarShadow]}>
        {(['profile', 'settings'] as ActiveTab[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity key={tab}
              style={[s.tabBtn, { backgroundColor: active ? colors.red : colors.bg }]}
              onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
              <Text style={[s.tabBtnText, { color: active ? '#fff' : colors.red }]}>{tab === 'profile' ? t.profileTab : t.settingsTab}</Text>
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
  forgotLink:       { fontSize: 13, textDecorationLine: 'underline' },
  changePwLink:     { alignItems: 'center', marginTop: 10 },
  changePwLinkText: { fontSize: 13, textDecorationLine: 'underline' },

  datePickerBtn:    { justifyContent: 'center', paddingHorizontal: 14 },
  dateModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  dateModalSheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1 },
  dateModalDone:    { borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 12 },

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

  tabBarShadow:     { shadowColor: '#EC5557', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
  primaryBtnShadow: { shadowColor: '#7a1010', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.45, shadowRadius: 0, elevation: 4 },
  outlineBtnShadow: { shadowColor: '#000', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  dangerBtnShadow:  { shadowColor: '#e53935', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3 },

  trainingBtn:     { marginTop: 14, borderWidth: 1.5, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  trainingBtnText: { fontSize: 13, fontWeight: '600' },

  codeBox:  { borderWidth: 2, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  codeText: { fontSize: 36, fontWeight: '800', letterSpacing: 8 },
  saveProfileBtn:     { marginTop: 16, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveProfileBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const cg = StyleSheet.create({
  codeCard:       { borderRadius: 10, borderWidth: 1.5, padding: 12, marginBottom: 10 },
  codeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  codeCardLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  codeDigits:     { fontSize: 32, fontWeight: '900', letterSpacing: 8, textAlign: 'center', marginBottom: 4 },
  codeHint:       { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  revokeBtn:      { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeRow:        { flexDirection: 'row', gap: 10, marginBottom: 10 },
  typePill:       { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, alignItems: 'center' },
  warningBox:     { borderRadius: 8, borderWidth: 1.5, padding: 10, marginBottom: 10 },
  warningText:    { fontSize: 12, lineHeight: 17 },
});