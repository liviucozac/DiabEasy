import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView, TextInput,
} from 'react-native';
import { useGlucoseStore } from '../store/glucoseStore';
import type { DiabetesType, SecurityMethod } from '../store/glucoseStore';
import { useTheme } from '../context/AppContext';
import type { ColorScheme } from '../context/colors';
import { hashValue, biometricsAvailable } from '../utils/securityUtils';
import { useTranslation } from '../hooks/useTranslation';

const { width } = Dimensions.get('window');

const SLIDE_ICONS = ['👋', '🩸', '📊', '🥗', '📈', '💉', '📋', '📅', '🚨', '⚙️'];
const CAREGIVER_SLIDE_ICONS = ['👨‍⚕️', '🔑', '👁️'];

// ─── Recommended insulin parameters by diabetes type ─────────────────────────

const RECOMMENDED: Record<DiabetesType, { isf: number; carbRatio: number; target: number }> = {
  'Type 1': { isf: 50, carbRatio: 10, target: 100 },
  'LADA':   { isf: 50, carbRatio: 10, target: 100 },
  'Type 2': { isf: 30, carbRatio: 15, target: 110 },
  'Other':  { isf: 40, carbRatio: 12, target: 105 },
  '':       { isf: 50, carbRatio: 10, target: 100 },
};

// ─── Exact replicas from index.tsx ────────────────────────────────────────────

function UnitToggleMock({ colors }: { colors: ColorScheme }) {
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>unit selector</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', paddingHorizontal: 3, color: colors.red }}>mg/dL</Text>
        <View style={{ width: 34, height: 14, borderRadius: 8, justifyContent: 'center', position: 'relative', backgroundColor: colors.border }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, position: 'absolute', left: 1, backgroundColor: colors.text }} />
        </View>
        <Text style={{ fontSize: 13, fontWeight: 'bold', paddingHorizontal: 3, color: colors.textMuted }}>mmol/L</Text>
      </View>
    </View>
  );
}

function FastingGridMock({ colors }: { colors: ColorScheme }) {
  const opts = ['Fasting', 'Pre-meal', 'Post-meal', 'Random', 'Bedtime', 'Post-exercise'];
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>reading type selector</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', gap: 5, justifyContent: 'center' }}>
        {opts.map((o, i) => (
          <View key={i} style={{
            flexDirection: 'row', alignItems: 'center', borderRadius: 7,
            width: '46%', height: 26, paddingLeft: 8,
            backgroundColor: colors.bgSecondary,
            borderColor: i === 0 ? colors.red : colors.border,
            borderWidth: i === 0 ? 1 : 0,
            shadowColor: i === 0 ? colors.red : '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: i === 0 ? 0.15 : 0.04,
            shadowRadius: i === 0 ? 4 : 2,
            elevation: i === 0 ? 3 : 1,
          }}>
            <View style={{
              width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, marginRight: 6,
              borderColor: i === 0 ? colors.red : colors.border,
              backgroundColor: i === 0 ? colors.red : colors.inputBg,
            }} />
            <Text style={{ fontSize: 11, color: colors.text }}>{o}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BleButtonMock({ colors }: { colors: ColorScheme }) {
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>Home tab — Bluetooth button</Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderWidth: 1.5, borderColor: colors.red, borderRadius: 10,
        paddingVertical: 10, paddingHorizontal: 16,
        backgroundColor: colors.bgCard, alignSelf: 'center',
      }}>
        <Text style={{ fontSize: 20 }}>🔵</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.red }}>Connect Bluetooth glucometer</Text>
      </View>
      <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 16 }}>
        Tap this button → scan for your device → pair once → readings sync automatically.
      </Text>
    </View>
  );
}

function ColorResultMock({ colors }: { colors: ColorScheme }) {
  const items = [
    { value: '60', unit: 'mg/dL', label: '↓ Low',    color: colors.low    },
    { value: '110', unit: 'mg/dL', label: '✓ Normal', color: colors.normal },
    { value: '210', unit: 'mg/dL', label: '↑ High',   color: colors.high   },
  ];
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>colour-coded result</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
        {items.map((it, i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 1, color: it.color }}>{it.value} {it.unit}</Text>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: it.color }}>{it.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatsMock({ colors, isDark }: { colors: ColorScheme; isDark: boolean }) {
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>today's summary card</Text>
      <View style={{
        width: '100%', borderRadius: 14, borderWidth: 1, padding: 8,
        borderColor: colors.border, backgroundColor: colors.bgCard,
        shadowColor: isDark ? '#000' : '#6070a0',
        shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.45 : 0.13,
        shadowRadius: 18, elevation: 6,
      }}>
        <Text style={{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, textAlign: 'center', marginBottom: 5, color: colors.textMuted }}>
          Today's Summary
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', marginBottom: 1, color: colors.text }}>4</Text>
            <Text style={{ fontSize: 8, fontWeight: '500', color: colors.textMuted }}>Readings</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: colors.border }}>
            <Text style={{ fontSize: 13, fontWeight: '800', marginBottom: 1, color: colors.text }}>7.2</Text>
            <Text style={{ fontSize: 8, fontWeight: '500', color: colors.textMuted }}>Average</Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 5 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', marginBottom: 1, color: colors.normal }}>3</Text>
            <Text style={{ fontSize: 8, fontWeight: '500', color: colors.textMuted }}>In Range</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: colors.border }}>
            <Text style={{ fontSize: 13, fontWeight: '800', marginBottom: 1, color: colors.high }}>1</Text>
            <Text style={{ fontSize: 8, fontWeight: '500', color: colors.textMuted }}>Highs</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: colors.border }}>
            <Text style={{ fontSize: 13, fontWeight: '800', marginBottom: 1, color: colors.text }}>0</Text>
            <Text style={{ fontSize: 8, fontWeight: '500', color: colors.textMuted }}>Lows</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Exact replicas from foodguide.tsx ───────────────────────────────────────

function GoalPillsMock({ colors }: { colors: ColorScheme }) {
  const options = [
    { label: 'Lower',    color: colors.normal, active: true  },
    { label: 'Maintain', color: colors.textMuted, active: false },
    { label: 'Raise',    color: colors.red,    active: false },
  ];
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>goal selector</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
        {options.map((opt, i) => (
          <View key={i} style={[{
            paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5,
            minWidth: 70, alignItems: 'center',
            borderColor: opt.color,
            backgroundColor: opt.active ? opt.color : 'transparent',
          }, opt.active ? {
            shadowColor: '#7a1010', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.45, shadowRadius: 0, elevation: 3,
          } : null]}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: opt.active ? '#fff' : opt.color }}>{opt.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FoodRowMock({ colors }: { colors: ColorScheme }) {
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>food row controls</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', marginBottom: 1, color: colors.text }}>Banana (1 medium)</Text>
          <Text style={{ fontSize: 10, lineHeight: 14, color: colors.textMuted }}>27g carbs · 105 kcal · GI 51</Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, borderWidth: 1.5, borderColor: colors.red, backgroundColor: 'transparent' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.red }}>+ Add</Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>Banana (1 medium)</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderColor: colors.border }}>
            <Text style={{ fontSize: 14, fontWeight: '700', lineHeight: 18, color: colors.text }}>−</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', minWidth: 16, textAlign: 'center', color: colors.text }}>2</Text>
          <View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderColor: colors.border }}>
            <Text style={{ fontSize: 14, fontWeight: '700', lineHeight: 18, color: colors.text }}>+</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Exact replicas from medication.tsx ──────────────────────────────────────

function ReminderCardMock({ colors }: { colors: ColorScheme }) {
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>reminder card</Text>
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderRadius: 10, borderWidth: 1, padding: 14,
        borderColor: colors.border, backgroundColor: colors.bgCard,
      }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', marginBottom: 2, color: colors.text }}>Morning rapid insulin</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>08:00 · Rapid-acting · 0 u</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 5, borderWidth: 1.5, borderColor: colors.red, backgroundColor: 'transparent' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.red }}>On</Text>
          </View>
          <View style={{ paddingHorizontal: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.red }}>Edit</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Exact replicas from history.tsx ─────────────────────────────────────────

function HistoryFilterMock({ colors }: { colors: ColorScheme }) {
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>filter & export buttons</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 7 }}>
        <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5, borderColor: colors.red, backgroundColor: 'transparent' }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.red }}>Clear Filters</Text>
        </View>
        <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5, borderColor: colors.red, backgroundColor: 'transparent' }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.red }}>Apply Filters</Text>
        </View>
      </View>
      <View style={{
        alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5,
        borderColor: colors.red, backgroundColor: colors.red,
        shadowColor: '#7a1010', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.45, shadowRadius: 0, elevation: 3,
      }}>
        <Text style={{ fontSize: 11, fontWeight: '500', color: '#fff' }}>📄 Export PDF Report</Text>
      </View>
    </View>
  );
}

// ─── Exact replicas from emergency.tsx ───────────────────────────────────────

function Call112Mock({ colors }: { colors: ColorScheme }) {
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>call button</Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderRadius: 8, paddingHorizontal: 18, paddingVertical: 9,
        backgroundColor: colors.red, alignSelf: 'center',
        shadowColor: '#7a1010', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
      }}>
        <Text style={{ fontSize: 14 }}>📞</Text>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Call 112</Text>
      </View>
    </View>
  );
}

// ─── Bullet extras map: slide index → bullet index → component ───────────────

type ExtraRender = (colors: ColorScheme, isDark: boolean) => React.ReactNode;

const BULLET_EXTRAS: Record<number, Record<number, ExtraRender>> = {
  1: {
    0: (c)       => <BleButtonMock   colors={c} />,
    1: (c)       => <UnitToggleMock  colors={c} />,
    2: (c)       => <FastingGridMock colors={c} />,
    4: (c)       => <ColorResultMock colors={c} />,
  },
  2: {
    2: (c, dark) => <StatsMock       colors={c} isDark={dark} />,
  },
  3: {
    0: (c)       => <GoalPillsMock   colors={c} />,
    2: (c)       => <FoodRowMock     colors={c} />,
  },
  6: {
    1: (c)       => <ReminderCardMock colors={c} />,
  },
  7: {
    3: (c)       => <HistoryFilterMock colors={c} />,
  },
  8: {
    0: (c)       => <Call112Mock      colors={c} />,
  },
};

// ─── Param setup slide ────────────────────────────────────────────────────────

function ParamSetupSlide({
  colors, diabetesType, onConfirm, slideTotal,
}: {
  colors: ColorScheme;
  diabetesType: DiabetesType;
  onConfirm: (isf: number, carbRatio: number, target: number) => void;
  slideTotal: number;
}) {
  const t = useTranslation();
  const rec = RECOMMENDED[diabetesType] ?? RECOMMENDED[''];
  const [useEstimates, setUseEstimates] = useState(false);
  const [isf,      setIsf]      = useState('');
  const [carbRatio,setCarbRatio] = useState('');
  const [target,   setTarget]   = useState('');

  const applyEstimates = (on: boolean) => {
    setUseEstimates(on);
    if (on) {
      setIsf(String(rec.isf));
      setCarbRatio(String(rec.carbRatio));
      setTarget(String(rec.target));
    } else {
      setIsf(''); setCarbRatio(''); setTarget('');
    }
  };

  const handleConfirm = () => {
    const isfVal    = parseFloat(isf)      || rec.isf;
    const carbVal   = parseFloat(carbRatio) || rec.carbRatio;
    const targetVal = parseFloat(target)   || rec.target;
    onConfirm(isfVal, carbVal, targetVal);
  };

  const inputStyle = [ps.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }];

  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false}>
      <Text style={styles.slideIcon}>⚙️</Text>
      <Text style={[styles.slideTitle, { color: colors.text }]}>{t.setYourParams}</Text>
      <Text style={[styles.slideBody, { color: colors.textMuted }]}>{t.setYourParamsBody}</Text>

      <View style={[ps.pathRow]}>
        <TouchableOpacity
          style={[ps.pathBtn, !useEstimates && { backgroundColor: colors.red, borderColor: colors.red }]}
          onPress={() => applyEstimates(false)} activeOpacity={0.8}>
          <Text style={[ps.pathBtnText, { color: !useEstimates ? '#fff' : colors.textMuted }]}>{t.iHaveMyValues}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ps.pathBtn, useEstimates && { backgroundColor: colors.red, borderColor: colors.red }]}
          onPress={() => applyEstimates(true)} activeOpacity={0.8}>
          <Text style={[ps.pathBtnText, { color: useEstimates ? '#fff' : colors.textMuted }]}>{t.suggestValues}</Text>
        </TouchableOpacity>
      </View>

      {useEstimates && (
        <View style={[ps.disclaimer, { backgroundColor: colors.highBg, borderColor: colors.high }]}>
          <Text style={[ps.disclaimerTitle, { color: colors.high }]}>{t.estimatesOnly}</Text>
          <Text style={[ps.disclaimerText, { color: colors.textMuted }]}>
            {t.estimatesOnlyBody(diabetesType || 'Type 1')}
          </Text>
          <View style={ps.recRow}>
            {[
              { label: 'ISF',        value: `${rec.isf} mg/dL/u` },
              { label: 'Carb ratio', value: `1:${rec.carbRatio} g/u` },
              { label: 'Target',     value: `${rec.target} mg/dL` },
            ].map((r, i) => (
              <View key={i} style={ps.recItem}>
                <Text style={[ps.recValue, { color: colors.text }]}>{r.value}</Text>
                <Text style={[ps.recLabel, { color: colors.textMuted }]}>{r.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.bulletCard, { backgroundColor: colors.bgCard, borderColor: colors.border, gap: 12, marginTop: 12 }]}>
        {[
          { label: t.isfInputLabel,           value: isf,       set: setIsf,       placeholder: `e.g. ${rec.isf}` },
          { label: t.carbRatioInputLabel,      value: carbRatio, set: setCarbRatio, placeholder: `e.g. ${rec.carbRatio}` },
          { label: t.targetGlucoseInputLabel,  value: target,    set: setTarget,    placeholder: `e.g. ${rec.target}` },
        ].map((f, i) => (
          <View key={i}>
            <Text style={[ps.inputLabel, { color: colors.textMuted }]}>{f.label}</Text>
            <TextInput
              style={inputStyle}
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder={f.placeholder}
              placeholderTextColor={colors.placeholder}
              value={f.value}
              onChangeText={f.set}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.nextBtn, { backgroundColor: colors.red, flex: 0, marginTop: 20, width: '100%' }]}
        onPress={handleConfirm}
        activeOpacity={0.8}
      >
        <Text style={styles.nextBtnText}>{t.confirmAndGetStarted}</Text>
      </TouchableOpacity>

      <Text style={[styles.pageCount, { color: colors.textFaint }]}>{slideTotal - 1} / {slideTotal}</Text>
    </ScrollView>
  );
}

// ─── Security setup slide ─────────────────────────────────────────────────────

function SecuritySetupSlide({
  colors,
  onConfirm,
  slideTotal,
}: {
  colors: ColorScheme;
  onConfirm: (method: SecurityMethod, hash: string) => void;
  slideTotal: number;
}) {
  const t = useTranslation();
  const [method,          setMethod]          = useState<SecurityMethod>('none');
  const [pin,             setPin]             = useState('');
  const [pinConfirm,      setPinConfirm]      = useState('');
  const [password,        setPassword]        = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [bioOk,           setBioOk]           = useState<boolean | null>(null);
  const [error,           setError]           = useState('');

  const METHOD_OPTIONS: { value: SecurityMethod; icon: string; label: string; desc: string }[] = [
    { value: 'none',       icon: '🔓', label: t.noProtection,     desc: t.appOpensInstantly },
    { value: 'pin',        icon: '🔢', label: t.pinMethod,        desc: t.pinMethodDesc },
    { value: 'password',   icon: '🔑', label: t.passwordMethod,   desc: t.passwordMethodDesc },
    { value: 'biometrics', icon: '🪪', label: t.biometricMethod,  desc: t.biometricMethodDesc },
  ];

  const selectMethod = async (m: SecurityMethod) => {
    setMethod(m); setError('');
    if (m === 'biometrics') {
      const ok = await biometricsAvailable();
      setBioOk(ok);
      if (!ok) setError(t.noBiometricsEnrolled);
    }
  };

  const handleConfirm = () => {
    setError('');
    if (method === 'none') { onConfirm('none', ''); return; }
    if (method === 'pin') {
      if (pin.length !== 4)           { setError(t.pinMust4Digits); return; }
      if (!/^\d{4}$/.test(pin))       { setError(t.pinOnlyDigits); return; }
      if (pin !== pinConfirm)         { setError(t.pinsDoNotMatch); return; }
      onConfirm('pin', hashValue(pin)); return;
    }
    if (method === 'password') {
      if (password.length < 7)        { setError(t.passwordMin7); return; }
      if (password !== passwordConfirm){ setError(t.passwordsDoNotMatch); return; }
      onConfirm('password', hashValue(password)); return;
    }
    if (method === 'biometrics') {
      if (!bioOk) { setError(t.noBiometricsEnrolled); return; }
      onConfirm('biometrics', ''); return;
    }
  };

  const inputStyle = [ps.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }];

  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false}>
      <Text style={styles.slideIcon}>🔐</Text>
      <Text style={[styles.slideTitle, { color: colors.text }]}>{t.secureYourApp}</Text>
      <Text style={[styles.slideBody, { color: colors.textMuted }]}>{t.secureYourAppBody}</Text>

      <View style={sc.methodGrid}>
        {METHOD_OPTIONS.map((opt) => {
          const active = method === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[sc.methodCard, { borderColor: active ? colors.red : colors.border, backgroundColor: active ? colors.bgSecondary : colors.bgCard }]}
              onPress={() => selectMethod(opt.value)}
              activeOpacity={0.75}
              accessibilityLabel={`${opt.label} — ${opt.desc}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              <Text style={sc.methodIcon}>{opt.icon}</Text>
              <Text style={[sc.methodLabel, { color: active ? colors.red : colors.text }]}>{opt.label}</Text>
              <Text style={[sc.methodDesc,  { color: colors.textFaint }]}>{opt.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {method === 'pin' && (
        <View style={[styles.bulletCard, { backgroundColor: colors.bgCard, borderColor: colors.border, gap: 12, marginTop: 12 }]}>
          <View>
            <Text style={[ps.inputLabel, { color: colors.textMuted }]}>{t.enter4DigitPin}</Text>
            <TextInput style={inputStyle} keyboardType="number-pad" maxLength={4} secureTextEntry
              placeholder="••••" placeholderTextColor={colors.placeholder} value={pin} onChangeText={setPin}
              accessibilityLabel="PIN" />
          </View>
          <View>
            <Text style={[ps.inputLabel, { color: colors.textMuted }]}>{t.confirmPinLabel}</Text>
            <TextInput style={inputStyle} keyboardType="number-pad" maxLength={4} secureTextEntry
              placeholder="••••" placeholderTextColor={colors.placeholder} value={pinConfirm} onChangeText={setPinConfirm}
              accessibilityLabel="Confirm PIN" />
          </View>
        </View>
      )}

      {method === 'password' && (
        <View style={[styles.bulletCard, { backgroundColor: colors.bgCard, borderColor: colors.border, gap: 12, marginTop: 12 }]}>
          <View>
            <Text style={[ps.inputLabel, { color: colors.textMuted }]}>{t.passwordLabel}</Text>
            <TextInput style={inputStyle} secureTextEntry
              placeholder={t.passwordPlaceholder} placeholderTextColor={colors.placeholder} value={password} onChangeText={setPassword}
              accessibilityLabel="Password" />
          </View>
          <View>
            <Text style={[ps.inputLabel, { color: colors.textMuted }]}>{t.confirmPasswordLabel}</Text>
            <TextInput style={inputStyle} secureTextEntry
              placeholder={t.repeatPasswordPlaceholder} placeholderTextColor={colors.placeholder} value={passwordConfirm} onChangeText={setPasswordConfirm}
              accessibilityLabel="Confirm password" />
          </View>
        </View>
      )}

      {method === 'biometrics' && bioOk === false && (
        <View style={[sc.bioWarning, { backgroundColor: colors.highBg, borderColor: colors.high }]}>
          <Text style={[sc.bioWarningText, { color: colors.high }]}>⚠️ {t.noBiometricsEnrolled}</Text>
        </View>
      )}
      {method === 'biometrics' && bioOk === true && (
        <View style={[sc.bioWarning, { backgroundColor: colors.normalBg, borderColor: colors.normal }]}>
          <Text style={[sc.bioWarningText, { color: colors.normal }]}>{t.biometricsDetected}</Text>
        </View>
      )}

      {!!error && <Text style={sc.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.nextBtn, { backgroundColor: colors.red, flex: 0, marginTop: 20, width: '100%' }]}
        onPress={handleConfirm}
        activeOpacity={0.8}
        accessibilityLabel="Confirm security method and finish setup"
        accessibilityRole="button"
      >
        <Text style={styles.nextBtnText}>
          {method === 'none' ? t.skipAndGetStarted : t.confirmAndGetStarted}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.pageCount, { color: colors.textFaint }]}>{slideTotal} / {slideTotal}</Text>
    </ScrollView>
  );
}

// ─── Role select slide ────────────────────────────────────────────────────────

function RoleSelectSlide({
  colors,
  pageNum,
  total,
  onPatient,
  onCaregiver,
}: {
  colors: ColorScheme;
  pageNum: number;
  total: number;
  onPatient: () => void;
  onCaregiver: () => void;
}) {
  const t = useTranslation();
  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false}>
      <Text style={styles.slideIcon}>🧭</Text>
      <Text style={[styles.slideTitle, { color: colors.text }]}>{t.roleSelectTitle}</Text>
      <Text style={[styles.slideBody, { color: colors.textMuted }]}>{t.roleSelectBody}</Text>

      <View style={{ width: '100%', gap: 12 }}>
        <TouchableOpacity
          style={[rs.roleBtn, { borderColor: colors.red, backgroundColor: colors.bgCard }]}
          onPress={onPatient}
          activeOpacity={0.8}
        >
          <Text style={rs.roleIcon}>🩸</Text>
          <View style={{ flex: 1 }}>
            <Text style={[rs.roleLabel, { color: colors.text }]}>{t.iAmPatient}</Text>
            <Text style={[rs.roleDesc,  { color: colors.textMuted }]}>{t.iAmPatientDesc}</Text>
          </View>
          <Text style={[rs.roleArrow, { color: colors.red }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[rs.roleBtn, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
          onPress={onCaregiver}
          activeOpacity={0.8}
        >
          <Text style={rs.roleIcon}>👨‍⚕️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[rs.roleLabel, { color: colors.text }]}>{t.iAmCaregiver}</Text>
            <Text style={[rs.roleDesc,  { color: colors.textMuted }]}>{t.iAmCaregiverDesc}</Text>
          </View>
          <Text style={[rs.roleArrow, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.pageCount, { color: colors.textFaint }]}>{pageNum} / {total}</Text>
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const { setHasSeenOnboarding, setSettings, profile } = useGlucoseStore();
  const t = useTranslation();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Physical page layout:
  //   0              → Welcome (t.slides[0])
  //   1              → RoleSelectSlide
  //   2 .. CG_END    → Caregiver slides (t.caregiverSlides)
  //   PATIENT_START  → t.slides[1..9] (patient slides)
  //   PARAM_IDX      → ParamSetupSlide
  //   SECURITY_IDX   → SecuritySetupSlide
  const CG_COUNT      = t.caregiverSlides.length;           // 3
  const PATIENT_START = 2 + CG_COUNT;                       // 5
  const LAST_CG_PAGE  = 1 + CG_COUNT;                       // 4
  const PARAM_IDX     = PATIENT_START + t.slides.length - 1; // 14
  const SECURITY_IDX  = PARAM_IDX + 1;                      // 15
  const TOTAL         = SECURITY_IDX + 1;                   // 16

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * width, animated: true });
    setPage(idx);
  };

  const finish = () => setHasSeenOnboarding(true);

  const handleParamConfirm = (isf: number, carbRatio: number, target: number) => {
    setSettings({ isf, carbRatio, targetGlucose: target, insulinParamsSet: true });
    goTo(SECURITY_IDX);
  };

  const handleSecurityConfirm = (method: SecurityMethod, hash: string) => {
    setSettings({ securityMethod: method, securityHash: hash, hasSeenSecuritySetup: true });
    finish();
  };

  const isRoleSelectSlide = page === 1;
  const isLastCGSlide     = page === LAST_CG_PAGE;
  const isParamStep       = page === PARAM_IDX;
  const isSecurityStep    = page === SECURITY_IDX;
  const rec = RECOMMENDED[profile.diabetesType] ?? RECOMMENDED[''];

  const renderSlide = (slide: typeof t.slides[0], i: number, physicalPage: number) => (
    <ScrollView
      key={i}
      style={{ width }}
      contentContainerStyle={styles.slide}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.slideIcon}>{SLIDE_ICONS[i] ?? '📱'}</Text>
      <Text style={[styles.slideTitle, { color: colors.text }]}>{slide.title}</Text>
      <Text style={[styles.slideBody,  { color: colors.textMuted }]}>{slide.body}</Text>

      <View style={[styles.bulletCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {slide.bullets.map((b, j) => (
          <React.Fragment key={j}>
            <View style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.red }]}>•</Text>
              <Text style={[styles.bulletText, { color: colors.text }]}>{b}</Text>
            </View>
            {BULLET_EXTRAS[i]?.[j]?.(colors, isDark)}
          </React.Fragment>
        ))}
      </View>

      <Text style={[styles.pageCount, { color: colors.textFaint }]}>{physicalPage + 1} / {TOTAL}</Text>
    </ScrollView>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        onMomentumScrollEnd={(e) => {
          setPage(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      >
        {/* Welcome slide */}
        {renderSlide(t.slides[0], 0, 0)}

        {/* Role select slide */}
        <RoleSelectSlide
          colors={colors}
          pageNum={2}
          total={TOTAL}
          onPatient={() => goTo(PATIENT_START)}
          onCaregiver={() => goTo(2)}
        />

        {/* Caregiver slides */}
        {t.caregiverSlides.map((slide, ci) => (
          <ScrollView
            key={`cg${ci}`}
            style={{ width }}
            contentContainerStyle={styles.slide}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.slideIcon}>{CAREGIVER_SLIDE_ICONS[ci] ?? '📱'}</Text>
            <Text style={[styles.slideTitle, { color: colors.text }]}>{slide.title}</Text>
            <Text style={[styles.slideBody,  { color: colors.textMuted }]}>{slide.body}</Text>
            <View style={[styles.bulletCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {slide.bullets.map((b, j) => (
                <View key={j} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: colors.red }]}>•</Text>
                  <Text style={[styles.bulletText, { color: colors.text }]}>{b}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.pageCount, { color: colors.textFaint }]}>{2 + ci + 1} / {TOTAL}</Text>
          </ScrollView>
        ))}

        {/* Patient slides (t.slides[1..9]) */}
        {t.slides.slice(1).map((slide, sliceIdx) =>
          renderSlide(slide, sliceIdx + 1, PATIENT_START + sliceIdx)
        )}

        <ParamSetupSlide
          colors={colors}
          diabetesType={profile.diabetesType}
          onConfirm={handleParamConfirm}
          slideTotal={TOTAL}
        />

        <SecuritySetupSlide
          colors={colors}
          onConfirm={handleSecurityConfirm}
          slideTotal={TOTAL}
        />
      </ScrollView>

      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <View
            key={i}
            style={[styles.dot, {
              backgroundColor: i === page ? colors.red : colors.border,
              width: i === page ? 16 : 8,
            }]}
          />
        ))}
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => {
            if (isSecurityStep) handleSecurityConfirm('none', '');
            else if (isParamStep) handleParamConfirm(rec.isf, rec.carbRatio, rec.target);
            else finish();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: colors.textMuted }]}>
            {(isParamStep || isSecurityStep) ? t.onboardingSkipSetup : t.onboardingSkip}
          </Text>
        </TouchableOpacity>
        {!isParamStep && !isSecurityStep && !isRoleSelectSlide && (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.red }]}
            onPress={() => {
              if (isLastCGSlide) finish();
              else if (page === PARAM_IDX - 1) goTo(PARAM_IDX);
              else goTo(page + 1);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>
              {isLastCGSlide ? t.confirmAndGetStarted : t.onboardingNext}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Slide styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:       { flex: 1 },
  slide:      { alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32 },
  slideIcon:  { fontSize: 64, marginBottom: 20 },
  slideTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  slideBody:  { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 14 },

  bulletCard: { width: '100%', borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  bulletRow:  { flexDirection: 'row', gap: 8 },
  bulletDot:  { fontSize: 15, lineHeight: 21, width: 12 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 20 },

  pageCount:  { fontSize: 11, marginTop: 18 },

  dotsRow:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingBottom: 18 },
  dot:        { height: 8, borderRadius: 4 },

  navRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 44 },
  skipText:   { fontSize: 15 },
  nextBtn:    { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  nextBtnText:{ fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ─── Role select slide styles ─────────────────────────────────────────────────

const rs = StyleSheet.create({
  roleBtn:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1.5, padding: 16, width: '100%' },
  roleIcon:  { fontSize: 28 },
  roleLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  roleDesc:  { fontSize: 12 },
  roleArrow: { fontSize: 26, fontWeight: '300' },
});

// ─── Mock preview wrapper ─────────────────────────────────────────────────────

const mk = StyleSheet.create({
  previewWrap:  { width: '100%', borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 4 },
  previewLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
});

// ─── Param setup slide styles ─────────────────────────────────────────────────

const ps = StyleSheet.create({
  pathRow:        { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 4 },
  pathBtn:        { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#ccc', alignItems: 'center' },
  pathBtnText:    { fontSize: 13, fontWeight: '600' },
  disclaimer:     { width: '100%', borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 4 },
  disclaimerTitle:{ fontSize: 13, fontWeight: '700', marginBottom: 4 },
  disclaimerText: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  recRow:         { flexDirection: 'row', justifyContent: 'space-around' },
  recItem:        { alignItems: 'center' },
  recValue:       { fontSize: 14, fontWeight: '800' },
  recLabel:       { fontSize: 10, marginTop: 2 },
  inputLabel:     { fontSize: 12, marginBottom: 4 },
  input:          { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14 },
});

// ─── Security setup slide styles ─────────────────────────────────────────────

const sc = StyleSheet.create({
  methodGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', marginTop: 4 },
  methodCard:    { width: '47%', borderRadius: 12, borderWidth: 1.5, padding: 12, alignItems: 'center', gap: 4 },
  methodIcon:    { fontSize: 28 },
  methodLabel:   { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  methodDesc:    { fontSize: 11, textAlign: 'center' },
  bioWarning:    { width: '100%', borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 12 },
  bioWarningText:{ fontSize: 13, lineHeight: 19 },
  errorText:     { fontSize: 13, color: '#e53935', marginTop: 8, textAlign: 'center' },
});
