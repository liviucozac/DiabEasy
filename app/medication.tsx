import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Platform, Alert,
} from 'react-native';
import { useGlucoseStore, InsulinEntry, Reminder } from '../store/glucoseStore';
import { calculateIOB, calcCorrectionDose, getAnalogByType, getLongActingByType, INSULIN_ANALOGS, LONG_ACTING_INSULINS } from '../utils/insulinUtils';
import { scheduleReminder, cancelReminder } from '../utils/notificationUtils';
import { generateId } from '../utils/idUtils';
import type { InsulinAnalogType, LongActingInsulinType } from '../store/glucoseStore';
import { useTheme } from '../context/AppContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PressBtn } from '../components/PressBtn';
import { ParamTrainingModal } from '../components/ParamTrainingModal';
import { useTranslation } from '../hooks/useTranslation';


const RED = '#EC5557';

type ActiveTab = 'calculator' | 'log' | 'reminders';
type InsulinType = 'Rapid-acting' | 'Long-acting';


function formatNow(): string {
  const now  = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dd}/${mm}/${now.getFullYear()} ${time}`;
}

function toMgDl(value: number, unit: string): number {
  return unit === 'mmol/L' ? value * 18.0182 : value;
}

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

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[s.infoValue, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

// ─── Insulin Dropdown ─────────────────────────────────────────────────────────

function InsulinDropdown<T extends string>({
  label, selected, options, onSelect,
}: {
  label:    string;
  selected: T;
  options:  { value: T; label: string; sublabel: string; duration?: string }[];
  onSelect: (v: T) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === selected) ?? options[0];

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{label}</Text>

      {/* Trigger button — same pill style as the rest of the tab */}
      <TouchableOpacity
        style={[s.dropdownTrigger, { borderColor: colors.red, backgroundColor: colors.bgCard }]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.dropdownTriggerText, { color: colors.text }]}>{current.label}</Text>
          <Text style={[s.dropdownTriggerSub,  { color: colors.textMuted }]}>{current.sublabel}{current.duration ? `  ·  ${current.duration}` : ''}</Text>
        </View>
        <Text style={[s.dropdownChevron, { color: colors.red }]}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Options list */}
      {open && (
        <View style={[s.dropdownList, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
          {options.map((opt, i) => {
            const active = opt.value === selected;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  s.dropdownItem,
                  i < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  active && { backgroundColor: colors.lowBg },
                ]}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.dropdownItemText, { color: active ? colors.red : colors.text }]}>{opt.label}</Text>
                  <Text style={[s.dropdownItemSub,  { color: colors.textMuted }]}>{opt.sublabel}{opt.duration ? `  ·  ${opt.duration}` : ''}</Text>
                </View>
                {active && <Text style={{ color: colors.red, fontWeight: '700', fontSize: 14 }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Calculator Tab ───────────────────────────────────────────────────────────

function CalculatorTab() {
  const { glucoseValue, unit, totalCarbs, settings, insulinEntries, setSettings } = useGlucoseStore();
  const { colors } = useTheme();
  const t = useTranslation();
  const [showTraining, setShowTraining] = useState(false);
  const [limitLowInput,  setLimitLowInput]  = useState(String(settings.glucoseLow));
  const [limitHighInput, setLimitHighInput] = useState(String(settings.glucoseHigh));

  const ISF        = settings.isf;
  const CARB_RATIO = settings.carbRatio;
  const targetMgDl = settings.targetGlucose;
  const currentMgDl = glucoseValue !== null ? toMgDl(glucoseValue, unit) : null;

  // Tick every 60 s so IOB (which depends on elapsed time) stays current
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const result = useMemo(() => {
    if (currentMgDl === null) return null;
    const meal       = totalCarbs / CARB_RATIO;
    const correction = calcCorrectionDose(currentMgDl, targetMgDl, ISF);
    const iob        = calculateIOB(insulinEntries, settings.insulinAnalogType, settings.dia);
    const total      = Math.max(meal + correction - iob, 0);
    return {
      meal:       Math.round(meal),
      correction: Math.round(correction),
      iob:        Math.round(iob * 10) / 10,   // one decimal
      total:      Math.round(total),
    };
  }, [now, currentMgDl, targetMgDl, totalCarbs, ISF, CARB_RATIO, insulinEntries, settings.insulinAnalogType, settings.dia]);

  const glucoseColor =
    currentMgDl === null                          ? '#888'
    : currentMgDl < settings.glucoseLow           ? '#e53935'
    : currentMgDl <= settings.glucoseHigh         ? '#2e7d32'
    : '#ef6c00';

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
      <SectionCard>
        <SectionTitle text={t.currentValues} />
        <InfoRow label={t.bloodGlucose} value={glucoseValue !== null ? `${glucoseValue} ${unit}` : t.notLoggedGoHome} valueColor={glucoseValue !== null ? glucoseColor : '#aaa'} />
        <View style={s.divider} />
        <InfoRow label={t.mealCarbs} value={totalCarbs > 0 ? `${totalCarbs} g` : t.noMealGoFoodGuide} valueColor={totalCarbs > 0 ? '#222' : '#aaa'} />
      </SectionCard>

      <SectionCard>
        <SectionTitle text={t.glucoseLimits} />
        <Text style={[s.paramHint, { color: colors.textMuted }]}>
          {t.glucoseLimitsHint}
        </Text>
        <View style={s.limitsRow}>
          <View style={s.limitField}>
            <Text style={[s.limitLabel, { color: colors.textMuted }]}>{t.lowThreshold}</Text>
            <TextInput
              style={[s.limitInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              value={limitLowInput}
              onChangeText={setLimitLowInput}
              keyboardType="numeric"
              returnKeyType="done"
              accessibilityLabel="Low glucose threshold"
              onBlur={() => {
                const n = parseFloat(limitLowInput);
                if (!isNaN(n) && n > 0 && n < settings.glucoseHigh) {
                  setSettings({ glucoseLow: n });
                } else {
                  setLimitLowInput(String(settings.glucoseLow));
                }
              }}
            />
          </View>
          <View style={s.limitField}>
            <Text style={[s.limitLabel, { color: colors.textMuted }]}>{t.highThreshold}</Text>
            <TextInput
              style={[s.limitInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              value={limitHighInput}
              onChangeText={setLimitHighInput}
              keyboardType="numeric"
              returnKeyType="done"
              accessibilityLabel="High glucose threshold"
              onBlur={() => {
                const n = parseFloat(limitHighInput);
                if (!isNaN(n) && n > settings.glucoseLow) {
                  setSettings({ glucoseHigh: n });
                } else {
                  setLimitHighInput(String(settings.glucoseHigh));
                }
              }}
            />
          </View>
        </View>
        <Text style={[s.limitHint, { color: colors.textFaint }]}>
          {t.glucoseLimitsFooter(settings.glucoseLow, settings.glucoseHigh)}
        </Text>
      </SectionCard>

      <SectionCard>
        <SectionTitle text={t.yourParameters} />
        <Text style={[s.paramHint, { color: colors.textMuted }]}>{t.yourParametersHint}</Text>
        <View style={s.paramGrid}>
          <View style={s.paramReadItem}>
            <Text style={[s.paramReadValue, { color: colors.text }]}>{settings.targetGlucose}</Text>
            <Text style={[s.paramReadLabel, { color: colors.textMuted }]}>{t.targetLabel}</Text>
          </View>
          <View style={[s.paramReadItem, s.paramReadBorder]}>
            <Text style={[s.paramReadValue, { color: colors.text }]}>{settings.isf}</Text>
            <Text style={[s.paramReadLabel, { color: colors.textMuted }]}>{t.isfLabel}</Text>
          </View>
          <View style={[s.paramReadItem, s.paramReadBorder]}>
            <Text style={[s.paramReadValue, { color: colors.text }]}>1:{settings.carbRatio}</Text>
            <Text style={[s.paramReadLabel, { color: colors.textMuted }]}>{t.carbRatioLabel}</Text>
          </View>
          <View style={[s.paramReadItem, s.paramReadBorder]}>
            <Text style={[s.paramReadValue, { color: colors.text }]}>{settings.dia}h</Text>
            <Text style={[s.paramReadLabel, { color: colors.textMuted }]}>{getAnalogByType(settings.insulinAnalogType).label}{'\n'}DIA</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.trainingBtn, { borderColor: RED }]}
          onPress={() => setShowTraining(true)}
          activeOpacity={0.75}
        >
          <Text style={[s.trainingBtnText, { color: RED }]}>{t.whatDoParamsMean}</Text>
        </TouchableOpacity>

        <ParamTrainingModal visible={showTraining} onClose={() => setShowTraining(false)} />
      </SectionCard>

      <SectionCard>
        <SectionTitle text={t.yourInsulin} />
        <Text style={[s.paramHint, { color: colors.textMuted }]}>{t.yourInsulinHint}</Text>
        <InsulinDropdown<InsulinAnalogType>
          label={t.rapidActingInsulin}
          selected={settings.insulinAnalogType}
          options={INSULIN_ANALOGS}
          onSelect={(v) => setSettings({ insulinAnalogType: v, dia: INSULIN_ANALOGS.find(a => a.value === v)?.defaultDia ?? settings.dia })}
        />
        <InsulinDropdown<LongActingInsulinType>
          label={t.longActingInsulin}
          selected={settings.longActingInsulinType}
          options={LONG_ACTING_INSULINS}
          onSelect={(v) => setSettings({ longActingInsulinType: v })}
        />
      </SectionCard>

      {!settings.insulinParamsSet ? (
        <View style={[s.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={s.emptyIcon}>🔒</Text>
          <Text style={[s.emptyTitle, { color: colors.text }]}>{t.paramsNotSet}</Text>
          <Text style={[s.emptyText, { color: colors.textMuted }]}>{t.paramsNotSetText}</Text>
        </View>
      ) : glucoseValue === null ? (
        <View style={[s.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={s.emptyIcon}>🩸</Text>
          <Text style={[s.emptyTitle, { color: colors.text }]}>{t.noGlucoseReading}</Text>
          <Text style={[s.emptyText, { color: colors.textMuted }]}>{t.noGlucoseReadingText}</Text>
        </View>
      ) : currentMgDl !== null && targetMgDl > currentMgDl ? (
        <View style={[s.warningBanner, { borderColor: '#2e7d32', backgroundColor: colors.normalBg, marginBottom: 10 }]}>
          <Text style={[s.warningText, { color: colors.normal }]}>{t.targetBelowCurrent(settings.targetGlucose, glucoseValue!, unit)}</Text>
          <Text style={[s.warningText, { color: colors.normal, marginTop: 6, fontWeight: '400' }]}>{t.noInsulinNeeded}</Text>
        </View>
      ) : (
        <SectionCard>
          <SectionTitle text={t.insulinUnitsNeeded} />
          <Text style={s.resultsMayVary}>{t.resultsMayVary}</Text>
          <View style={s.doseGrid}>
            <View style={s.doseItem}>
              <Text style={[s.doseNumber, { color: colors.text }]}>{result?.meal ?? '—'}</Text>
              <Text style={[s.doseLabel, { color: colors.textMuted }]}>{t.mealDose}</Text>
              <Text style={[s.doseUnit, { color: colors.textFaint }]}>{t.units}</Text>
            </View>
            <View style={[s.doseItem, s.doseItemBorder]}>
              <Text style={[s.doseNumber, result && result.correction > 0 ? { color: colors.high } : result && result.correction < 0 ? { color: colors.normal } : { color: colors.text }]}>
                {result ? (result.correction >= 0 ? '+' : '') + result.correction : '—'}
              </Text>
              <Text style={[s.doseLabel, { color: colors.textMuted }]}>{t.correction}</Text>
              <Text style={[s.doseUnit, { color: colors.textFaint }]}>{t.units}</Text>
            </View>
            <View style={[s.doseItem, s.doseItemBorder]}>
              <Text style={[s.doseNumber, { color: result && result.iob > 0 ? colors.normal : colors.text }]}>
                {result ? `-${result.iob}` : '—'}
              </Text>
              <Text style={[s.doseLabel, { color: colors.textMuted }]}>{t.iob}</Text>
              <Text style={[s.doseUnit, { color: colors.textFaint }]}>{t.units}</Text>
            </View>
            <View style={[s.doseItem, s.doseItemBorder]}>
              <Text style={[s.doseNumber, s.doseTotalNumber, { color: colors.red }]}>{result?.total ?? '—'}</Text>
              <Text style={[s.doseLabel, { color: colors.textMuted }]}>{t.total}</Text>
              <Text style={[s.doseUnit, { color: colors.textFaint }]}>{t.units}</Text>
            </View>
          </View>
          {result && result.iob > 0 && (
            <View style={[s.warningBanner, { borderColor: colors.normal, backgroundColor: colors.normalBg, marginBottom: 10 }]}>
              <Text style={[s.warningText, { color: colors.normal }]}>{t.iobActive(result.iob)}</Text>
            </View>
          )}
          {currentMgDl !== null && currentMgDl < 75 && (
            <View style={[s.warningBanner, { borderColor: '#e53935', backgroundColor: colors.lowBg }]}>
              <Text style={[s.warningText, { color: colors.low }]}>{t.bloodSugarLowNoInsulin}</Text>
            </View>
          )}
          {currentMgDl !== null && currentMgDl > settings.targetGlucose && (() => {
            const rawDose = Math.max(0, Math.round(calcCorrectionDose(currentMgDl, settings.targetGlucose, settings.isf)));
            if (rawDose === 0) return null;
            return (
              <View style={[s.warningBanner, { borderColor: '#ef6c00', backgroundColor: colors.highBg }]}>
                <Text style={[s.warningText, { color: colors.high }]}>
                  {t.highCorrectionDose(rawDose, getAnalogByType(settings.insulinAnalogType).label, currentMgDl > 250)}
                </Text>
              </View>
            );
          })()}
          <Text style={s.disclaimer}>{t.estimateOnly}</Text>
        </SectionCard>
      )}

      <SectionCard>
        <SectionTitle text={t.quickReference} />
        {[
          { emoji: '🍬', title: t.qrLow.title,     body: t.qrLow.body },
          { emoji: '✅', title: t.qrNormal.title,  body: t.qrNormal.body },
          { emoji: '💧', title: t.qrHigh.title,    body: t.qrHigh.body },
          { emoji: '🚨', title: t.qrVeryHigh.title, body: t.qrVeryHigh.body },
        ].map((ref, i, arr) => (
          <View key={i}>
            <View style={s.refRow}>
              <Text style={s.refEmoji}>{ref.emoji}</Text>
              <View style={s.refText}>
                <Text style={[s.refTitle, { color: colors.text }]}>{ref.title}</Text>
                <Text style={[s.refBody, { color: colors.textMuted }]}>{ref.body}</Text>
              </View>
            </View>
            {i < arr.length - 1 && <View style={s.refDivider} />}
          </View>
        ))}
      </SectionCard>
    </ScrollView>
  );
}

// ─── Log Tab ──────────────────────────────────────────────────────────────────

function LogTab() {
  const { insulinEntries, addInsulinEntry, clearInsulinLog, settings, glucoseValue, unit } = useGlucoseStore();
  const { colors } = useTheme();
  const t = useTranslation();

  const [insulinType,    setInsulinType]    = useState<InsulinType>('Rapid-acting');
  const [units,          setUnits]          = useState(0);
  const [timeDate,       setTimeDate]       = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const glucoseWarning = (() => {
    if (glucoseValue === null) return null;
    const mgDl = toMgDl(glucoseValue, unit ?? 'mg/dL');
    if (mgDl < 75) {
      return { kind: 'low' as const, mgDl };
    }
    if (mgDl > 150) {
      const correction = calcCorrectionDose(mgDl, settings.targetGlucose, settings.isf);
      const iob        = calculateIOB(insulinEntries, settings.insulinAnalogType, settings.dia);
      const net        = Math.max(0, correction - iob);
      const analog     = getAnalogByType(settings.insulinAnalogType).label;
      return { kind: 'high' as const, mgDl, net, iob, analog };
    }
    return null;
  })();

  const handleAdd = () => {
    if (units <= 0) { Alert.alert(t.missingInfo, t.pleaseSetUnit); return; }
    addInsulinEntry({ id: generateId(), units, time: formatTime(timeDate), type: insulinType, timestamp: new Date().toISOString() });    setUnits(0); setTimeDate(new Date());
  };

  const handleClear = () => {
    Alert.alert(t.clearLog, t.clearLogConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.clear, style: 'destructive', onPress: clearInsulinLog },
    ]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>

      {glucoseWarning?.kind === 'low' && (
        <View style={[s.infoCard, { backgroundColor: colors.lowBg, borderColor: colors.low, marginBottom: 4 }]}>
          <Text style={[s.infoCardTitle, { color: colors.low }]}>{t.bloodSugarTooLow}</Text>
          <Text style={[s.infoCardBody, { color: colors.textMuted }]}>
            {t.bloodSugarTooLowBody(glucoseValue!, unit ?? 'mg/dL')}
          </Text>
        </View>
      )}

      {glucoseWarning?.kind === 'high' && (
        <View style={[s.infoCard, { backgroundColor: colors.highBg, borderColor: colors.high, marginBottom: 4 }]}>
          <Text style={[s.infoCardTitle, { color: colors.high }]}>{t.bloodSugarElevated}</Text>
          <Text style={[s.infoCardBody, { color: colors.textMuted }]}>
            {t.bloodSugarElevatedBody(glucoseValue!, unit ?? 'mg/dL', glucoseWarning.net, glucoseWarning.analog, glucoseWarning.iob)}
          </Text>
          <Text style={[s.infoCardBody, { color: colors.textFaint, marginTop: 4, fontStyle: 'italic' }]}>
            {t.confirmWithProvider}
          </Text>
        </View>
      )}

      <SectionCard>
        <SectionTitle text={t.newEntry} />
        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t.insulinType}</Text>
        <View style={s.typeRow}>
          {(['Rapid-acting', 'Long-acting'] as InsulinType[]).map((tp) => {
            const active = insulinType === tp;
            const label = tp === 'Rapid-acting' ? t.rapidActing : t.longActing;
            return (
              <TouchableOpacity key={tp}
                style={[s.typePill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
                onPress={() => setInsulinType(tp)} activeOpacity={0.75}>
                <Text style={[s.typePillText, { color: colors.red }, active && s.typePillTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t.unitsLabel}</Text>
        <View style={s.stepperRow}>
          <PressBtn style={[s.stepperBtn, { borderColor: colors.red, backgroundColor: colors.red }, s.primaryBtnShadow]}
            onPress={() => setUnits((u) => Math.max(u - 1, 0))} activeOpacity={0.75}>
            <Text style={s.stepperBtnText}>−</Text>
          </PressBtn>
          <Text style={[s.stepperValue, { color: colors.text }]}>{units}</Text>
          <PressBtn style={[s.stepperBtn, { borderColor: colors.red, backgroundColor: colors.red }, s.primaryBtnShadow]}
            onPress={() => setUnits((u) => u + 1)} activeOpacity={0.75}>
            <Text style={s.stepperBtnText}>+</Text>
          </PressBtn>
        </View>

        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t.timeTaken}</Text>
        <TouchableOpacity style={[s.timeInput, s.timePickerBtn, s.outlineBtnShadow, { backgroundColor: colors.bgCard }]} onPress={() => setShowTimePicker(true)} activeOpacity={0.75}>
          <Text style={[s.timePickerBtnText, { color: colors.text }]}>{formatTime(timeDate)}</Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker value={timeDate} mode="time" display="default"
            onChange={(event, date) => { setShowTimePicker(false); if (event.type === 'set' && date) setTimeDate(date); }} />
        )}
        <PressBtn style={[s.addEntryBtn, { backgroundColor: colors.red }, s.primaryBtnShadow]} onPress={handleAdd}>
          <Text style={s.addEntryBtnText}>{t.addToLog}</Text>
        </PressBtn>
      </SectionCard>

      <SectionCard>
        <View style={s.logHeader}>
          <SectionTitle text={t.insulinLog} />
          {insulinEntries.length > 0 && (
            <PressBtn onPress={handleClear} activeOpacity={0.75}>
              <Text style={[s.clearLogText, { color: colors.red }]}>{t.clearAll}</Text>
            </PressBtn>
          )}
        </View>
        {insulinEntries.length === 0 ? (
          <>
            <Text style={s.emptyLogText}>{t.noEntriesYet}</Text>
            <View style={[s.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[s.infoCardTitle, { color: colors.text }]}>{t.whyLogInsulin}</Text>
              {[t.logTip1, t.logTip2, t.logTip3, t.logTip4].map((tip, i) => (
                <View key={i} style={s.infoCardRow}>
                  <Text style={[s.infoCardBullet, { color: colors.red }]}>•</Text>
                  <Text style={[s.infoCardBody, { color: colors.textMuted }]}>{tip}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          [...insulinEntries].reverse().map((entry, idx) => {
            const brandName = entry.type === 'Rapid-acting'
              ? getAnalogByType(settings.insulinAnalogType).sublabel
              : getLongActingByType(settings.longActingInsulinType).sublabel;
            return (
              <View key={idx} style={[s.logRow, idx < insulinEntries.length - 1 && s.logRowBorder, { backgroundColor: colors.bgCard }]}>
                <View style={s.logLeft}>
                  <Text style={[s.logType, { color: colors.text }]}>{entry.type}</Text>
                  <Text style={[s.logTime, { color: colors.textMuted }]}>{brandName}  ·  {t.at} {entry.time}</Text>
                </View>
                <Text style={[s.logUnits, { color: colors.red }]}>{entry.units}u</Text>
              </View>
            );
          })
        )}
      </SectionCard>
    </ScrollView>
  );
}

// ─── Reminders Tab ────────────────────────────────────────────────────────────

function ReminderForm({
  title, label, setLabel, timeDate, setTimeDate, days, setDays,
  rType, setRType, rUnits, setRUnits, onSave, onCancel, colors,
}: {
  title: string; label: string; setLabel: (v: string) => void;
  timeDate: Date; setTimeDate: (d: Date) => void;
  days: string; setDays: (v: string) => void;
  rType: InsulinType; setRType: (t: InsulinType) => void;
  rUnits: number; setRUnits: (n: number) => void;
  onSave: () => void; onCancel: () => void; colors: any;
}) {
  const t = useTranslation();
  const [labelFocus,     setLabelFocus]     = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <SectionCard>
      <SectionTitle text={title} />
      <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t.label}</Text>
      <TextInput
        style={[s.timeInput, labelFocus && { borderColor: colors.red }, { backgroundColor: colors.inputBg, color: colors.text }]}
        placeholder={t.reminderLabelPlaceholder} placeholderTextColor="#aaa"
        value={label} onChangeText={setLabel}
        onFocus={() => setLabelFocus(true)} onBlur={() => setLabelFocus(false)} returnKeyType="done" />

      <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t.time}</Text>
      <TouchableOpacity style={[s.timeInput, s.timePickerBtn, s.outlineBtnShadow, { backgroundColor: colors.bgCard }]} onPress={() => setShowTimePicker(true)} activeOpacity={0.75}>
        <Text style={[s.timePickerBtnText, { color: colors.text }]}>{formatTime(timeDate)}</Text>
      </TouchableOpacity>
      {showTimePicker && (
        <DateTimePicker value={timeDate} mode="time" display="default"
          onChange={(event, date) => { setShowTimePicker(false); if (event.type === 'set' && date) setTimeDate(date); }} />
      )}

      <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t.schedule}</Text>
      <View style={s.scheduleRow}>
        <TouchableOpacity
          style={[s.schedulePill, { borderColor: colors.red }, days !== 'everyday' && { backgroundColor: colors.red }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.75}
        >
          <Text style={[s.schedulePillText, { color: days !== 'everyday' ? '#fff' : colors.textMuted }]}>
            {days !== 'everyday' ? formatDateDisplay(days) : t.pickDate}
          </Text>
        </TouchableOpacity>
        <Text style={[s.scheduleOrText, { color: colors.textMuted }]}>or</Text>
        <TouchableOpacity
          style={[s.schedulePill, { borderColor: colors.red }, days === 'everyday' && { backgroundColor: colors.red }]}
          onPress={() => setDays('everyday')}
          activeOpacity={0.75}
        >
          <Text style={[s.schedulePillText, { color: days === 'everyday' ? '#fff' : colors.textMuted }]}>{t.everyday}</Text>
        </TouchableOpacity>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={days !== 'everyday' ? new Date(days) : new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === 'set' && date) {
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              setDays(`${yyyy}-${mm}-${dd}`);
            }
          }}
        />
      )}

      <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t.insulinType}</Text>
      <View style={s.typeRow}>
        {(['Rapid-acting', 'Long-acting'] as InsulinType[]).map((tp) => {
          const active = rType === tp;
          const label = tp === 'Rapid-acting' ? t.rapidActing : t.longActing;
          return (
            <TouchableOpacity key={tp}
              style={[s.typePill, active ? s.primaryBtnShadow : null, { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' }]}
              onPress={() => setRType(tp)} activeOpacity={0.75}>
              <Text style={[s.typePillText, { color: colors.red }, active && s.typePillTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t.unitsLabel}</Text>
      <View style={s.stepperRow}>
        <PressBtn style={[s.stepperBtn, { borderColor: colors.red, backgroundColor: colors.red }, s.primaryBtnShadow]}
          onPress={() => setRUnits(Math.max(rUnits - 1, 0))} activeOpacity={0.75}>
          <Text style={s.stepperBtnText}>−</Text>
        </PressBtn>
        <Text style={[s.stepperValue, { color: colors.text }]}>{rUnits}</Text>
        <PressBtn style={[s.stepperBtn, { borderColor: colors.red, backgroundColor: colors.red }, s.primaryBtnShadow]}
          onPress={() => setRUnits(rUnits + 1)} activeOpacity={0.75}>
          <Text style={s.stepperBtnText}>+</Text>
        </PressBtn>
      </View>

      <View style={s.formBtnRow}>
        <View style={{ flex: 1 }}>
          <PressBtn style={[s.cancelFormBtn, s.outlineBtnShadow, { backgroundColor: colors.bgCard }]} onPress={onCancel} activeOpacity={0.75}>
            <Text style={[s.cancelFormBtnText, { color: colors.textMuted }]}>{t.cancel}</Text>
          </PressBtn>
        </View>
        <View style={{ flex: 1 }}>
          <PressBtn style={[s.saveFormBtn, { backgroundColor: colors.red, borderColor: colors.red }, s.primaryBtnShadow]} onPress={onSave}>
            <Text style={s.saveFormBtnText}>{t.save}</Text>
          </PressBtn>
        </View>
      </View>
    </SectionCard>
  );
}

function timeStringToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function RemindersTab() {
  const { colors } = useTheme();
  const t = useTranslation();
  const { reminders, addReminder, updateReminder, deleteReminder, settings } = useGlucoseStore();

  const [showAddForm,  setShowAddForm]  = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);

  // Add form state
  const [addLabel,    setAddLabel]    = useState('');
  const [addTimeDate, setAddTimeDate] = useState(new Date());
  const [addDays,     setAddDays]     = useState('everyday');
  const [addType,     setAddType]     = useState<InsulinType>('Rapid-acting');
  const [addUnits,    setAddUnits]    = useState(1);

  // Edit form state
  const [editLabel,    setEditLabel]    = useState('');
  const [editTimeDate, setEditTimeDate] = useState(new Date());
  const [editDays,     setEditDays]     = useState('everyday');
  const [editType,     setEditType]     = useState<InsulinType>('Rapid-acting');
  const [editUnits,    setEditUnits]    = useState(1);

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const handleAdd = () => {
    if (!addLabel.trim()) { Alert.alert(t.missingInfo, t.pleaseFillLabel); return; }
    const newReminder = { id: generateId(), label: addLabel.trim(), time: formatTime(addTimeDate), days: addDays, type: addType, units: addUnits, active: true };
    addReminder(newReminder);
    if (settings.notificationsEnabled) scheduleReminder(newReminder, settings);
    setAddLabel(''); setAddTimeDate(new Date()); setAddDays('everyday'); setAddType('Rapid-acting'); setAddUnits(1);
    setShowAddForm(false);
  };

  const startEdit = (r: Reminder) => {
    setEditingId(r.id);
    setEditLabel(r.label);
    setEditTimeDate(timeStringToDate(r.time));
    setEditDays(r.days ?? 'everyday');
    setEditType(r.type as InsulinType);
    setEditUnits(r.units);
  };

  const handleSaveEdit = () => {
    if (!editLabel.trim()) { Alert.alert(t.missingInfo, t.pleaseFillLabel); return; }
    const updated = { label: editLabel.trim(), time: formatTime(editTimeDate), days: editDays, type: editType, units: editUnits };
    updateReminder(editingId!, updated);
    if (settings.notificationsEnabled) {
      cancelReminder(editingId!);
      const existing = reminders.find(r => r.id === editingId);
      if (existing?.active) scheduleReminder({ ...existing, ...updated }, settings);
    }
    setEditingId(null);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[s.noteCard, { backgroundColor: settings.notificationsEnabled ? colors.normalBg : colors.highBg, borderColor: colors.border }]}>
        <Text style={s.noteText}>
          {settings.notificationsEnabled ? t.notificationsActive : t.notificationsOff}
        </Text>
      </View>

      {reminders.length === 0 && !showAddForm ? (
        <View style={[s.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={s.emptyIcon}>⏰</Text>
          <Text style={[s.emptyTitle, { color: colors.text }]}>{t.noRemindersYet}</Text>
          <Text style={[s.emptyText, { color: colors.textMuted }]}>{t.noRemindersYetText}</Text>
        </View>
      ) : (
        reminders.map((r) =>
          editingId === r.id ? (
            <ReminderForm key={r.id}
              title={t.editReminder}
              label={editLabel}    setLabel={setEditLabel}
              timeDate={editTimeDate} setTimeDate={setEditTimeDate}
              days={editDays}      setDays={setEditDays}
              rType={editType}     setRType={setEditType}
              rUnits={editUnits}   setRUnits={setEditUnits}
              onSave={handleSaveEdit}
              onCancel={() => setEditingId(null)}
              colors={colors}
            />
          ) : (
            <View key={r.id} style={[s.reminderCard, !r.active && s.reminderCardInactive, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={s.reminderLeft}>
                <Text style={[s.reminderLabel, { color: colors.text }, !r.active && s.reminderLabelInactive]}>{r.label}</Text>
                <Text style={[s.reminderSub, { color: colors.textMuted }]}>
                  {(r.days ?? 'everyday') === 'everyday' ? t.everyday : formatDateDisplay(r.days!)} · {r.time} · {r.type === 'Rapid-acting'
                    ? getAnalogByType(settings.insulinAnalogType).sublabel
                    : getLongActingByType(settings.longActingInsulinType).sublabel} · {r.units}u
                </Text>
              </View>
              <View style={s.reminderActions}>
                <TouchableOpacity
                  style={[s.toggleBtn, r.active && { borderColor: colors.red, backgroundColor: 'transparent' }]}
                  onPress={() => {
                    const nowActive = !r.active;
                    updateReminder(r.id, { active: nowActive });
                    if (settings.notificationsEnabled) {
                      if (nowActive) scheduleReminder({ ...r, active: true }, settings);
                      else cancelReminder(r.id);
                    }
                  }} activeOpacity={0.75}>
                  <Text style={[s.toggleBtnText, r.active && { color: colors.red }]}>{r.active ? t.on : t.off}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.editBtn} onPress={() => startEdit(r)} activeOpacity={0.75}>
                  <Text style={[s.editBtnText, { color: colors.red }]}>{t.edit}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => { cancelReminder(r.id); deleteReminder(r.id); }} activeOpacity={0.75}>
                  <Text style={[s.deleteBtnText, { color: colors.red }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        )
      )}

      {showAddForm && (
        <ReminderForm
          title={t.newReminder}
          label={addLabel}    setLabel={setAddLabel}
          timeDate={addTimeDate} setTimeDate={setAddTimeDate}
          days={addDays}      setDays={setAddDays}
          rType={addType}     setRType={setAddType}
          rUnits={addUnits}   setRUnits={setAddUnits}
          onSave={handleAdd}
          onCancel={() => { setShowAddForm(false); setAddDays('everyday'); }}
          colors={colors}
        />
      )}

      {!showAddForm && editingId === null && (
        <PressBtn style={[s.addReminderBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]} onPress={() => setShowAddForm(true)} activeOpacity={0.75}>
          <Text style={[s.addReminderBtnText, { color: colors.red }]}>{t.addReminder}</Text>
        </PressBtn>
      )}

      {!showAddForm && editingId === null && (
        <View style={[s.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[s.infoCardTitle, { color: colors.text }]}>{t.howRemindersWork}</Text>
          <Text style={[s.infoCardBody, { color: colors.textMuted }]}>{t.howRemindersWorkBody}</Text>
          <Text style={[s.infoCardBody, { marginTop: 6, color: colors.textMuted }]}>{t.howRemindersWorkBody2}</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MedicationScreen() {
  const { colors } = useTheme();
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculator');

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'calculator', label: t.calculatorTab },
    { key: 'log',        label: t.insulinLogTab },
    { key: 'reminders',  label: t.remindersTab },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <Text style={[s.title, { color: colors.text }]}>{t.medication}</Text>

      {/* Sub-tab bar with shadow */}
      <View style={[s.tabBar, { borderColor: colors.red }, s.tabBarShadow]}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tabBtn, { backgroundColor: active ? colors.red : colors.bg }]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabBtnText, { color: active ? '#fff' : colors.red }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[s.content, { backgroundColor: colors.bg }]}>
        {activeTab === 'calculator' && <CalculatorTab />}
        {activeTab === 'log'        && <LogTab />}
        {activeTab === 'reminders'  && <RemindersTab />}
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
  tabBtnText:{ fontSize: 13, fontWeight: '600' },

  sectionCard:  { borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fafafa', padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#666666', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel:    { fontSize: 13, color: '#666666' },
  infoValue:    { fontSize: 14, fontWeight: '700' },
  divider:      { height: 1, backgroundColor: '#ececec', marginVertical: 6 },

  paramGrid:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  paramReadItem:   { flex: 1, alignItems: 'center', paddingVertical: 6 },
  paramReadBorder: { borderLeftWidth: 1, borderLeftColor: '#e0e0e0' },
  paramReadValue:  { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  paramReadLabel:  { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  paramHint:       { fontSize: 12, marginBottom: 10, lineHeight: 17 },

  resultsMayVary: { fontSize: 11, color: '#aaaaaa', marginBottom: 10, textAlign: 'center', fontStyle: 'italic' },
  doseGrid:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  doseItem:       { flex: 1, alignItems: 'center', paddingVertical: 8 },
  doseItemBorder: { borderLeftWidth: 1, borderLeftColor: '#e0e0e0' },
  doseNumber:     { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  doseTotalNumber:{ fontSize: 26 },
  doseLabel:      { fontSize: 11, fontWeight: '500' },
  doseUnit:       { fontSize: 10 },

  warningBanner: { borderRadius: 8, borderWidth: 1.5, padding: 10, marginBottom: 10 },
  warningText:   { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  disclaimer:    { fontSize: 11, color: '#aaaaaa', lineHeight: 16, textAlign: 'center' },

  emptyCard:  { borderRadius: 12, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 12 },
  emptyIcon:  { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptyText:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  refRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  refEmoji:  { fontSize: 18, width: 26, textAlign: 'center', marginTop: 1 },
  refText:   { flex: 1 },
  refTitle:  { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  refBody:   { fontSize: 12, lineHeight: 17 },
  refDivider:{ height: 1, backgroundColor: '#ececec', marginVertical: 2 },

  noteCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12 },
  noteText: { fontSize: 13, color: '#2e7d32', lineHeight: 18 },

  fieldLabel:     { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  typeRow:        { flexDirection: 'row', gap: 10, marginBottom: 4 },
  typePill:       { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', backgroundColor: 'transparent' },
  typePillText:   { fontSize: 13, fontWeight: '600' },
  typePillTextActive: { color: '#fff' },

  stepperRow:     { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  stepperBtn:     { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontSize: 20, color: '#fff', lineHeight: 24, backgroundColor: 'transparent' },
  stepperValue:   { fontSize: 22, fontWeight: '800', minWidth: 36, textAlign: 'center' },

  timeInput:       { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 6, paddingVertical: Platform.OS === 'ios' ? 9 : 7, paddingHorizontal: 12, fontSize: 14, marginBottom: 4 },
  timePickerBtn:   { justifyContent: 'center' },
  timePickerBtnText:{ fontSize: 15, fontWeight: '700' },

  scheduleRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  schedulePill:    { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', backgroundColor: 'transparent' },
  schedulePillText:{ fontSize: 13, fontWeight: '600' },
  scheduleOrText:  { fontSize: 12, fontWeight: '500' },

  addEntryBtn:     { borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  addEntryBtnText: { fontSize: 14, color: '#fff', fontWeight: '700', backgroundColor: 'transparent' },

  logHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clearLogText: { fontSize: 12, fontWeight: '600' },
  emptyLogText: { fontSize: 13, color: '#aaaaaa', textAlign: 'center', paddingVertical: 12 },
  logRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  logRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  logLeft:      { flex: 1 },
  logType:      { fontSize: 13, fontWeight: '700' },
  logTime:      { fontSize: 12, marginTop: 1 },
  logUnits:     { fontSize: 18, fontWeight: '900' },

  reminderCard:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 10 },
  reminderCardInactive: { opacity: 0.5 },
  reminderLeft:         { flex: 1, marginRight: 10 },
  reminderLabel:        { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  reminderLabelInactive:{ color: '#aaaaaa' },
  reminderSub:          { fontSize: 12 },
  reminderActions:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBtn:            { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 5, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: 'transparent' },
  toggleBtnActive:      { backgroundColor: 'transparent' },
  toggleBtnText:        { fontSize: 12, fontWeight: '700', color: '#aaaaaa' },
  deleteBtn:            { padding: 4 },
  deleteBtnText:        { fontSize: 15, color: '#e0e0e0', fontWeight: '700', backgroundColor: 'transparent' },
  editBtn:              { padding: 4, paddingHorizontal: 8 },
  editBtnText:          { fontSize: 13, fontWeight: '600', backgroundColor: 'transparent' },

  addReminderBtn:     { borderRadius: 8, paddingVertical: 11, alignItems: 'center', borderWidth: 1.5, marginBottom: 12, backgroundColor: 'transparent' },
  addReminderBtnText: { fontSize: 14, fontWeight: '700', backgroundColor: 'transparent' },

  infoCard:      { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  infoCardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  infoCardLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  infoCardRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  infoCardBullet:{ fontSize: 14, fontWeight: '800', marginTop: 1 },
  infoCardBody:  { fontSize: 12, lineHeight: 18 },

  formBtnRow:        { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelFormBtn:     { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center', backgroundColor: 'transparent' },
  cancelFormBtnText: { fontSize: 14, fontWeight: '600' },
  saveFormBtn:       { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, alignItems: 'center' },
  saveFormBtnText:   { fontSize: 14, color: '#fff', fontWeight: '700' },

  // ── Shadows ──────────────────────────────────────────────────────────────────
  tabBarShadow:     { shadowColor: '#EC5557', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
  primaryBtnShadow: { shadowColor: '#7a1010', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.45, shadowRadius: 0, elevation: 4 },
  outlineBtnShadow: { shadowColor: '#000', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },

  dropdownTrigger:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 2 },
  dropdownTriggerText: { fontSize: 14, fontWeight: '700' },
  dropdownTriggerSub:  { fontSize: 11, marginTop: 2 },
  dropdownChevron:     { fontSize: 12, fontWeight: '700', marginLeft: 8 },
  dropdownList:        { borderWidth: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 4 },
  dropdownItem:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  dropdownItemText:    { fontSize: 14, fontWeight: '600' },
  dropdownItemSub:     { fontSize: 11, marginTop: 2 },

  trainingBtn:     { marginTop: 14, borderWidth: 1.5, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  trainingBtnText: { fontSize: 13, fontWeight: '600' },
  limitsRow:       { flexDirection: 'row', gap: 12, marginTop: 4 },
  limitField:      { flex: 1 },
  limitLabel:      { fontSize: 11, marginBottom: 4 },
  limitInput:      { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  limitHint:       { fontSize: 11, textAlign: 'center', marginTop: 8 },
});