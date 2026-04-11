import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Modal, StyleSheet, KeyboardAvoidingView,
  Platform, Alert, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGlucoseStore } from '../store/glucoseStore';
import type { GlucoseEntry } from '../store/glucoseStore';
import { useTheme } from '../context/AppContext';
import { PressBtn } from '../components/PressBtn';
import { Shadow } from 'react-native-shadow-2';
import { ShadowBtn } from '../components/ShadowBtn';


type Unit = 'mg/dL' | 'mmol/L';
type FastingType = 'Fasting' | 'Pre-meal' | 'Post-meal' | 'Random' | 'Bedtime' | 'Post-exercise' | '';
type ColorClass = 'low' | 'normal' | 'high';

function getColorClass(value: number, unit: Unit): ColorClass {
  if (unit === 'mg/dL') {
    if (value < 75)   return 'low';
    if (value <= 150) return 'normal';
    return 'high';
  } else {
    if (value < 4.2)  return 'low';
    if (value <= 8.3) return 'normal';
    return 'high';
  }
}

function getInterpretation(value: number, unit: Unit): string {
  if (unit === 'mg/dL') {
    if (value < 75)   return 'Low';
    if (value <= 150) return 'Normal';
    return 'High';
  } else {
    if (value < 4.2)  return 'Low';
    if (value <= 8.3) return 'Normal';
    return 'High';
  }
}

function formatTimestamp(): string {
  const now  = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dd}/${mm}/${yyyy} ${time}`;
}

// ─── Quick Stats ──────────────────────────────────────────────────────────────

function QuickStats({ unit }: { unit: string }) {
  const { history } = useGlucoseStore();
  const { colors, isDark }  = useTheme();

  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const todayPrefix  = `${dd}/${mm}/${now.getFullYear()}`;
  const todayEntries = history.filter((e) => e.timestamp.startsWith(todayPrefix) && e.unit === unit);

  const count   = todayEntries.length;
  const avg     = count > 0 ? (todayEntries.reduce((s, e) => s + e.value, 0) / count).toFixed(1) : null;
  const inRange = todayEntries.filter((e) => getColorClass(e.value, e.unit as Unit) === 'normal').length;
  const highs   = todayEntries.filter((e) => getColorClass(e.value, e.unit as Unit) === 'high').length;
  const lows    = todayEntries.filter((e) => getColorClass(e.value, e.unit as Unit) === 'low').length;

  return (
    <View style={[styles.statsCard, {
      borderColor: colors.border, backgroundColor: colors.bgCard,
      shadowColor: isDark ? '#000' : '#6070a0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.45 : 0.13, shadowRadius: 18, elevation: 6,
    }]}>
      <Text style={[styles.statsTitle, { color: colors.textMuted }]}>Today's Summary</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{count}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Readings</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: colors.border, borderLeftWidth: 1 }]}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{avg ?? '—'}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Average</Text>
        </View>
      </View>
      <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: inRange > 0 ? colors.normal : colors.text }]}>{inRange}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>In Range</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: colors.border, borderLeftWidth: 1 }]}>
          <Text style={[styles.statNumber, { color: highs > 0 ? colors.high : colors.text }]}>{highs}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Highs</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: colors.border, borderLeftWidth: 1 }]}>
          <Text style={[styles.statNumber, { color: lows > 0 ? colors.low : colors.text }]}>{lows}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Lows</Text>
        </View>
      </View>
      {count === 0 && <Text style={[styles.statsEmpty, { color: colors.textFaint }]}>No readings logged today yet.</Text>}
    </View>
  );
}

// ─── Hypo Popup ───────────────────────────────────────────────────────────────

function HypoPopup({ visible, glucoseValue, unit, onClose }: {
  visible: boolean; glucoseValue: number; unit: Unit; onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlayBg, { backgroundColor: colors.overlay }]}>
        <View style={{ width: '100%', maxHeight: '80%' }}>
          <ScrollView contentContainerStyle={styles.popupScroll}>
            <View style={[styles.popupCard, {
              backgroundColor: colors.bg, borderColor: colors.red,
              shadowColor: colors.red, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 16,
            }]}>
              <Text style={[styles.popupValueLine, { color: colors.text }]}>
                Your glycemia is low: <Text style={[styles.popupValueRed, { color: colors.red }]}>{glucoseValue} {unit}</Text>
              </Text>
              <Text style={[styles.popupSection, { color: colors.text }]}>Quick Fixes for Low Blood Sugar</Text>
              {['Eat 3–4 glucose tablets (the fastest solution)',
                'Drink a small glass of juice (orange or apple works best)',
                'Have a spoonful of honey (just swallow it straight)',
                'Munch on a few candies (about 6–7 gummies or hard sweets)',
                'Try a handful of raisins (if you prefer something natural)',
              ].map((t, i) => <Text key={i} style={[styles.popupTip, { color: colors.textMuted }]}>{t}</Text>)}
              <View style={[styles.popupDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.popupSection, { color: colors.text }]}>After the First Boost</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>Wait 15 minutes, then check again – if still low, repeat.</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>Eat something small like a cracker with cheese or yogurt.</Text>
              <View style={[styles.popupDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.popupSection, { color: colors.text }]}>Smart Habits</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>Always keep glucose tabs or candy in your bag.</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>Tell someone nearby if you're feeling shaky.</Text>
              <PressBtn
                style={[styles.closeBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]}
                onPress={onClose}
              >
                <Text style={[styles.closeBtnText, { color: colors.red }]}>Close</Text>
              </PressBtn>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Hyper Popup ──────────────────────────────────────────────────────────────

function HyperPopup({ visible, glucoseValue, unit, onClose }: {
  visible: boolean; glucoseValue: number; unit: Unit; onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlayBg, { backgroundColor: colors.overlay }]}>
        <View style={{ width: '100%', maxHeight: '80%' }}>
          <ScrollView contentContainerStyle={styles.popupScroll}>
            <View style={[styles.popupCard, {
              backgroundColor: colors.bg, borderColor: colors.red,
              shadowColor: colors.high, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 16,
            }]}>
              <Text style={[styles.popupValueLine, { color: colors.text }]}>
                Your glycemia is high: <Text style={{ fontWeight: 'bold', color: colors.high }}>{glucoseValue} {unit}</Text>
              </Text>
              <Text style={[styles.popupSection, { color: colors.text }]}>What to Do When Blood Sugar Is High</Text>
              {['Drink plenty of water – helps flush out excess sugar.',
                'Take a short walk – gentle movement helps lower levels.',
                'Check for ketones if over 13.9 mmol/L (250 mg/dL).',
                'Use correction doses if prescribed.',
                'Never double-dose without medical advice.',
              ].map((t, i) => <Text key={i} style={[styles.popupTip, { color: colors.textMuted }]}>{t}</Text>)}
              <View style={[styles.popupDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.popupSection, { color: colors.text }]}>When to Seek Help</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>If over 16.7 mmol/L (300 mg/dL) for several hours.</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>Nausea, vomiting, or confusion – possible DKA.</Text>
              <PressBtn
                style={[styles.closeBtn, { borderColor: colors.high, backgroundColor: 'transparent' }]}
                onPress={onClose}
              >
                <Text style={[styles.closeBtnText, { color: colors.high }]}>Close</Text>
              </PressBtn>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const FASTING_OPTIONS: { label: string; value: FastingType }[] = [
  { label: 'Fasting',       value: 'Fasting' },
  { label: 'Pre-meal',      value: 'Pre-meal' },
  { label: 'Post-meal',     value: 'Post-meal' },
  { label: 'Random',        value: 'Random' },
  { label: 'Bedtime',       value: 'Bedtime' },
  { label: 'Post-exercise', value: 'Post-exercise' },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { addEntry, setGlucoseValue: setGlobalGlucose, glucoseValue: globalGlucoseValue, unit: globalUnit, setHasSeenOnboarding } = useGlucoseStore();
  const { colors, isDark } = useTheme();

  const [unit, setUnit]                     = useState<Unit>(globalUnit ?? 'mg/dL');
  const [inputValue, setInputValue]         = useState('');
  const [inputFocused, setInputFocused]     = useState(false);
  const [fasting, setFasting]               = useState<FastingType>('');
  const [symptoms, setSymptoms]             = useState('');
  const [glucoseValue, setGlucoseValue]     = useState<number | null>(globalGlucoseValue ?? null);
  const [showHypoPopup, setShowHypoPopup]   = useState(false);
  const [showHyperPopup, setShowHyperPopup] = useState(false);

  const submitScale = useRef(new Animated.Value(1)).current;
  const resultScale = useRef(new Animated.Value(0)).current;

  const handleSubmit = () => {
    const raw = inputValue.trim();
    if (!raw) return;
    const value = parseFloat(raw);
    if (isNaN(value) || value <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.spring(submitScale, { toValue: 0.92, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.spring(submitScale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 8  }),
    ]).start();

    const timestamp      = formatTimestamp();
    const interpretation = getInterpretation(value, unit);
    const colorClass     = getColorClass(value, unit);
    setGlucoseValue(value);
    setGlobalGlucose(value, unit);
    addEntry({ value, unit, timestamp, interpretation, fasting, symptoms });

    resultScale.setValue(0);
    Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 7 }).start();

    if (colorClass === 'low')       setShowHypoPopup(true);
    else if (colorClass === 'high') setShowHyperPopup(true);
    setInputValue(''); setSymptoms(''); setFasting('');
  };

  const cls = glucoseValue !== null ? getColorClass(glucoseValue, unit) : null;
  const resultColor =
    cls === 'low'    ? colors.low :
    cls === 'high'   ? colors.high :
    cls === 'normal' ? colors.normal : colors.text;

  const liveNum   = parseFloat(inputValue);
  const liveClass = inputValue && !isNaN(liveNum) && liveNum > 0 ? getColorClass(liveNum, unit) : null;
  const inputBorderColor = liveClass
    ? liveClass === 'low'  ? colors.low
    : liveClass === 'high' ? colors.high
    : colors.normal
    : inputFocused ? colors.red : colors.border;

  const handleSeeHelp = () => {
    if (!glucoseValue) return;
    const colorClass = getColorClass(glucoseValue, unit);
    if (colorClass === 'low')       setShowHypoPopup(true);
    else if (colorClass === 'high') setShowHyperPopup(true);
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.appDescription, { color: colors.textMuted }]}>
            Your simple and helpful companion for{'\n'}tracking{' '}
            <Text style={[styles.highlight, { color: colors.red }]}>type 1 diabetes</Text>
          </Text>

          <Text style={[styles.instruction, { color: colors.textMuted }]}>
            Please select a measuring type, then enter{'\n'}the value.
          </Text>

          {/* Unit toggle */}
          <View style={styles.unitToggleRow}>
            <TouchableOpacity onPress={() => setUnit('mg/dL')} activeOpacity={0.8}>
              <Text style={[styles.unitLabel, { color: unit === 'mg/dL' ? colors.red : colors.textMuted }]}>mg/dL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sliderTrack, { backgroundColor: colors.border }]}
              onPress={() => setUnit(unit === 'mg/dL' ? 'mmol/L' : 'mg/dL')}
              activeOpacity={0.8}
            >
              <View style={[styles.sliderKnob, { backgroundColor: colors.text }, unit === 'mmol/L' && styles.sliderKnobRight]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setUnit('mmol/L')} activeOpacity={0.8}>
              <Text style={[styles.unitLabel, { color: unit === 'mmol/L' ? colors.red : colors.textMuted }]}>mmol/L</Text>
            </TouchableOpacity>
          </View>

          {/* Input */}
          <TextInput
            style={[styles.glycemiaInput, {
              borderColor: inputBorderColor,
              color: liveClass === 'low' ? colors.low : liveClass === 'high' ? colors.high : liveClass === 'normal' ? colors.normal : colors.text,
              backgroundColor: colors.inputBg,
              shadowColor: inputFocused ? colors.red : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: inputFocused ? 0.15 : 0.05,
              shadowRadius: 6,
              elevation: inputFocused ? 4 : 1,
            }]}
            keyboardType="decimal-pad"
            placeholder="Enter glycemia value"
            placeholderTextColor={colors.placeholder}
            value={inputValue}
            onChangeText={setInputValue}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            returnKeyType="done"
          />

          {/* Fasting options */}
          <View style={styles.fastingGrid}>
            {FASTING_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.fastingRow, {
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.red,
                  borderWidth: fasting === opt.value ? 1 : 0,
                  shadowColor: fasting === opt.value ? colors.red : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: fasting === opt.value ? 0.18 : 0.06,
                  shadowRadius: fasting === opt.value ? 6 : 3,
                  elevation: fasting === opt.value ? 4 : 2,
                }]}
                onPress={() => setFasting(fasting === opt.value ? '' : opt.value)}
                activeOpacity={0.75}
              >
                <View style={[styles.radio, {
                  borderColor: fasting === opt.value ? colors.red : colors.border,
                  backgroundColor: fasting === opt.value ? colors.red : colors.inputBg,
                }]} />
                <Text style={[styles.fastingText, { color: colors.text }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={[styles.symptomsLabel, { color: colors.text }]}>Notes, if any:</Text>
          <TextInput
            style={[styles.symptomsInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
            placeholder="e.g. dizziness, insulin intake"
            placeholderTextColor={colors.placeholder}
            value={symptoms}
            onChangeText={setSymptoms}
            maxLength={30}
            returnKeyType="done"
            multiline
          />

          {/* Submit — with bounce animation + red shadow */}
          <ShadowBtn
            label="Submit"
            onPress={handleSubmit}
            style={[styles.submitBtn, { backgroundColor: colors.red }]}
            textStyle={styles.submitBtnText}
          />

          {/* Result — with pop-in spring */}
          {glucoseValue !== null && (
            <Animated.View style={[styles.resultContainer, { transform: [{ scale: resultScale }] }]}>
              <Text style={[styles.resultValue, { color: resultColor }]}>{glucoseValue} {unit}</Text>
              <Text style={[styles.resultInterpretation, { color: resultColor }]}>
                {getInterpretation(glucoseValue, unit)}
              </Text>
              {cls !== 'normal' && (
                <PressBtn
                  style={[styles.seeHelpBtn, {
                    borderColor: colors.red,
                    backgroundColor: colors.bg,
                    shadowColor: colors.red,
                    shadowOffset: { width: 2, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                    elevation: 3,
                  }]}
                  onPress={handleSeeHelp}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.seeHelpBtnText, { color: colors.red }]}>See Help</Text>
                </PressBtn>
              )}
            </Animated.View>
          )}

          <QuickStats unit={unit} />

          {/* Tip card */}
          <View style={[styles.tipCard, {
            borderColor: colors.border, backgroundColor: colors.bgCard,
            shadowColor: isDark ? '#000' : '#6070a0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.45 : 0.13, shadowRadius: 18, elevation: 6,
          }]}>
            <Text style={[styles.tipTitle, { color: colors.textMuted }]}>💡 Quick Tip</Text>
            <Text style={[styles.tipText, { color: colors.textMuted }]}>
              {glucoseValue === null
                ? 'Enter your blood sugar reading above to get personalized tips and track your levels throughout the day.'
                : getColorClass(glucoseValue, unit) === 'low'
                ? 'Your blood sugar is low. Eat 15-20g of fast-acting carbs like juice or glucose tablets. Recheck in 15 minutes.'
                : getColorClass(glucoseValue, unit) === 'high'
                ? 'Your blood sugar is high. Drink water, avoid sugary foods, and consider light movement if safe. Recheck in 2 hours.'
                : 'Your blood sugar is in range. Keep up the good work! Stay hydrated and maintain your current routine.'}
            </Text>
          </View>

          <PressBtn
            style={[styles.howToBtn, { borderColor: colors.red, backgroundColor: colors.bgCard }]}
            onPress={() => setHasSeenOnboarding(false)}
            activeOpacity={0.75}
          >
            <Text style={[styles.howToBtnText, { color: colors.red }]}>📖 How to use the app</Text>
          </PressBtn>
        </ScrollView>
      </KeyboardAvoidingView>

      <HypoPopup  visible={showHypoPopup}  glucoseValue={glucoseValue ?? 0} unit={unit} onClose={() => setShowHypoPopup(false)} />
      <HyperPopup visible={showHyperPopup} glucoseValue={glucoseValue ?? 0} unit={unit} onClose={() => setShowHyperPopup(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1 },
  container: { alignItems: 'center', padding: 16, paddingBottom: 32 },
  appDescription: { textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 2 },
  highlight:      { fontWeight: '600' },
  instruction:    { textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  unitToggleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 },
  unitLabel:      { fontSize: 15, fontWeight: 'bold', paddingHorizontal: 4 },
  sliderTrack:    { width: 36, height: 16, borderRadius: 10, justifyContent: 'center', position: 'relative' },
  sliderKnob:     { width: 14, height: 14, borderRadius: 7, position: 'absolute', left: 1 },
  sliderKnobRight:{ left: 21 },
  glycemiaInput:  { width: '55%', borderWidth: 2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, fontSize: 15, textAlign: 'center', marginBottom: 10 },
  fastingGrid:    { flexDirection: 'row', flexWrap: 'wrap', width: '85%', gap: 8, marginBottom: 8, justifyContent: 'center' },
  fastingRow:     { flexDirection: 'row', alignItems: 'center', borderRadius: 8, width: '46%', height: 32, paddingLeft: 10 },
  radio:          { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginRight: 8 },
  fastingText:    { fontSize: 14 },
  symptomsLabel:  { fontSize: 14, marginBottom: 4, alignSelf: 'center' },
  symptomsInput:  { width: '55%', height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingTop: 8, fontSize: 13, marginBottom: 10, textAlign: 'center', textAlignVertical: 'top' },
  submitBtn:      { paddingHorizontal: 36, paddingVertical: 10, borderRadius: 10, marginBottom: 8 },
  submitBtnText:  { fontSize: 15, color: '#fff', fontWeight: 'bold', backgroundColor: 'transparent' },
  resultContainer:{ alignItems: 'center', marginBottom: 10 },
  resultValue:    { fontSize: 17, fontWeight: 'bold', marginBottom: 2 },
  resultInterpretation: { fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  seeHelpBtn:     { borderWidth: 2, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 5 },
  seeHelpBtnText: { fontSize: 14, fontWeight: 'bold', backgroundColor: 'transparent' },
  statsCard:      { width: '100%', borderRadius: 14, borderWidth: 1, padding: 8, marginTop: 4 },
  statsTitle:     { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', marginBottom: 6 },
  statsRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  statsDivider:   { height: 1, marginVertical: 6 },
  statItem:       { flex: 1, alignItems: 'center' },
  statNumber:     { fontSize: 16, fontWeight: '800', marginBottom: 1 },
  statLabel:      { fontSize: 9, fontWeight: '500' },
  statsEmpty:     { textAlign: 'center', fontSize: 10, marginTop: 4 },
  overlayBg:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  popupScroll:    { width: '100%', flexGrow: 0 },
  popupCard:      { borderRadius: 16, borderWidth: 2, padding: 20, width: '100%', maxWidth: 400 },
  popupValueLine: { fontSize: 14, marginBottom: 8 },
  popupValueRed:  { fontWeight: 'bold' },
  popupSection:   { fontSize: 14, fontWeight: 'bold', marginBottom: 4, marginTop: 4 },
  popupTip:       { fontSize: 13, lineHeight: 19, marginBottom: 2 },
  popupDivider:   { height: 1, marginVertical: 10 },
  closeBtn:       { marginTop: 16, alignSelf: 'center', borderWidth: 2, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 5 },
  closeBtnText:   { fontSize: 15, fontWeight: 'bold', backgroundColor: 'transparent' },
  tipCard:        { width: '100%', borderRadius: 14, borderWidth: 1, padding: 8, marginTop: 10, marginBottom: 15 },
  tipTitle:       { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  tipText:        { fontSize: 14, lineHeight: 20 },

  outlineBtnShadow: { shadowColor: '#000', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },

  howToBtn:     { width: '100%', borderWidth: 1.5, borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  howToBtnText: { fontSize: 14, fontWeight: '600' },
});