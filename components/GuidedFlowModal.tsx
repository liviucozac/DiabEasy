import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, StyleSheet, Linking, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/AppContext';
import { useGlucoseStore } from '../store/glucoseStore';
import { calcCorrectionDose, calculateIOB } from '../utils/insulinUtils';
import { useTranslation } from '../hooks/useTranslation';

const RAISE_FOODS: Record<string, { name: string; carbs: number; gi: number; kcal: number }[]> = {
  '⚡ Fastest Acting': [
    { name: 'Glucose tablets (4 tabs)',  carbs: 16, gi: 100, kcal: 64  },
    { name: 'Gatorade (250ml)',          carbs: 14, gi: 78,  kcal: 56  },
    { name: 'Gummy Bears (30g)',         carbs: 24, gi: 78,  kcal: 104 },
    { name: 'Honey (1 tbsp)',            carbs: 17, gi: 58,  kcal: 64  },
  ],
  '🥤 Drinks': [
    { name: 'Orange Juice (200ml)',      carbs: 22, gi: 50,  kcal: 85  },
    { name: 'Apple Juice (200ml)',       carbs: 24, gi: 44,  kcal: 96  },
    { name: 'Grape Juice (200ml)',       carbs: 36, gi: 55,  kcal: 150 },
    { name: 'Lemonade (250ml)',          carbs: 27, gi: 54,  kcal: 110 },
    { name: 'Chocolate Milk (200ml)',    carbs: 26, gi: 45,  kcal: 180 },
  ],
  '🍌 Fruits': [
    { name: 'Banana (1 medium)',         carbs: 27, gi: 51,  kcal: 105 },
    { name: 'Dates (30g, ~3 dates)',     carbs: 22, gi: 42,  kcal: 83  },
    { name: 'Grapes (100g)',             carbs: 17, gi: 53,  kcal: 69  },
    { name: 'Watermelon (150g)',         carbs: 11, gi: 72,  kcal: 46  },
  ],
  '🍞 Snacks & Carbs': [
    { name: 'White Bread (1 slice)',     carbs: 15, gi: 75,  kcal: 80  },
    { name: 'Rice Cakes (2 cakes)',      carbs: 28, gi: 82,  kcal: 120 },
    { name: 'Granola Bar (1 bar)',       carbs: 20, gi: 66,  kcal: 140 },
    { name: 'Cornflakes (30g)',          carbs: 26, gi: 81,  kcal: 110 },
  ],
};

interface Props {
  visible:      boolean;
  glucoseValue: number;
  unit:         'mg/dL' | 'mmol/L';
  flowType:     'hypo' | 'hyper';
  onClose:      () => void;
}

function toMgDl(value: number, unit: string): number {
  return unit === 'mmol/L' ? value * 18.0182 : value;
}

// ── Hypo Slide ────────────────────────────────────────────────────────────────

function HypoSlide1({ glucoseValue, unit, colors }: { glucoseValue: number; unit: string; colors: any }) {
  const t = useTranslation();
  const [expandedGroup, setExpandedGroup] = useState<string | null>('⚡ Fastest Acting');

  return (
    <ScrollView showsVerticalScrollIndicator={true} persistentScrollbar={true} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[styles.valueBanner, { backgroundColor: colors.lowBg, borderColor: colors.low }]}>
        <Text style={[styles.valueBannerLabel, { color: colors.low }]}>{t.currentReading}</Text>
        <Text style={[styles.valueBannerValue, { color: colors.low }]}>{glucoseValue} {unit}</Text>
      </View>

      <View style={[styles.explanationCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={[styles.explanationTitle, { color: colors.text }]}>{t.glycemiaTooLow}</Text>
        <Text style={[styles.explanationBody, { color: colors.textMuted }]}>{t.eatFastSugar}</Text>
        <View style={[styles.tipRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.tipBullet, { color: colors.low }]}>💡</Text>
          <Text style={[styles.tipText, { color: colors.textMuted }]}>{t.doNotTakeInsulin}</Text>
        </View>
      </View>

      <Text style={[styles.foodListTitle, { color: colors.text }]}>{t.whatToEatNow}</Text>

      {Object.entries(RAISE_FOODS).map(([groupName, items]) => {
        const isOpen = expandedGroup === groupName;
        const groupLabel = t.raiseFoodCategories[groupName] ?? groupName;
        return (
          <View key={groupName} style={[styles.foodGroup, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.foodGroupHeader}
              onPress={() => setExpandedGroup(isOpen ? null : groupName)}
              activeOpacity={0.8}
            >
              <Text style={[styles.foodGroupTitle, { color: colors.text }]}>{groupLabel}</Text>
              <Text style={[styles.foodGroupChevron, { color: colors.textMuted }]}>{isOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {isOpen && items.map((item, idx) => (
              <View key={item.name} style={[styles.foodRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.foodName, { color: colors.text }]}>{t.foodNames[item.name] ?? item.name}</Text>
                  <Text style={[styles.foodMacros, { color: colors.textMuted }]}>{item.carbs}g {t.carbs} · GI {item.gi} · {item.kcal} kcal</Text>
                </View>
                <View style={[styles.carbsBadge, { backgroundColor: colors.lowBg, borderColor: colors.low }]}>
                  <Text style={[styles.carbsBadgeText, { color: colors.low }]}>{item.carbs}g</Text>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Hyper Slide ───────────────────────────────────────────────────────────────

function HyperSlide1({ glucoseValue, unit, colors }: { glucoseValue: number; unit: string; colors: any }) {
  const t = useTranslation();
  const { settings, insulinEntries } = useGlucoseStore();
  const mgDl          = toMgDl(glucoseValue, unit);
  const correctionRaw = calcCorrectionDose(mgDl, settings.targetGlucose, settings.isf);
  const iob           = calculateIOB(insulinEntries, settings.insulinAnalogType, settings.dia);
  const netDose       = Math.round(Math.max(0, correctionRaw - iob));
  const hasParams     = settings.insulinParamsSet;

  return (
    <ScrollView showsVerticalScrollIndicator={true} persistentScrollbar={true} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[styles.valueBanner, { backgroundColor: colors.highBg, borderColor: colors.high }]}>
        <Text style={[styles.valueBannerLabel, { color: colors.high }]}>{t.currentReading}</Text>
        <Text style={[styles.valueBannerValue, { color: colors.high }]}>{glucoseValue} {unit}</Text>
      </View>

      <View style={[styles.explanationCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={[styles.explanationTitle, { color: colors.text }]}>{t.glycemiaTooHigh}</Text>

        {!hasParams ? (
          <Text style={[styles.explanationBody, { color: colors.textMuted }]}>{t.setParamsForDose}</Text>
        ) : netDose === 0 ? (
          <Text style={[styles.explanationBody, { color: colors.textMuted }]}>{t.noInsulinNeededRecheck}</Text>
        ) : (
          <>
            <Text style={[styles.doseText, { color: colors.high }]}>
              {t.considerShots(netDose)}
            </Text>
            <Text style={[styles.doseDisclaimer, { color: colors.textFaint }]}>
              {t.estimateOnlyConfirm}
            </Text>
          </>
        )}

        <View style={[styles.tipRow, { borderTopColor: colors.border, marginTop: 8 }]}>
          <Text style={[styles.tipBullet, { color: colors.high }]}>💡</Text>
          <Text style={[styles.tipText, { color: colors.textMuted }]}>{t.drinkWaterAvoidEating}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Emergency Slide ───────────────────────────────────────────────────────────

function EmergencySlide({ flowType, glucoseValue, unit, onClose, colors }: {
  flowType: 'hypo' | 'hyper'; glucoseValue: number; unit: string; onClose: () => void; colors: any;
}) {
  const t = useTranslation();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const isHypo = flowType === 'hypo';
  const signs  = isHypo ? t.hypoSigns : t.hyperSigns;

  return (
    <ScrollView showsVerticalScrollIndicator={true} persistentScrollbar={true} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[styles.valueBanner, {
        backgroundColor: isHypo ? colors.lowBg : colors.highBg,
        borderColor:     isHypo ? colors.low   : colors.high,
      }]}>
        <Text style={[styles.valueBannerLabel, { color: isHypo ? colors.low : colors.high }]}>{t.currentReading}</Text>
        <Text style={[styles.valueBannerValue, { color: isHypo ? colors.low : colors.high }]}>{glucoseValue} {unit}</Text>
      </View>

      <View style={[styles.explanationCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={[styles.explanationTitle, { color: colors.text }]}>{t.emergencyServicesQuestion}</Text>
        <Text style={[styles.explanationBody, { color: colors.textMuted }]}>
          {isHypo ? t.hypoEmergencyBody : t.hyperEmergencyBody}
        </Text>
        {signs.map((sign, i) => (
          <View key={i} style={[styles.tipRow, i === 0 && { borderTopWidth: 0 }, { borderTopColor: colors.border }]}>
            <Text style={[styles.tipBullet, { color: colors.red }]}>•</Text>
            <Text style={[styles.tipText, { color: colors.textMuted }]}>{sign}</Text>
          </View>
        ))}
      </View>

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.callBtn, { backgroundColor: colors.red }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); Linking.openURL('tel:112'); }}
          activeOpacity={0.85}
        >
          <Text style={styles.callBtnIcon}>📞</Text>
          <Text style={styles.callBtnText}>{t.callEmergencyServices}</Text>
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity style={[styles.fineBtn, { borderColor: colors.border }]} onPress={onClose} activeOpacity={0.75}>
        <Text style={[styles.fineBtnText, { color: colors.textMuted }]}>{t.imManaging}</Text>
      </TouchableOpacity>

      <Text style={[styles.emergencyNote, { color: colors.textFaint }]}>
        {t.neverIgnoreSigns}
      </Text>
    </ScrollView>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

export function GuidedFlowModal({ visible, glucoseValue, unit, flowType, onClose }: Props) {
  const { colors } = useTheme();
  const t = useTranslation();
  const [slide, setSlide] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) { setSlide(0); slideAnim.setValue(0); }
  }, [visible]);

  const goToSlide = (next: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue:   0, duration: 180, useNativeDriver: true }),
    ]).start();
    setSlide(next);
  };

  const isHypo      = flowType === 'hypo';
  const titles      = isHypo ? [t.lowBloodSugar, t.emergencyCheck] : [t.highBloodSugar, t.emergencyCheck];
  const accentColor = isHypo ? colors.low : colors.high;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{titles[slide]}</Text>
              <Text style={[styles.headerSub, { color: colors.textMuted }]}>{t.stepOf(slide + 1)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dots}>
            {[0, 1].map(i => (
              <View key={i} style={[styles.dot, {
                backgroundColor: i === slide ? accentColor : colors.border,
                width: i === slide ? 20 : 8,
              }]} />
            ))}
          </View>

          <Animated.View style={[styles.slideContent, { transform: [{ translateX: slideAnim }] }]}>
            {slide === 0 && isHypo  && <HypoSlide1  glucoseValue={glucoseValue} unit={unit} colors={colors} />}
            {slide === 0 && !isHypo && <HyperSlide1 glucoseValue={glucoseValue} unit={unit} colors={colors} />}
            {slide === 1 && <EmergencySlide flowType={flowType} glucoseValue={glucoseValue} unit={unit} onClose={onClose} colors={colors} />}
          </Animated.View>

          {slide === 0 && (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={[styles.skipBtn, { borderColor: colors.border }]} onPress={onClose} activeOpacity={0.75}>
                <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>{t.skipBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn, { backgroundColor: accentColor }]} onPress={() => goToSlide(1)} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>{t.emergencyCheckBtn}</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 20,
  },
  sheet: {
    borderRadius: 24,
    width: '100%',
    maxHeight: '75%',
    minHeight: '50%',
    overflow: 'hidden',
  },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, borderBottomWidth: 1 },
  headerTitle:  { fontSize: 16, fontWeight: '800' },
  headerSub:    { fontSize: 11, marginTop: 1 },
  closeBtn:     { padding: 4 },
  closeBtnText: { fontSize: 18, fontWeight: '700' },

  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8 },
  dot:  { height: 8, borderRadius: 4 },

  slideContent: { flex: 1, paddingHorizontal: 16 },

  footer:      { flexDirection: 'row', gap: 12, padding: 12, borderTopWidth: 1 },
  skipBtn:     { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  skipBtnText: { fontSize: 14, fontWeight: '600' },
  nextBtn:     { flex: 2, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  valueBanner:      { borderWidth: 1.5, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 10, marginTop: 4 },
  valueBannerLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  valueBannerValue: { fontSize: 22, fontWeight: '900' },

  explanationCard:  { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, overflow: 'hidden' },
  explanationTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  explanationBody:  { fontSize: 13, lineHeight: 19 },

  doseText:       { fontSize: 14, lineHeight: 21, marginBottom: 8 },
  doseBold:       { fontWeight: '900', fontSize: 16 },
  doseDisclaimer: { fontSize: 11, lineHeight: 15, fontStyle: 'italic' },

  tipRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 8, marginTop: 6, borderTopWidth: 1 },
  tipBullet: { fontSize: 13, marginTop: 1 },
  tipText:   { flex: 1, fontSize: 12, lineHeight: 18 },

  foodListTitle:    { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  foodGroup:        { borderWidth: 1, borderRadius: 10, marginBottom: 6, overflow: 'hidden' },
  foodGroupHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  foodGroupTitle:   { fontSize: 13, fontWeight: '700' },
  foodGroupChevron: { fontSize: 11 },
  foodRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  foodName:         { fontSize: 12, fontWeight: '600', marginBottom: 1 },
  foodMacros:       { fontSize: 10, lineHeight: 14 },
  carbsBadge:       { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  carbsBadgeText:   { fontSize: 11, fontWeight: '800' },

  callBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, paddingVertical: 13, marginBottom: 8 },
  callBtnIcon: { fontSize: 18 },
  callBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  fineBtn:     { borderWidth: 1.5, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginBottom: 10 },
  fineBtnText: { fontSize: 13, fontWeight: '600' },

  emergencyNote: { fontSize: 10, textAlign: 'center', lineHeight: 15, paddingBottom: 8 },
});
