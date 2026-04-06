import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Platform, Alert,
} from 'react-native';
import { useGlucoseStore, InsulinEntry } from '../store/glucoseStore';
import { useTheme } from '../context/AppContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const RED = '#EC5557';

type ActiveTab = 'calculator' | 'log' | 'reminders';
type InsulinType = 'Rapid-acting' | 'Long-acting';

// ─── Reminder type ────────────────────────────────────────────────────────────
interface Reminder {
  id: string;
  label: string;
  time: string;   // "HH:MM"
  type: InsulinType;
  units: number;
  active: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNow(): string {
  const now  = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dd}/${mm}/${now.getFullYear()} ${time}`;
}

function toMgDl(value: number, unit: string): number {
  return unit === 'mmol/L' ? value * 18 : value;
}

function fromMgDl(value: number, unit: string): number {
  return unit === 'mmol/L' ? parseFloat((value / 18).toFixed(1)) : value;
}

/**
 * Standard bolus calculator:
 *   Meal dose     = totalCarbs / carbRatio
 *   Correction    = (currentBG - targetBG) / ISF
 *   Total         = meal + correction  (floored at 0)
 *
 * Default ISF = 50 mg/dL per unit, carb ratio = 10g per unit.
 * Both are editable by the user.
 */
function calcDose(
  currentMgDl: number,
  targetMgDl: number,
  totalCarbs: number,
  isf: number,
  carbRatio: number,
): { meal: number; correction: number; total: number } {
  const meal       = totalCarbs / carbRatio;
  const correction = (currentMgDl - targetMgDl) / isf;
  const total      = Math.max(meal + correction, 0);
  return {
    meal:       parseFloat(meal.toFixed(1)),
    correction: parseFloat(correction.toFixed(1)),
    total:      parseFloat(total.toFixed(1)),
  };
}

// ─── Small shared components ──────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[s.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>{children}</View>;
}

function SectionTitle({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{text}</Text>;
}

function InfoRow({ label, value, valueColor }: {
  label: string; value: string; valueColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[s.infoValue, { color: valueColor ?? colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

// ─── Tab: Calculator ──────────────────────────────────────────────────────────

function CalculatorTab() {
  const { glucoseValue, unit, totalCarbs, settings } = useGlucoseStore();
  const { colors } = useTheme();

  const ISF        = settings.isf;
  const CARB_RATIO = settings.carbRatio;
  const targetMgDl = settings.targetGlucose;
  const targetInput = String(settings.targetGlucose);

  const currentMgDl = glucoseValue !== null ? toMgDl(glucoseValue, unit) : null;

  const result = useMemo(() => {
    if (currentMgDl === null) return null;
    const meal       = totalCarbs / CARB_RATIO;
    const correction = (currentMgDl - targetMgDl) / ISF;
    const total      = Math.max(meal + correction, 0);
    return {
      meal:       Math.round(meal),
      correction: Math.round(correction),
      total:      Math.round(total),
    };
  }, [currentMgDl, targetMgDl, totalCarbs, ISF, CARB_RATIO]);

  const glucoseColor =
    currentMgDl === null       ? '#888'
    : currentMgDl < 75         ? '#e53935'
    : currentMgDl <= 150       ? '#2e7d32'
    : '#ef6c00';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Current inputs pulled from store */}
      <SectionCard>
        <SectionTitle text="Current Values" />
        <InfoRow
          label="Blood glucose"
          value={
            glucoseValue !== null
              ? `${glucoseValue} ${unit}`
              : 'Not logged — go to Home tab'
          }
          valueColor={glucoseValue !== null ? glucoseColor : '#aaa'}
        />
        <View style={s.divider} />
        <InfoRow
          label="Meal carbs"
          value={
            totalCarbs > 0
              ? `${totalCarbs} g`
              : 'No meal planned — go to Food Guide'
          }
          valueColor={totalCarbs > 0 ? '#222' : '#aaa'}
        />
      </SectionCard>

      {/* Parameters — now pulled from Profile > Settings */}
      <SectionCard>
        <SectionTitle text="Your Parameters" />
        <Text style={[s.paramHint, { color: colors.textMuted }]}>
          Edit your personal values in the Profile tab → Settings → Insulin Calculator Defaults.
        </Text>
        <View style={s.paramGrid}>
          <View style={s.paramReadItem}>
            <Text style={[s.paramReadValue, { color: colors.text }]}>{settings.targetGlucose}</Text>
            <Text style={[s.paramReadLabel, { color: colors.textMuted }]}>Target{'\n'}(mg/dL)</Text>
          </View>
          <View style={[s.paramReadItem, s.paramReadBorder]}>
            <Text style={[s.paramReadValue, { color: colors.text }]}>{settings.isf}</Text>
            <Text style={[s.paramReadLabel, { color: colors.textMuted }]}>ISF{'\n'}(mg/dL/u)</Text>
          </View>
          <View style={[s.paramReadItem, s.paramReadBorder]}>
            <Text style={[s.paramReadValue, { color: colors.text }]}>1:{settings.carbRatio}</Text>
            <Text style={[s.paramReadLabel, { color: colors.textMuted }]}>Carb{'\n'}ratio</Text>
          </View>
        </View>
      </SectionCard>

      {/* Result */}
      {glucoseValue === null ? (
        <View style={[s.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={s.emptyIcon}>🩸</Text>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No glucose reading</Text>
          <Text style={[s.emptyText, { color: colors.textMuted }]}>
            Log a blood sugar value on the Home tab to calculate your dose.
          </Text>
        </View>
      ) : currentMgDl !== null && targetMgDl > currentMgDl ? (
        <View style={[s.warningBanner, { borderColor: '#2e7d32', backgroundColor: colors.normalBg, marginBottom: 10 }]}>
          <Text style={[s.warningText, { color: colors.normal }]}>
            🏃 Your target glycemia ({targetInput} mg/dL) is higher than your current reading ({glucoseValue} {unit}).
          </Text>
          <Text style={[s.warningText, { color: colors.normal, marginTop: 6, fontWeight: '400' }]}>
            No insulin needed. If you want to lower your blood sugar, consider light physical activity such as a 20-minute walk.
          </Text>
        </View>
      ) : (
        <SectionCard>
          <SectionTitle text="Insulin Units Needed" />
          <Text style={s.resultsMayVary}>Results may vary slightly depending on individual response.</Text>

          <View style={s.doseGrid}>
            <View style={s.doseItem}>
              <Text style={[s.doseNumber, { color: colors.text }]}>{result?.meal ?? '—'}</Text>
              <Text style={[s.doseLabel, { color: colors.textMuted }]}>Meal dose</Text>
              <Text style={[s.doseUnit, { color: colors.textFaint }]}>units</Text>
            </View>
            <View style={[s.doseItem, s.doseItemBorder]}>
              <Text style={[
                s.doseNumber,
                result && result.correction > 0 ? { color: colors.high } :
                result && result.correction < 0 ? { color: colors.normal } : { color: colors.text },
              ]}>
                {result
                  ? (result.correction >= 0 ? '+' : '') + result.correction
                  : '—'}
              </Text>
              <Text style={[s.doseLabel, { color: colors.textMuted }]}>Correction</Text>
              <Text style={[s.doseUnit, { color: colors.textFaint }]}>units</Text>
            </View>
            <View style={[s.doseItem, s.doseItemBorder]}>
              <Text style={[s.doseNumber, s.doseTotalNumber, { color: colors.red }]}>
                {result?.total ?? '—'}
              </Text>
              <Text style={[s.doseLabel, { color: colors.textMuted }]}>Total</Text>
              <Text style={[s.doseUnit, { color: colors.textFaint }]}>units</Text>
            </View>
          </View>

          {/* Contextual warning banners */}
          {currentMgDl !== null && currentMgDl < 75 && (
            <View style={[s.warningBanner, { borderColor: '#e53935', backgroundColor: colors.lowBg }]}>
              <Text style={[s.warningText, { color: colors.low }]}>
                ⚠️ Blood sugar is low. Treat hypoglycemia before taking any insulin.
              </Text>
            </View>
          )}
          {currentMgDl !== null && currentMgDl > 250 && (
            <View style={[s.warningBanner, { borderColor: '#ef6c00', backgroundColor: colors.highBg }]}>
              <Text style={[s.warningText, { color: colors.high }]}>
                ⚠️ Blood sugar is high. Consider delaying food until levels improve.
              </Text>
            </View>
          )}

          <Text style={s.disclaimer}>
            ⚠️ Estimate only. Always confirm doses with your healthcare provider.
          </Text>
        </SectionCard>
      )}

      {/* Quick reference — always visible */}
      <SectionCard>
          <SectionTitle text="Quick Reference" />
          <View style={s.refRow}>
            <Text style={s.refEmoji}>🍬</Text>
            <View style={s.refText}>
              <Text style={[s.refTitle, { color: colors.text }]}>Low (&lt;75 mg/dL / &lt;4.2 mmol/L)</Text>
              <Text style={[s.refBody, { color: colors.textMuted }]}>Eat 15–20g fast carbs. Recheck in 15 min. Do not take insulin.</Text>
            </View>
          </View>
          <View style={s.refDivider} />
          <View style={s.refRow}>
            <Text style={s.refEmoji}>✅</Text>
            <View style={s.refText}>
              <Text style={[s.refTitle, { color: colors.text }]}>Normal (75–150 mg/dL / 4.2–8.3 mmol/L)</Text>
              <Text style={[s.refBody, { color: colors.textMuted }]}>On target. Take calculated dose with your meal.</Text>
            </View>
          </View>
          <View style={s.refDivider} />
          <View style={s.refRow}>
            <Text style={s.refEmoji}>💧</Text>
            <View style={s.refText}>
              <Text style={[s.refTitle, { color: colors.text }]}>High (&gt;150 mg/dL / &gt;8.3 mmol/L)</Text>
              <Text style={[s.refBody, { color: colors.textMuted }]}>Drink water, consider light activity. Apply correction dose as calculated.</Text>
            </View>
          </View>
          <View style={s.refDivider} />
          <View style={s.refRow}>
            <Text style={s.refEmoji}>🚨</Text>
            <View style={s.refText}>
              <Text style={[s.refTitle, { color: colors.text }]}>Very high (&gt;250 mg/dL / &gt;13.9 mmol/L)</Text>
              <Text style={[s.refBody, { color: colors.textMuted }]}>Check for ketones. Delay food. Contact your care team if levels persist.</Text>
            </View>
          </View>
        </SectionCard>
      </ScrollView>
  );
}

// ─── Tab: Log ─────────────────────────────────────────────────────────────────

function LogTab() {
  const { insulinEntries, addInsulinEntry, clearInsulinLog } = useGlucoseStore();
  const { colors } = useTheme();

  const [insulinType,    setInsulinType]    = useState<InsulinType>('Rapid-acting');
  const [units,          setUnits]          = useState(0);
  const [timeDate,       setTimeDate]       = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const handleAdd = () => {
    if (units <= 0) {
      Alert.alert('Missing info', 'Please set at least 1 unit.');
      return;
    }
    addInsulinEntry({ units, time: formatTime(timeDate), type: insulinType });
    setUnits(0);
    setTimeDate(new Date());
  };

  const handleClear = () => {
    Alert.alert(
      'Clear log',
      'Are you sure you want to delete all insulin log entries?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearInsulinLog },
      ],
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Entry form */}
      <SectionCard>
        <SectionTitle text="New Entry" />

        {/* Insulin type toggle */}
        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Insulin type</Text>
        <View style={s.typeRow}>
          {(['Rapid-acting', 'Long-acting'] as InsulinType[]).map((t) => {
            const active = insulinType === t;
            return (
              <TouchableOpacity
                key={t}
                style={[s.typePill, { borderColor: colors.red }, active && { backgroundColor: colors.red }]}
                onPress={() => setInsulinType(t)}
                activeOpacity={0.75}
              >
                <Text style={[s.typePillText, { color: colors.red }, active && s.typePillTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Units stepper */}
        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Units</Text>
        <View style={s.stepperRow}>
          <TouchableOpacity
            style={[s.stepperBtn, { borderColor: colors.red, backgroundColor: colors.red }]}
            onPress={() => setUnits((u) => Math.max(u - 1, 0))}
            activeOpacity={0.75}
          >
            <Text style={s.stepperBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={[s.stepperValue, { color: colors.text }]}>{units}</Text>
          <TouchableOpacity
            style={[s.stepperBtn, { borderColor: colors.red, backgroundColor: colors.red }]}
            onPress={() => setUnits((u) => u + 1)}
            activeOpacity={0.75}
          >
            <Text style={s.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Time picker */}
        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Time taken</Text>
        <TouchableOpacity
          style={[s.timeInput, s.timePickerBtn]}
          onPress={() => setShowTimePicker(true)}
          activeOpacity={0.75}
        >
          <Text style={[s.timePickerBtnText, { color: colors.text }]}>{formatTime(timeDate)}</Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={timeDate}
            mode="time"
            display="default"
            onChange={(event, date) => {
              setShowTimePicker(false);
              if (event.type === 'set' && date) setTimeDate(date);
            }}
          />
        )}

        <TouchableOpacity style={[s.addEntryBtn, { backgroundColor: colors.red }]} onPress={handleAdd} activeOpacity={0.75}>
          <Text style={s.addEntryBtnText}>Add to Log</Text>
        </TouchableOpacity>
      </SectionCard>

      {/* Log list */}
      <SectionCard>
        <View style={s.logHeader}>
          <SectionTitle text="Insulin Log" />
          {insulinEntries.length > 0 && (
            <TouchableOpacity onPress={handleClear} activeOpacity={0.75}>
              <Text style={[s.clearLogText, { color: colors.red }]}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {insulinEntries.length === 0 ? (
          <>
            <Text style={s.emptyLogText}>No entries yet. Add one above.</Text>
            <View style={[s.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[s.infoCardTitle, { color: colors.text }]}>📋 Why log your insulin?</Text>
              <View style={s.infoCardRow}>
                <Text style={[s.infoCardBullet, { color: colors.red }]}>•</Text>
                <Text style={[s.infoCardBody, { color: colors.textMuted }]}>Tracking doses over time helps you and your doctor spot patterns and adjust your regimen.</Text>
              </View>
              <View style={s.infoCardRow}>
                <Text style={[s.infoCardBullet, { color: colors.red }]}>•</Text>
                <Text style={[s.infoCardBody, { color: colors.textMuted }]}>Logging the time helps identify if a dose was missed or taken too late relative to a meal.</Text>
              </View>
              <View style={s.infoCardRow}>
                <Text style={[s.infoCardBullet, { color: colors.red }]}>•</Text>
                <Text style={[s.infoCardBody, { color: colors.textMuted }]}>Rapid-acting insulin typically peaks 1–3 hours after injection. Long-acting works over 12–24 hours.</Text>
              </View>
              <View style={s.infoCardRow}>
                <Text style={[s.infoCardBullet, { color: colors.red }]}>•</Text>
                <Text style={[s.infoCardBody, { color: colors.textMuted }]}>Never double-dose if you think you missed one — check your log first.</Text>
              </View>
            </View>
          </>
        ) : (
          [...insulinEntries].reverse().map((entry, idx) => (
            <View
              key={idx}
              style={[s.logRow, idx < insulinEntries.length - 1 && s.logRowBorder, { backgroundColor: colors.bgCard }]}
            >
              <View style={s.logLeft}>
                <Text style={[s.logType, { color: colors.text }]}>{entry.type}</Text>
                <Text style={[s.logTime, { color: colors.textMuted }]}>at {entry.time}</Text>
              </View>
              <Text style={[s.logUnits, { color: colors.red }]}>{entry.units}u</Text>
            </View>
          ))
        )}
      </SectionCard>
    </ScrollView>
  );
}

// ─── Tab: Reminders ───────────────────────────────────────────────────────────

function RemindersTab() {
  const { colors } = useTheme();
  const [reminders,   setReminders]  = useState<Reminder[]>([
    {
      id: '1', label: 'Morning rapid insulin', time: '08:00', type: 'Rapid-acting', active: true, units: 0
    },
    { id: '2', label: 'Evening long insulin',  time: '22:00', type: 'Long-acting',  units: 10, active: true  },
  ]);
  const [showForm,       setShowForm]      = useState(false);
  const [label,          setLabel]         = useState('');
  const [timeDate,       setTimeDate]      = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [rType,          setRType]         = useState<InsulinType>('Rapid-acting');
  const [rUnits,         setRUnits]        = useState(1);
  const [labelFocus,     setLabelFocus]    = useState(false);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const toggleActive = (id: string) =>
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );

  const deleteReminder = (id: string) =>
    setReminders((prev) => prev.filter((r) => r.id !== id));

  const handleAdd = () => {
    if (!label.trim()) {
      Alert.alert('Missing info', 'Please fill in a label.');
      return;
    }
    const newReminder: Reminder = {
      id:     Date.now().toString(),
      label:  label.trim(),
      time:   formatTime(timeDate),
      type:   rType,
      units:  rUnits,
      active: true,
    };
    setReminders((prev) => [...prev, newReminder]);
    setLabel(''); setTimeDate(new Date()); setRType('Rapid-acting'); setRUnits(1);
    setShowForm(false);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Info note */}
      <View style={[s.noteCard, { backgroundColor: colors.normalBg, borderColor: colors.border }]}>
        <Text style={s.noteText}>
          💡 Reminders are saved in-app only. For system notifications, enable them in your device settings.
        </Text>
      </View>

      {/* Reminders list */}
      {reminders.length === 0 && !showForm ? (
        <View style={[s.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={s.emptyIcon}>⏰</Text>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No reminders yet</Text>
          <Text style={[s.emptyText, { color: colors.textMuted }]}>Tap "Add Reminder" to create your first one.</Text>
        </View>
      ) : (
        reminders.map((r) => (
          <View key={r.id} style={[s.reminderCard, !r.active && s.reminderCardInactive, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={s.reminderLeft}>
              <Text style={[s.reminderLabel, { color: colors.text }, !r.active && s.reminderLabelInactive]}>
                {r.label}
              </Text>
              <Text style={[s.reminderSub, { color: colors.textMuted }]}>
                {r.time} · {r.type} · {r.units}u
              </Text>
            </View>
            <View style={s.reminderActions}>
              <TouchableOpacity
                style={[s.toggleBtn, r.active && [s.toggleBtnActive, { borderColor: colors.red }]]}
                onPress={() => toggleActive(r.id)}
                activeOpacity={0.75}
              >
                <Text style={[s.toggleBtnText, r.active && { color: colors.red }]}>
                  {r.active ? 'On' : 'Off'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => deleteReminder(r.id)}
                activeOpacity={0.75}
              >
                <Text style={s.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Add reminder form */}
      {showForm && (
        <SectionCard>
          <SectionTitle text="New Reminder" />

          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Label</Text>
          <TextInput
            style={[s.timeInput, labelFocus && { borderColor: colors.red }, { backgroundColor: colors.inputBg, color: colors.text }]}
            placeholder="e.g. Morning rapid insulin"
            placeholderTextColor="#aaa"
            value={label}
            onChangeText={setLabel}
            onFocus={() => setLabelFocus(true)}
            onBlur={() => setLabelFocus(false)}
            returnKeyType="done"
          />

          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Time</Text>
          <TouchableOpacity
            style={[s.timeInput, s.timePickerBtn]}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.75}
          >
            <Text style={[s.timePickerBtnText, { color: colors.text }]}>{formatTime(timeDate)}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={timeDate}
              mode="time"
              display="default"
              onChange={(event, date) => {
                setShowTimePicker(false);
                if (event.type === 'set' && date) setTimeDate(date);
              }}
            />
          )}

          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Insulin type</Text>
          <View style={s.typeRow}>
            {(['Rapid-acting', 'Long-acting'] as InsulinType[]).map((t) => {
              const active = rType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[s.typePill, { borderColor: colors.red }, active && { backgroundColor: colors.red }]}
                  onPress={() => setRType(t)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.typePillText, { color: colors.red }, active && s.typePillTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Units</Text>
          <View style={s.stepperRow}>
            <TouchableOpacity
              style={[s.stepperBtn, { borderColor: colors.red, backgroundColor: colors.red }]}
              onPress={() => setRUnits((u) => Math.max(u - 1, 1))}
              activeOpacity={0.75}
            >
              <Text style={s.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={[s.stepperValue, { color: colors.text }]}>{rUnits}</Text>
            <TouchableOpacity
              style={[s.stepperBtn, { borderColor: colors.red, backgroundColor: colors.red }]}
              onPress={() => setRUnits((u) => u + 1)}
              activeOpacity={0.75}
            >
              <Text style={s.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={s.formBtnRow}>
            <TouchableOpacity
              style={s.cancelFormBtn}
              onPress={() => setShowForm(false)}
              activeOpacity={0.75}
            >
              <Text style={[s.cancelFormBtnText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveFormBtn, { backgroundColor: colors.red, borderColor: colors.red }]}
              onPress={handleAdd}
              activeOpacity={0.75}
            >
              <Text style={s.saveFormBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>
      )}

      {!showForm && (
        <TouchableOpacity
          style={[s.addReminderBtn, { borderColor: colors.red }]}
          onPress={() => setShowForm(true)}
          activeOpacity={0.75}
        >
          <Text style={[s.addReminderBtnText, { color: colors.red }]}>+ Add Reminder</Text>
        </TouchableOpacity>
      )}

      {/* Notifications guide — always visible */}
      {!showForm && (
        <View style={[s.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[s.infoCardTitle, { color: colors.text }]}>🔔 Enable system notifications</Text>
          <Text style={[s.infoCardBody, { color: colors.textMuted }]}>
            DiabEasy reminders are stored in-app only. To receive actual notifications on your device, follow these steps:
          </Text>
          <View style={s.infoCardRow}>
            <Text style={s.infoCardBullet}>📱</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.infoCardLabel, { color: colors.text }]}>Android</Text>
              <Text style={[s.infoCardBody, { color: colors.textMuted }]}>Settings → Apps → DiabEasy → Notifications → Allow all</Text>
            </View>
          </View>
          <View style={s.infoCardRow}>
            <Text style={s.infoCardBullet}>🍎</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.infoCardLabel, { color: colors.text }]}>iOS</Text>
              <Text style={[s.infoCardBody, { color: colors.textMuted }]}>Settings → DiabEasy → Notifications → Allow Notifications</Text>
            </View>
          </View>
          <Text style={[s.infoCardBody, { marginTop: 8, color: colors.textFaint, fontStyle: 'italic' }]}>
            Push notification support will be added in a future update.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MedicationScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculator');

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'calculator', label: 'Calculator' },
    { key: 'log',        label: 'Insulin Log' },
    { key: 'reminders',  label: 'Reminders' },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <Text style={[s.title, { color: colors.text }]}>Medication</Text>

      {/* Tab bar */}
      <View style={[s.tabBar, { borderColor: colors.red }]}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tabBtn, { backgroundColor: active ? colors.red : colors.bg }]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabBtnText, { color: active ? '#fff' : colors.red }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab content */}
      <View style={[s.content, { backgroundColor: colors.bg }]}>
        {activeTab === 'calculator' && <CalculatorTab />}
        {activeTab === 'log'        && <LogTab />}
        {activeTab === 'reminders'  && <RemindersTab />}
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

  // Tab bar — 3 segments
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#EC5557',
    overflow: 'hidden', marginBottom: 4,
  },
  tabBtn:          { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabBtnActive:    {},
  tabBtnText:      { fontSize: 13, fontWeight: '600' },
  tabBtnTextActive:{ color: '#fff' },

  // Section card
  sectionCard: {
    borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0',
    backgroundColor: '#fafafa', padding: 14, marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#666666',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  // Info rows
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: '#666666' },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#222222' },
  divider:   { height: 1, backgroundColor: '#ececec', marginVertical: 6 },

  // Parameter display (read-only, from settings)
  paramGrid:        { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  paramReadItem:    { flex: 1, alignItems: 'center', paddingVertical: 6 },
  paramReadBorder:  { borderLeftWidth: 1, borderLeftColor: '#e0e0e0' },
  paramReadValue:   { fontSize: 18, fontWeight: '800', color: '#222222', marginBottom: 2 },
  paramReadLabel:   { fontSize: 10, color: '#666666', textAlign: 'center', lineHeight: 14 },
  paramRow:  { flexDirection: 'row', gap: 8 },
  paramItem: { flex: 1 },
  paramLabel:{ fontSize: 11, color: '#666666', marginBottom: 4, textAlign: 'center' },

  // Single target input (replaces three-column row)
  targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  targetSingleInput: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 6,
    paddingVertical: Platform.OS === 'ios' ? 7 : 5,
    paddingHorizontal: 16, fontSize: 16, fontWeight: '700',
    color: '#222222', textAlign: 'center', backgroundColor: '#ffffff', minWidth: 90,
  },

  paramHint: { fontSize: 12, color: '#666666', marginBottom: 10, lineHeight: 17 },

  paramInput: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 6,
    paddingVertical: Platform.OS === 'ios' ? 7 : 5,
    paddingHorizontal: 8, fontSize: 14, fontWeight: '700',
    color: '#222222', textAlign: 'center', backgroundColor: '#ffffff',
  },
  paramInputFocused: { borderColor: '#EC5557' },

  // Results may vary note
  resultsMayVary: { fontSize: 11, color: '#aaaaaa', marginBottom: 10, textAlign: 'center', fontStyle: 'italic' },

  // Quick reference card
  refRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  refEmoji:   { fontSize: 18, width: 26, textAlign: 'center', marginTop: 1 },
  refText:    { flex: 1 },
  refTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  refBody:  { fontSize: 12, lineHeight: 17 },
  refDivider: { height: 1, backgroundColor: '#ececec', marginVertical: 2 },

  // Dose result grid
  doseGrid: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 12,
  },
  doseItem:       { flex: 1, alignItems: 'center', paddingVertical: 8 },
  doseItemBorder: { borderLeftWidth: 1, borderLeftColor: '#e0e0e0' },
  doseNumber:     { fontSize: 22, fontWeight: '900', color: '#222222', marginBottom: 2 },
  doseTotalNumber:{ fontSize: 26 },
  doseLabel:      { fontSize: 11, color: '#666666', fontWeight: '500' },
  doseUnit:       { fontSize: 10, color: '#aaaaaa' },

  // Warning banners
  warningBanner: {
    borderRadius: 8, borderWidth: 1.5,
    padding: 10, marginBottom: 10,
  },
  warningText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  disclaimer: { fontSize: 11, color: '#aaaaaa', lineHeight: 16, textAlign: 'center' },

  // Empty states
  emptyCard:  {
    borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0',
    backgroundColor: '#fafafa', padding: 24, alignItems: 'center', marginBottom: 12,
  },
  emptyIcon:  { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#222222', marginBottom: 4 },
  emptyText:  { fontSize: 13, color: '#666666', textAlign: 'center', lineHeight: 20 },

  // Note card
  noteCard: {
    borderRadius: 10, borderWidth: 1, borderColor: '#dde8dd',
    padding: 12, marginBottom: 12,
  },
  noteText: { fontSize: 13, color: '#2e7d32', lineHeight: 18 },

  // Log form
  fieldLabel: { fontSize: 12, color: '#666666', fontWeight: '600', marginBottom: 6, marginTop: 10 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  typePill: {
    flex: 1, paddingVertical: 8, borderRadius: 6,
    borderWidth: 1.5, alignItems: 'center',
  },
  typePillActive:     {},
  typePillText:       { fontSize: 13, fontWeight: '600' },
  typePillTextActive: { color: '#fff' },

  stepperRow:    { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  stepperBtn:    {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnText:{ fontSize: 20, color: '#fff', lineHeight: 24 },
  stepperValue:  { fontSize: 22, fontWeight: '800', minWidth: 36, textAlign: 'center' },

  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  presetPill: {
    flex: 1, paddingVertical: 7, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center',
  },
  presetPillActive:     { borderColor: '#EC5557', backgroundColor: '#fff5f5' },
  presetPillText:       { fontSize: 13, fontWeight: '500', color: '#666666' },
  presetPillTextActive: { color: '#EC5557', fontWeight: '700' },

  timeInput: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 6,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    paddingHorizontal: 12, fontSize: 14,
    marginBottom: 4,
  },
  timeInputFocused: {},
  timePickerBtn:    { justifyContent: 'center' },
  timePickerBtnText:{ fontSize: 15, fontWeight: '700', color: '#222222' },

  addEntryBtn:     { borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  addEntryBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  // Log list
  logHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clearLogText:{ fontSize: 12, fontWeight: '600' },
  emptyLogText:{ fontSize: 13, color: '#aaaaaa', textAlign: 'center', paddingVertical: 12 },

  logRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  logRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  logLeft:      { flex: 1 },
  logType:      { fontSize: 13, fontWeight: '700' },
  logTime:      { fontSize: 12, marginTop: 1 },
  logUnits:     { fontSize: 18, fontWeight: '900' },

  // Reminders
  reminderCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0',
    backgroundColor: '#fafafa', padding: 14, marginBottom: 10,
  },
  reminderCardInactive: { opacity: 0.5 },
  reminderLeft:         { flex: 1, marginRight: 10 },
  reminderLabel:        { fontSize: 14, fontWeight: '700', color: '#222222', marginBottom: 3 },
  reminderLabelInactive:{ color: '#aaaaaa' },
  reminderSub:          { fontSize: 12, color: '#666666' },
  reminderActions:      { flexDirection: 'row', alignItems: 'center', gap: 8 },

  toggleBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 5, borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  toggleBtnActive:     { backgroundColor: 'transparent' },
  toggleBtnText:       { fontSize: 12, fontWeight: '700', color: '#aaaaaa' },
  toggleBtnTextActive: {},

  deleteBtn:     { padding: 4 },
  deleteBtnText: { fontSize: 15, color: '#e0e0e0', fontWeight: '700' },

  addReminderBtn:     {
    borderRadius: 8, paddingVertical: 11, alignItems: 'center',
    borderWidth: 1.5, marginBottom: 12,
  },
  addReminderBtnText: { fontSize: 14, fontWeight: '700' },

  // Info cards
  infoCard:      { borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fafafa', padding: 14, marginBottom: 12 },
  infoCardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  infoCardLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  infoCardRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  infoCardBullet:{ fontSize: 14, fontWeight: '800', marginTop: 1 },
  infoCardBody:  { fontSize: 12, lineHeight: 18 },

  formBtnRow:       { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelFormBtn:    { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center' },
  cancelFormBtnText:{ fontSize: 14, color: '#666666', fontWeight: '600' },
  saveFormBtn:      { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, alignItems: 'center' },
  saveFormBtnText:  { fontSize: 14, color: '#fff', fontWeight: '700' },
});