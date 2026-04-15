import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, Linking, Vibration,
} from 'react-native';
import { useTheme } from '../context/AppContext';
import { useGlucoseStore } from '../store/glucoseStore';
import { checkHash, tryBiometrics } from '../utils/securityUtils';

interface LockScreenProps {
  onUnlock: () => void;
}

// ─── PIN pad ──────────────────────────────────────────────────────────────────

function PinPad({ onComplete }: { onComplete: (pin: string) => void }) {
  const { colors } = useTheme();
  const [digits, setDigits] = useState('');

  const press = (d: string) => {
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) {
      setTimeout(() => { onComplete(next); setDigits(''); }, 120);
    }
  };

  const del = () => setDigits(d => d.slice(0, -1));

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <View style={lk.padWrap}>
      {/* Dots */}
      <View style={lk.dotsRow}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[lk.dot, { borderColor: colors.red, backgroundColor: i < digits.length ? colors.red : 'transparent' }]} />
        ))}
      </View>

      {/* Keys */}
      <View style={lk.grid}>
        {KEYS.map((k, i) => k === '' ? (
          <View key={i} style={lk.keyEmpty} />
        ) : (
          <TouchableOpacity
            key={i}
            style={[lk.key, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
            onPress={k === '⌫' ? del : () => press(k)}
            activeOpacity={0.7}
            accessibilityLabel={k === '⌫' ? 'Delete last digit' : `Digit ${k}`}
            accessibilityRole="button"
          >
            <Text style={[lk.keyText, { color: colors.text }]}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Lock Screen ──────────────────────────────────────────────────────────────

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { colors, isDark } = useTheme();
  const { settings } = useGlucoseStore();
  const [error, setError]           = useState('');
  const [mode, setMode]             = useState<'primary' | 'pin' | 'password'>(
    settings.securityMethod === 'biometrics' ? 'primary' : settings.securityMethod === 'pin' ? 'pin' : 'password'
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [attempts, setAttempts]     = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS   = 30_000;

  const isLockedOut = () => lockedUntil !== null && Date.now() < lockedUntil;

  const recordFailure = () => {
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      setLockedUntil(Date.now() + LOCKOUT_MS);
      setAttempts(0);
      setError(`Too many attempts. Try again in 30 seconds.`);
    }
  };

  // Auto-trigger biometrics on mount
  useEffect(() => {
    if (settings.securityMethod === 'biometrics') triggerBiometrics();
  }, []);

  const triggerBiometrics = async () => {
    setError('');
    const result = await tryBiometrics();
    if (result.success) { onUnlock(); return; }
    if (result.reason === 'cancelled') return;
    if (result.reason === 'not_available' || result.reason === 'not_enrolled') {
      setMode('pin');
    } else {
      setError('Biometric failed. Use PIN or password below.');
    }
  };

  const handlePin = (pin: string) => {
    if (isLockedOut()) return;
    if (checkHash(pin, settings.securityHash)) {
      onUnlock();
    } else {
      Vibration.vibrate(300);
      recordFailure();
      if (!isLockedOut()) setError('Incorrect PIN. Try again.');
    }
  };

  const handlePassword = () => {
    if (isLockedOut()) return;
    if (checkHash(passwordInput, settings.securityHash)) {
      setPasswordInput('');
      onUnlock();
    } else {
      Vibration.vibrate(300);
      setPasswordInput('');
      recordFailure();
      if (!isLockedOut()) setError('Incorrect password. Try again.');
    }
  };

  const call112 = () => Linking.openURL(`tel:${settings.emergencyNumber || '112'}`);

  return (
    <View style={[lk.root, { backgroundColor: colors.bg }]}>

      {/* Header */}
      <View style={lk.header}>
        <Text style={[lk.appName, { color: colors.red }]}>DiabEasy</Text>
        <Text style={[lk.subtitle, { color: colors.textMuted }]}>
          {mode === 'primary' && settings.securityMethod === 'biometrics'
            ? 'Authenticate to continue'
            : mode === 'pin' ? 'Enter your PIN'
            : 'Enter your password'}
        </Text>
      </View>

      {/* Error */}
      {!!error && (
        <View style={[lk.errorBanner, { backgroundColor: '#fdecea', borderColor: '#e53935' }]}>
          <Text style={lk.errorText}>{error}</Text>
        </View>
      )}

      {/* Biometrics prompt */}
      {mode === 'primary' && settings.securityMethod === 'biometrics' && (
        <View style={lk.bioWrap}>
          <Text style={lk.bioIcon}>🔐</Text>
          <TouchableOpacity
            style={[lk.bioBtn, { backgroundColor: colors.red }]}
            onPress={triggerBiometrics}
            activeOpacity={0.8}
            accessibilityLabel="Authenticate with biometrics"
            accessibilityRole="button"
          >
            <Text style={lk.bioBtnText}>Use Face ID / Fingerprint</Text>
          </TouchableOpacity>
          <View style={lk.fallbackRow}>
            <TouchableOpacity onPress={() => { setError(''); setMode('pin'); }} activeOpacity={0.7} accessibilityLabel="Use PIN instead" accessibilityRole="button">
              <Text style={[lk.fallbackLink, { color: colors.red }]}>Use PIN</Text>
            </TouchableOpacity>
            <Text style={[lk.fallbackSep, { color: colors.textFaint }]}>·</Text>
            <TouchableOpacity onPress={() => { setError(''); setMode('password'); }} activeOpacity={0.7} accessibilityLabel="Use password instead" accessibilityRole="button">
              <Text style={[lk.fallbackLink, { color: colors.red }]}>Use password</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PIN pad */}
      {mode === 'pin' && (
        <>
          <PinPad onComplete={handlePin} />
          {settings.securityMethod === 'biometrics' && (
            <TouchableOpacity onPress={() => { setError(''); setMode('primary'); }} activeOpacity={0.7} style={lk.switchLink} accessibilityLabel="Use biometrics instead" accessibilityRole="button">
              <Text style={[lk.fallbackLink, { color: colors.red }]}>← Use biometrics</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Password input */}
      {mode === 'password' && (
        <View style={lk.passwordWrap}>
          <TextInput
            style={[lk.passwordInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
            placeholder="Enter password"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={passwordInput}
            onChangeText={setPasswordInput}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handlePassword}
            accessibilityLabel="Password"
          />
          <TouchableOpacity
            style={[lk.unlockBtn, { backgroundColor: colors.red }]}
            onPress={handlePassword}
            activeOpacity={0.8}
            accessibilityLabel="Unlock"
            accessibilityRole="button"
          >
            <Text style={lk.unlockBtnText}>Unlock</Text>
          </TouchableOpacity>
          {settings.securityMethod === 'biometrics' && (
            <TouchableOpacity onPress={() => { setError(''); setMode('primary'); }} activeOpacity={0.7} style={lk.switchLink} accessibilityLabel="Use biometrics instead" accessibilityRole="button">
              <Text style={[lk.fallbackLink, { color: colors.red }]}>← Use biometrics</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Emergency button — always visible */}
      <View style={lk.sosWrap}>
        <TouchableOpacity
          style={[lk.sosBtn, { backgroundColor: colors.red }]}
          onPress={call112}
          activeOpacity={0.75}
          accessibilityLabel={`Call ${settings.emergencyNumber || '112'} — emergency services`}
          accessibilityRole="button"
        >
          <Text style={lk.sosBtnText}>📞 Call {settings.emergencyNumber || '112'}</Text>
        </TouchableOpacity>
        <Text style={[lk.sosHint, { color: colors.textFaint }]}>Emergency — no unlock needed</Text>
      </View>

    </View>
  );
}

const lk = StyleSheet.create({
  root:         { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 80, paddingBottom: 48, paddingHorizontal: 24 },
  header:       { alignItems: 'center', gap: 8 },
  appName:      { fontSize: 32, fontWeight: '800' },
  subtitle:     { fontSize: 16, textAlign: 'center' },

  errorBanner:  { width: '100%', borderWidth: 1, borderRadius: 10, padding: 10, marginTop: -8 },
  errorText:    { fontSize: 13, color: '#c62828', textAlign: 'center' },

  bioWrap:      { alignItems: 'center', gap: 16 },
  bioIcon:      { fontSize: 64 },
  bioBtn:       { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  bioBtnText:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  fallbackRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fallbackLink: { fontSize: 14, fontWeight: '600' },
  fallbackSep:  { fontSize: 14 },
  switchLink:   { marginTop: 12 },

  padWrap:      { alignItems: 'center', gap: 24 },
  dotsRow:      { flexDirection: 'row', gap: 16 },
  dot:          { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 12, justifyContent: 'center' },
  key:          { width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  keyEmpty:     { width: 68, height: 68 },
  keyText:      { fontSize: 24, fontWeight: '600' },

  passwordWrap: { width: '100%', gap: 12, alignItems: 'center' },
  passwordInput:{ width: '100%', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  unlockBtn:    { width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  unlockBtnText:{ fontSize: 16, fontWeight: '700', color: '#fff' },

  sosWrap:      { alignItems: 'center', gap: 6 },
  sosBtn:       { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  sosBtnText:   { fontSize: 16, fontWeight: '800', color: '#fff' },
  sosHint:      { fontSize: 12 },
});
