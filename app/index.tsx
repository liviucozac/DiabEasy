import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Modal, StyleSheet, KeyboardAvoidingView,
  Platform, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGlucoseStore } from '../store/glucoseStore';
import { useTheme } from '../context/AppContext';
import { PressBtn } from '../components/PressBtn';
import { ShadowBtn } from '../components/ShadowBtn';
import { BleGlucometerScanner } from '../components/BleGlucometerScanner';
import { GuidedFlowModal } from '../components/GuidedFlowModal';
import { TrialBanner } from '../components/TrialBanner';
import { UpgradeModal } from '../components/UpgradeModal';
import { useSubscription } from '../hooks/useSubscription';
import { useTranslation } from '../hooks/useTranslation';
import type { GlucoseReading } from '../utils/bleGlucometerService';

type Unit = 'mg/dL' | 'mmol/L';
type FastingType = 'Fasting' | 'Pre-meal' | 'Post-meal' | 'Random' | 'Bedtime' | 'Post-exercise' | '';
type ColorClass = 'low' | 'normal' | 'high';

function getColorClass(value: number, unit: Unit, lowMgdl = 70, highMgdl = 180): ColorClass {
  const low  = unit === 'mmol/L' ? lowMgdl  / 18.0182 : lowMgdl;
  const high = unit === 'mmol/L' ? highMgdl / 18.0182 : highMgdl;
  if (value < low)  return 'low';
  if (value <= high) return 'normal';
  return 'high';
}

function getInterpretation(value: number, unit: Unit, lowMgdl = 70, highMgdl = 180): string {
  const low  = unit === 'mmol/L' ? lowMgdl  / 18.0182 : lowMgdl;
  const high = unit === 'mmol/L' ? highMgdl / 18.0182 : highMgdl;
  if (value < low)  return 'Low';
  if (value <= high) return 'Normal';
  return 'High';
}

function statusIcon(interpretation: string): string {
  if (interpretation === 'Low')  return '↓';
  if (interpretation === 'High') return '↑';
  return '✓';
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

// ─── Quick Stats ──────────────────────────────────────────────────────────────

function QuickStats({ unit }: { unit: string }) {
  const { history, settings } = useGlucoseStore();
  const { colors, isDark } = useTheme();
  const t = useTranslation();

  const todayDate    = new Date().toISOString().split('T')[0];
  const todayEntries = history.filter((e) => e.timestamp.startsWith(todayDate) && e.unit === unit);

  const count   = todayEntries.length;
  const avg     = count > 0 ? (todayEntries.reduce((s, e) => s + e.value, 0) / count).toFixed(1) : null;
  const inRange = todayEntries.filter((e) => getColorClass(e.value, e.unit as Unit, settings.glucoseLow, settings.glucoseHigh) === 'normal').length;
  const highs   = todayEntries.filter((e) => getColorClass(e.value, e.unit as Unit, settings.glucoseLow, settings.glucoseHigh) === 'high').length;
  const lows    = todayEntries.filter((e) => getColorClass(e.value, e.unit as Unit, settings.glucoseLow, settings.glucoseHigh) === 'low').length;

  return (
    <View style={[styles.statsCard, {
      borderColor: colors.border, backgroundColor: colors.bgCard,
      shadowColor: isDark ? '#000' : '#6070a0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.45 : 0.13, shadowRadius: 18, elevation: 6,
    }]}>
      <Text style={[styles.statsTitle, { color: colors.textMuted }]}>{t.todaySummary}</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{count}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.readings}</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: colors.border, borderLeftWidth: 1 }]}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{avg ?? '—'}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.average}</Text>
        </View>
      </View>
      <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: inRange > 0 ? colors.normal : colors.text }]}>{inRange}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.inRange}</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: colors.border, borderLeftWidth: 1 }]}>
          <Text style={[styles.statNumber, { color: highs > 0 ? colors.high : colors.text }]}>{highs}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.highs}</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: colors.border, borderLeftWidth: 1 }]}>
          <Text style={[styles.statNumber, { color: lows > 0 ? colors.low : colors.text }]}>{lows}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.lows}</Text>
        </View>
      </View>
      {count === 0 && <Text style={[styles.statsEmpty, { color: colors.textFaint }]}>{t.noReadingsToday}</Text>}
    </View>
  );
}

// ─── Hypo Popup ───────────────────────────────────────────────────────────────

function HypoPopup({ visible, glucoseValue, unit, onClose }: {
  visible: boolean; glucoseValue: number; unit: Unit; onClose: () => void;
}) {
  const { colors } = useTheme();
  const t = useTranslation();
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
                {t.hypoValueLine} <Text style={[styles.popupValueRed, { color: colors.red }]}>{glucoseValue} {unit}</Text>
              </Text>
              <Text style={[styles.popupSection, { color: colors.text }]}>{t.hypoSection1}</Text>
              {[t.hypoTip1, t.hypoTip2, t.hypoTip3, t.hypoTip4, t.hypoTip5].map((tip, i) =>
                <Text key={i} style={[styles.popupTip, { color: colors.textMuted }]}>{tip}</Text>
              )}
              <View style={[styles.popupDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.popupSection, { color: colors.text }]}>{t.hypoSection2}</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>{t.hypoTip6}</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>{t.hypoTip7}</Text>
              <View style={[styles.popupDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.popupSection, { color: colors.text }]}>{t.hypoSection3}</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>{t.hypoTip8}</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>{t.hypoTip9}</Text>
              <PressBtn style={[styles.closeBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]} onPress={onClose}>
                <Text style={[styles.closeBtnText, { color: colors.red }]}>{t.close}</Text>
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
  const { settings } = useGlucoseStore();
  const t = useTranslation();
  const { isf, targetGlucose, insulinParamsSet } = settings;

  const glucoseMgDl = unit === 'mmol/L' ? glucoseValue * 18.0182 : glucoseValue;
  const correctionDose = insulinParamsSet
    ? Math.max(0, Math.round((glucoseMgDl - targetGlucose) / isf * 10) / 10)
    : null;

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
                {t.hyperValueLine} <Text style={{ fontWeight: 'bold', color: colors.high }}>{glucoseValue} {unit}</Text>
              </Text>

              {correctionDose !== null && correctionDose > 0 && (
                <>
                  <Text style={[styles.popupSection, { color: colors.text }]}>{t.hyperSection1}</Text>
                  <Text style={[styles.popupTip, { color: colors.textMuted }]}>
                    {t.hyperCorrectionInfo(isf, targetGlucose)}
                  </Text>
                  <Text style={[styles.popupCorrectionDose, { color: colors.high }]}>{correctionDose} {t.hyperUnits}</Text>
                  <Text style={[styles.popupTip, { color: colors.textMuted }]}>{t.hyperEstimateOnly}</Text>
                  <View style={[styles.popupDivider, { backgroundColor: colors.border }]} />
                </>
              )}

              <Text style={[styles.popupSection, { color: colors.text }]}>{t.hyperSection2}</Text>
              {[t.hyperTip1, t.hyperTip2, t.hyperTip3, t.hyperTip4].map((tip, i) =>
                <Text key={i} style={[styles.popupTip, { color: colors.textMuted }]}>{tip}</Text>
              )}
              <View style={[styles.popupDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.popupSection, { color: colors.text }]}>{t.hyperSection3}</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>{t.hyperTip5}</Text>
              <Text style={[styles.popupTip, { color: colors.textMuted }]}>{t.hyperTip6}</Text>
              <PressBtn style={[styles.closeBtn, { borderColor: colors.high, backgroundColor: 'transparent' }]} onPress={onClose}>
                <Text style={[styles.closeBtnText, { color: colors.high }]}>{t.close}</Text>
              </PressBtn>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { addEntry, setGlucoseValue: setGlobalGlucose, unit: globalUnit, setHasSeenOnboarding, settings } = useGlucoseStore();
  const { colors, isDark } = useTheme();
  const t = useTranslation();

  const [unit, setUnit]                     = useState<Unit>(globalUnit ?? 'mg/dL');
  const [inputValue, setInputValue]         = useState('');
  const [inputFocused, setInputFocused]     = useState(false);
  const [fasting, setFasting]               = useState<FastingType>('');
  const [symptoms, setSymptoms]             = useState('');
  const [glucoseValue, setGlucoseValue]     = useState<number | null>(null);
  const [showHypoPopup, setShowHypoPopup]   = useState(false);
  const [showHyperPopup, setShowHyperPopup] = useState(false);
  const [showBleScanner, setShowBleScanner] = useState(false);
  const [showCompatibleDevices, setShowCompatibleDevices] = useState(false);
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [guidedFlowType, setGuidedFlowType] = useState<'hypo' | 'hyper'>('hypo');
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { canUseBle } = useSubscription();

  const submitScale = useRef(new Animated.Value(1)).current;
  const resultScale = useRef(new Animated.Value(0)).current;

  const FASTING_OPTIONS: { label: string; value: FastingType }[] = [
    { label: t.fasting,      value: 'Fasting' },
    { label: t.preMeal,      value: 'Pre-meal' },
    { label: t.postMeal,     value: 'Post-meal' },
    { label: t.random,       value: 'Random' },
    { label: t.bedtime,      value: 'Bedtime' },
    { label: t.postExercise, value: 'Post-exercise' },
  ];

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
    const interpretation = getInterpretation(value, unit, settings.glucoseLow, settings.glucoseHigh);
    const colorClass     = getColorClass(value, unit, settings.glucoseLow, settings.glucoseHigh);
    setGlucoseValue(value);
    setGlobalGlucose(value, unit);
    addEntry({ value, unit, timestamp, interpretation, fasting, symptoms });

    resultScale.setValue(0);
    Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 7 }).start();

    if (colorClass === 'low')       setShowHypoPopup(true);
    else if (colorClass === 'high') setShowHyperPopup(true);
    setInputValue(''); setSymptoms(''); setFasting('');
  };

  const handleBleReading = (reading: GlucoseReading) => {
    const interpretation = getInterpretation(reading.value, reading.unit, settings.glucoseLow, settings.glucoseHigh);
    const colorClass     = getColorClass(reading.value, reading.unit, settings.glucoseLow, settings.glucoseHigh);
    setGlucoseValue(reading.value);
    setUnit(reading.unit);
    setGlobalGlucose(reading.value, reading.unit);
    addEntry({ value: reading.value, unit: reading.unit, timestamp: reading.timestamp, interpretation, fasting: '', symptoms: '' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resultScale.setValue(0);
    Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 7 }).start();

    if (colorClass === 'low') {
      setGuidedFlowType('hypo');
      setShowGuidedFlow(true);
    } else if (colorClass === 'high') {
      setGuidedFlowType('hyper');
      setShowGuidedFlow(true);
    }
  };

  const cls = glucoseValue !== null ? getColorClass(glucoseValue, unit, settings.glucoseLow, settings.glucoseHigh) : null;
  const resultColor =
    cls === 'low'    ? colors.low :
    cls === 'high'   ? colors.high :
    cls === 'normal' ? colors.normal : colors.text;

  const liveNum   = parseFloat(inputValue);
  const liveClass = inputValue && !isNaN(liveNum) && liveNum > 0 ? getColorClass(liveNum, unit, settings.glucoseLow, settings.glucoseHigh) : null;
  const inputBorderColor = liveClass
    ? liveClass === 'low'  ? colors.low
    : liveClass === 'high' ? colors.high
    : colors.normal
    : inputFocused ? colors.red : colors.border;

  const handleSeeHelp = () => {
    if (!glucoseValue) return;
    const colorClass = getColorClass(glucoseValue, unit, settings.glucoseLow, settings.glucoseHigh);
    if (colorClass === 'low')       setShowHypoPopup(true);
    else if (colorClass === 'high') setShowHyperPopup(true);
  };

  const interpretationLabel = (interp: string) => {
    if (interp === 'Low')    return t.low;
    if (interp === 'High')   return t.high;
    return t.normal;
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TrialBanner />

          <Text style={[styles.appDescription, { color: colors.textMuted }]}>
            {t.appDescription}
            <Text style={[styles.highlight, { color: colors.red }]}>{t.appDescriptionHighlight}</Text>
          </Text>

          <TouchableOpacity
            style={[styles.bleBtn, {
              borderColor: canUseBle ? colors.red : colors.border,
              backgroundColor: colors.bgCard,
              opacity: canUseBle ? 1 : 0.75,
            }]}
            onPress={() => canUseBle ? setShowBleScanner(true) : setShowUpgrade(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.bleBtnIcon}>{canUseBle ? '🔵' : '🔒'}</Text>
            <Text style={[styles.bleBtnText, { color: canUseBle ? colors.red : colors.textMuted }]}>
              {canUseBle ? t.connectGlucometer : t.connectGlucometerPremium}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowCompatibleDevices(true)} activeOpacity={0.7} style={styles.compatLink}>
            <Text style={[styles.compatLinkText, { color: colors.textMuted }]}>{t.compatibleDevices}</Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: isDark ? '#7a1c1a' : '#f2c0c0' }]} />

          <Text style={[styles.instruction, { color: colors.textMuted }]}>
            {t.orEnterManually}
          </Text>

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
            placeholder={t.enterGlycemiaPlaceholder}
            placeholderTextColor={colors.placeholder}
            value={inputValue}
            onChangeText={setInputValue}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            returnKeyType="done"
            accessibilityLabel="Blood glucose value"
            accessibilityHint={`Enter your reading in ${unit}`}
          />

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

          <Text style={[styles.symptomsLabel, { color: colors.text }]}>{t.notesIfAny}</Text>
          <TextInput
            style={[styles.symptomsInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
            placeholder={t.notesPlaceholder}
            placeholderTextColor={colors.placeholder}
            value={symptoms}
            onChangeText={setSymptoms}
            maxLength={30}
            returnKeyType="done"
            multiline
            accessibilityLabel="Notes"
            accessibilityHint="Optional notes such as symptoms or insulin taken"
          />

          <ShadowBtn
            label={t.submit}
            onPress={handleSubmit}
            style={[styles.submitBtn, { backgroundColor: colors.red }]}
            textStyle={styles.submitBtnText}
            accessibilityLabel={t.submit}
          />

          {glucoseValue !== null && (
            <Animated.View style={[styles.resultContainer, { transform: [{ scale: resultScale }] }]}>
              <Text style={[styles.resultValue, { color: resultColor }]}>{glucoseValue} {unit}</Text>
              <Text style={[styles.resultInterpretation, { color: resultColor }]}>
                {statusIcon(getInterpretation(glucoseValue, unit))} {interpretationLabel(getInterpretation(glucoseValue, unit))}
              </Text>
              {cls !== 'normal' && (
                <PressBtn
                  style={[styles.seeHelpBtn, {
                    borderColor: colors.red, backgroundColor: colors.bg,
                    shadowColor: colors.red, shadowOffset: { width: 2, height: 2 },
                    shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
                  }]}
                  onPress={handleSeeHelp}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.seeHelpBtnText, { color: colors.red }]}>{t.seeHelp}</Text>
                </PressBtn>
              )}
            </Animated.View>
          )}

          <QuickStats unit={unit} />

          <View style={[styles.tipCard, {
            borderColor: colors.border, backgroundColor: colors.bgCard,
            shadowColor: isDark ? '#000' : '#6070a0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.45 : 0.13, shadowRadius: 18, elevation: 6,
          }]}>
            <Text style={[styles.tipTitle, { color: colors.textMuted }]}>{t.quickTip}</Text>
            <Text style={[styles.tipText, { color: colors.textMuted }]}>
              {glucoseValue === null
                ? t.tipDefault
                : getColorClass(glucoseValue, unit) === 'low'
                ? t.tipLow
                : getColorClass(glucoseValue, unit) === 'high'
                ? t.tipHigh
                : t.tipNormal}
            </Text>
          </View>

          <PressBtn
            style={[styles.howToBtn, { borderColor: colors.red, backgroundColor: colors.bgCard }]}
            onPress={() => setHasSeenOnboarding(false)}
            activeOpacity={0.75}
          >
            <Text style={[styles.howToBtnText, { color: colors.red }]}>{t.howToUseApp}</Text>
          </PressBtn>
        </ScrollView>
      </KeyboardAvoidingView>

      <HypoPopup  visible={showHypoPopup}  glucoseValue={glucoseValue!} unit={unit} onClose={() => setShowHypoPopup(false)} />
      <HyperPopup visible={showHyperPopup} glucoseValue={glucoseValue!} unit={unit} onClose={() => setShowHyperPopup(false)} />

      <GuidedFlowModal
        visible={showGuidedFlow}
        glucoseValue={glucoseValue ?? 0}
        unit={unit}
        flowType={guidedFlowType}
        onClose={() => setShowGuidedFlow(false)}
      />

      <BleGlucometerScanner visible={showBleScanner} onClose={() => setShowBleScanner(false)} onReading={handleBleReading} />

      <Modal visible={showCompatibleDevices} transparent animationType="slide" onRequestClose={() => setShowCompatibleDevices(false)}>
        <View style={[styles.overlayBg, { backgroundColor: colors.overlay }]}>
          <View style={[styles.compatSheet, { backgroundColor: colors.bg }]}>
            <Text style={[styles.compatTitle, { color: colors.text }]}>{t.compatibleDevicesTitle}</Text>
            <Text style={[styles.compatSubtitle, { color: colors.textMuted }]}>
              {t.compatibleDevicesSubtitle}
            </Text>
            {[
              { brand: 'Accu-Chek',  models: 'Instant · Guide · Active' },
              { brand: 'Contour',    models: 'Next One · Plus One' },
              { brand: 'OneTouch',   models: 'Verio Flex · Verio Reflect' },
              { brand: 'Beurer',     models: 'GL50 evo' },
            ].map(({ brand, models }) => (
              <View key={brand} style={[styles.compatRow, { borderBottomColor: colors.borderLight }]}>
                <View style={[styles.compatDot, { backgroundColor: colors.normal }]} />
                <View>
                  <Text style={[styles.compatBrand, { color: colors.text }]}>{brand}</Text>
                  <Text style={[styles.compatModels, { color: colors.textMuted }]}>{models}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.compatBtn, { backgroundColor: colors.red }]}
              onPress={() => setShowCompatibleDevices(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.compatBtnText}>{t.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />

    </View>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1 },
  container: { alignItems: 'center', padding: 16, paddingBottom: 28 },
  appDescription: { textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  highlight:      { fontWeight: '600' },
  instruction:    { textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 6, color: '#aaa' },

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
  popupTip:           { fontSize: 13, lineHeight: 19, marginBottom: 2 },
  popupCorrectionDose:{ fontSize: 28, fontWeight: '800', textAlign: 'center', marginVertical: 8 },
  popupDivider:   { height: 1, marginVertical: 10 },
  closeBtn:       { marginTop: 16, alignSelf: 'center', borderWidth: 2, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 5 },
  closeBtnText:   { fontSize: 15, fontWeight: 'bold', backgroundColor: 'transparent' },
  tipCard:        { width: '100%', borderRadius: 14, borderWidth: 1, padding: 8, marginTop: 10, marginBottom: 15 },
  tipTitle:       { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  tipText:        { fontSize: 14, lineHeight: 20 },
  outlineBtnShadow: { shadowColor: '#000', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  howToBtn:     { width: '100%', borderWidth: 1.5, borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  howToBtnText: { fontSize: 14, fontWeight: '600' },
  bleBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 14, width: '85%', justifyContent: 'center' },
  bleBtnIcon:   { fontSize: 18 },
  bleBtnText:      { fontSize: 15, fontWeight: '700' },
  compatLink:      { marginBottom: 14 },
  compatLinkText:  { fontSize: 12, textDecorationLine: 'underline' },
  compatSheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
  compatTitle:     { fontSize: 18, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  compatSubtitle:  { fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 20 },
  compatRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  compatDot:       { width: 10, height: 10, borderRadius: 5 },
  compatBrand:     { fontSize: 14, fontWeight: '700' },
  compatModels:    { fontSize: 12, marginTop: 2 },
  compatBtn:       { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  compatBtnText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
  divider:         { height: 1, width: '75%', marginBottom: 14 },
});
