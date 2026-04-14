import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView, TextInput,
} from 'react-native';
import { useGlucoseStore } from '../store/glucoseStore';
import type { DiabetesType } from '../store/glucoseStore';
import { useTheme } from '../context/AppContext';
import type { ColorScheme } from '../context/colors';

const { width } = Dimensions.get('window');

// ─── Slide data ───────────────────────────────────────────────────────────────

interface Slide {
  icon: string;
  title: string;
  body: string;
  bullets: string[];
}

const SLIDES: Slide[] = [
  {
    icon: '👋',
    title: 'Welcome to DiabEasy',
    body: 'Your personal diabetes companion — simple, fast, and always with you.',
    bullets: [
      'Designed specifically for Type 1 diabetes management',
      'Track glucose, food, insulin, and emergencies in one place',
      'No account required to get started — all data stays on your device',
      'Swipe through these slides to learn how each feature works',
    ],
  },
  {
    icon: '🩸',
    title: 'Home: Log Blood Sugar',
    body: 'The Home tab is where you record every reading.',
    bullets: [
      'Choose your unit: mg/dL or mmol/L',
      'Select a reading type: Fasting, Pre-meal, Post-meal, Random, Bedtime, or Post-exercise',
      'Add optional notes (symptoms, insulin taken, etc.)',
      'Your reading is colour-coded: red = Low, green = Normal, orange = High',
      'Low or high? A popup appears with immediate guidance on what to do',
    ],
  },
  {
    icon: '📊',
    title: 'Home: Today\'s Summary',
    body: 'At a glance, see how your day is going.',
    bullets: [
      'Total readings logged today',
      'Average glucose for the day',
      'Count of In Range, High, and Low readings',
      'A contextual tip card updates based on your latest reading',
      'Tap "See Help" after a low or high result for personalised advice',
    ],
  },
  {
    icon: '🥗',
    title: 'Food Guide: Plan Your Meal',
    body: 'Browse 100+ foods and build a personalised meal plan.',
    bullets: [
      'Pick a goal: Lower, Maintain, or Raise your blood sugar',
      'Foods are grouped by category (drinks, grains, proteins, etc.)',
      'Tap "+ Add" to add a food — tap again to increase the portion',
      'Use − and + controls to adjust quantity for each item',
      'See carbs, sugars, fiber, protein, fat, kcal, and GI for every item',
    ],
  },
  {
    icon: '📈',
    title: 'Food Guide: Meal Analysis',
    body: 'Your meal\'s full nutritional breakdown, calculated live.',
    bullets: [
      'Running totals update as you add or remove items',
      'Post-meal glucose estimate shown based on your current reading',
      'If blood sugar is above 150 mg/dL, eating is flagged as not recommended',
      'Recommended insulin dose shown for high readings (2–4 units)',
      'Save meals to your Meal History to track patterns over time',
    ],
  },
  {
    icon: '💉',
    title: 'Meds: Insulin Calculator',
    body: 'The Calculator tab estimates exactly how much insulin to take.',
    bullets: [
      'Reads your current glucose and planned meal carbs automatically',
      'Calculates a Meal Dose based on your carb ratio',
      'Adds a Correction Dose based on your ISF and target glucose',
      'Shows Total Dose as the sum of both',
      'If blood sugar is above 175 mg/dL, a short-acting dose is recommended',
      'Set your personal ISF, carb ratio, and target in Profile → Settings',
    ],
  },
  {
    icon: '📋',
    title: 'Meds: Log & Reminders',
    body: 'Keep track of every dose and never miss an injection.',
    bullets: [
      'Insulin Log: record Rapid-acting or Long-acting doses with time',
      'Reminders: two default reminders (morning + evening) are ready to use',
      'Tap Edit on any reminder to change label, time, type, or units',
      'Add as many custom reminders as you need',
      'Toggle reminders On/Off without deleting them',
    ],
  },
  {
    icon: '📅',
    title: 'History: Charts & Export',
    body: 'Review your readings with charts and export full reports.',
    bullets: [
      'All past readings listed with date, time, value, status, and notes',
      'Line chart shows glucose trend over your last 20 readings',
      'Donut pie chart shows the split between Low, Normal, and High',
      'Filter by date range, min/max value, or measuring unit',
      'Export a full PDF report with charts, stats, and the insulin log',
    ],
  },
  {
    icon: '🚨',
    title: 'Emergency (SOS Tab)',
    body: 'In a crisis, every second counts.',
    bullets: [
      'One-tap Call 112 button — always visible at the top',
      'Save emergency contacts (family, doctor) for quick dialling',
      'Import contacts directly from your phone\'s contact list',
      'Hospital Finder: search or use your location to find nearby hospitals',
      'Symptom guides for Hypoglycemia, Hyperglycemia, and DKA',
    ],
  },
  {
    icon: '⚙️',
    title: 'Profile & Settings',
    body: 'Personalise DiabEasy to match your treatment plan.',
    bullets: [
      'Set your name, diabetes type, diagnosis date, and doctor info',
      'Create an account to associate your profile (optional)',
      'Adjust insulin calculator defaults: ISF, carb ratio, target glucose',
      'Switch between Light, Dark, or System theme',
      'Clear all data from the Data section if you need a fresh start',
    ],
  },
];

// ─── Exact replicas from index.tsx ────────────────────────────────────────────

/** Exact copy of the unit toggle from Home tab */
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

/** Exact copy of the fasting/reading-type grid from Home tab */
function FastingGridMock({ colors }: { colors: ColorScheme }) {
  const opts = ['Fasting', 'Pre-meal', 'Post-meal', 'Random', 'Bedtime', 'Post-exercise'];
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>reading type selector</Text>
      {/* fastingGrid from index.tsx */}
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

/** Exact copy of the colour-coded result display from Home tab */
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

/** Exact copy of QuickStats from Home tab */
function StatsMock({ colors, isDark }: { colors: ColorScheme; isDark: boolean }) {
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>today's summary card</Text>
      {/* statsCard from index.tsx */}
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

/** Exact copy of the goal pill row from Food Guide */
function GoalPillsMock({ colors }: { colors: ColorScheme }) {
  // ACTION_OPTIONS colors from foodguide.tsx: lower=colors.normal, maintain=colors.high, raise=colors.red
  const options = [
    { label: 'Lower',    color: colors.normal, active: true  },
    { label: 'Maintain', color: colors.textMuted, active: false },
    { label: 'Raise',    color: colors.red,    active: false },
  ];
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>goal selector</Text>
      {/* pillRow from foodguide.tsx */}
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

/** Exact copy of the + Add button and qty controls from a food row in Food Guide */
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

/** Exact copy of a reminder card row from Medication tab */
function ReminderCardMock({ colors }: { colors: ColorScheme }) {
  return (
    <View style={[mk.previewWrap, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <Text style={[mk.previewLabel, { color: colors.textFaint }]}>reminder card</Text>
      {/* reminderCard from medication.tsx */}
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

/** Exact copy of the filter + export buttons from History tab */
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

/** Exact copy of the Call 112 button from Emergency tab */
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
  1: { // Log Blood Sugar
    0: (c)       => <UnitToggleMock  colors={c} />,
    1: (c)       => <FastingGridMock colors={c} />,
    3: (c)       => <ColorResultMock colors={c} />,
  },
  2: { // Today's Summary
    2: (c, dark) => <StatsMock       colors={c} isDark={dark} />,
  },
  3: { // Food Plan
    0: (c)       => <GoalPillsMock   colors={c} />,
    2: (c)       => <FoodRowMock     colors={c} />,
  },
  6: { // Log & Reminders
    1: (c)       => <ReminderCardMock colors={c} />,
  },
  7: { // History
    3: (c)       => <HistoryFilterMock colors={c} />,
  },
  8: { // Emergency
    0: (c)       => <Call112Mock      colors={c} />,
  },
};

// ─── Recommended insulin parameters by diabetes type ─────────────────────────

const RECOMMENDED: Record<DiabetesType, { isf: number; carbRatio: number; target: number }> = {
  'Type 1': { isf: 50, carbRatio: 10, target: 100 },
  'LADA':   { isf: 50, carbRatio: 10, target: 100 },
  'Type 2': { isf: 30, carbRatio: 15, target: 110 },
  'Other':  { isf: 40, carbRatio: 12, target: 105 },
  '':       { isf: 50, carbRatio: 10, target: 100 },
};

// ─── Param setup slide ────────────────────────────────────────────────────────

function ParamSetupSlide({
  colors, diabetesType, onConfirm,
}: {
  colors: ColorScheme;
  diabetesType: DiabetesType;
  onConfirm: (isf: number, carbRatio: number, target: number) => void;
}) {
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
      <Text style={[styles.slideTitle, { color: colors.text }]}>Set Your Calculator Parameters</Text>
      <Text style={[styles.slideBody, { color: colors.textMuted }]}>
        The insulin calculator needs three personal values from your doctor to give accurate dose recommendations.
      </Text>

      {/* Path toggle */}
      <View style={[ps.pathRow]}>
        <TouchableOpacity
          style={[ps.pathBtn, !useEstimates && { backgroundColor: colors.red, borderColor: colors.red }]}
          onPress={() => applyEstimates(false)} activeOpacity={0.8}>
          <Text style={[ps.pathBtnText, { color: !useEstimates ? '#fff' : colors.textMuted }]}>I have my values</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ps.pathBtn, useEstimates && { backgroundColor: colors.red, borderColor: colors.red }]}
          onPress={() => applyEstimates(true)} activeOpacity={0.8}>
          <Text style={[ps.pathBtnText, { color: useEstimates ? '#fff' : colors.textMuted }]}>Suggest values for me</Text>
        </TouchableOpacity>
      </View>

      {/* Disclaimer for estimates */}
      {useEstimates && (
        <View style={[ps.disclaimer, { backgroundColor: colors.highBg, borderColor: colors.high }]}>
          <Text style={[ps.disclaimerTitle, { color: colors.high }]}>⚠️ Estimates only</Text>
          <Text style={[ps.disclaimerText, { color: colors.textMuted }]}>
            These are population averages for {diabetesType || 'Type 1'} diabetes — not a prescription.
            Confirm with your doctor or diabetes educator before using the calculator for real doses.
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

      {/* Inputs */}
      <View style={[styles.bulletCard, { backgroundColor: colors.bgCard, borderColor: colors.border, gap: 12, marginTop: 12 }]}>
        {[
          { label: 'ISF  —  how much 1 unit lowers glucose (mg/dL)', value: isf,      set: setIsf,       placeholder: `e.g. ${rec.isf}` },
          { label: 'Carb ratio  —  grams of carbs per unit (g/u)',   value: carbRatio, set: setCarbRatio, placeholder: `e.g. ${rec.carbRatio}` },
          { label: 'Target glucose  (mg/dL)',                         value: target,   set: setTarget,    placeholder: `e.g. ${rec.target}` },
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
        <Text style={styles.nextBtnText}>Confirm & Get Started</Text>
      </TouchableOpacity>

      <Text style={[styles.pageCount, { color: colors.textFaint }]}>{SLIDES.length + 1} / {SLIDES.length + 1}</Text>
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const { setHasSeenOnboarding, setSettings, profile } = useGlucoseStore();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const TOTAL = SLIDES.length + 1; // info slides + param setup

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * width, animated: true });
    setPage(idx);
  };

  const finish = () => setHasSeenOnboarding(true);

  const handleParamConfirm = (isf: number, carbRatio: number, target: number) => {
    setSettings({ isf, carbRatio, targetGlucose: target, insulinParamsSet: true });
    finish();
  };

  const isParamStep = page === SLIDES.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          setPage(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      >
        {SLIDES.map((slide, i) => (
          <ScrollView
            key={i}
            style={{ width }}
            contentContainerStyle={styles.slide}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.slideIcon}>{slide.icon}</Text>
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

            <Text style={[styles.pageCount, { color: colors.textFaint }]}>{i + 1} / {TOTAL}</Text>
          </ScrollView>
        ))}

        {/* Param setup — last page, not skippable */}
        <ParamSetupSlide
          colors={colors}
          diabetesType={profile.diabetesType}
          onConfirm={handleParamConfirm}
        />
      </ScrollView>

      {/* Dots */}
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

      {/* Navigation — hidden on param step (it has its own confirm button) */}
      {!isParamStep && (
        <View style={styles.navRow}>
          {page < SLIDES.length - 1 ? (
            <>
              <TouchableOpacity onPress={finish} activeOpacity={0.7}>
                <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: colors.red }]}
                onPress={() => goTo(page + 1)}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>Next →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.red, flex: 1 }]}
              onPress={() => goTo(SLIDES.length)}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
