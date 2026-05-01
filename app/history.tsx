import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Platform, Dimensions, PanResponder, Alert, Modal,
} from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { PressBtn } from '../components/PressBtn';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGlucoseStore, GlucoseEntry, InsulinEntry, Unit } from '../store/glucoseStore';
import { fetchCaregiverHistory, fetchCaregiverInsulinLog } from '../utils/firestoreSync';import { useTheme } from '../context/AppContext';
import { useSubscription, FREE_HISTORY_DAYS } from '../hooks/useSubscription';
import { UpgradeModal } from '../components/UpgradeModal';
import Svg, { Polyline, Line, Text as SvgText, Circle, G, Path } from 'react-native-svg';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

type HistoryEntry = GlucoseEntry;

const statusIcon = (interpretation: string): string =>
  interpretation === 'Low' ? '↓' : interpretation === 'High' ? '↑' : '✓';

const getColorClass = (value: number, unit: string, lowMgdl = 70, highMgdl = 180): 'low' | 'normal' | 'high' => {
  const low  = unit === 'mmol/L' ? lowMgdl  / 18.0182 : lowMgdl;
  const high = unit === 'mmol/L' ? highMgdl / 18.0182 : highMgdl;
  if (value < low)  return 'low';
  if (value <= high) return 'normal';
  return 'high';
};

function LineChart({ data, colors }: { data: HistoryEntry[]; colors: any }) {
  const { settings } = useGlucoseStore();
  const W = Dimensions.get('window').width - 64;
  const H = 160;
  const PAD = { top: 16, bottom: 32, left: 44, right: 16 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  if (data.length < 2) return null;

  const Y_MIN = 0;
  const Y_MAX = 220;
  const Y_TICKS = [0, 50, 100, 150, 200];

  const toY = (val: number) =>
    PAD.top + chartH - (Math.min(Math.max(val, Y_MIN), Y_MAX) / Y_MAX) * chartH;

  const pts = data.map((e, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: toY(e.value),
    entry: e,
  }));

  const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const xLabelCount   = Math.min(5, data.length);
  const xLabelIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i / (xLabelCount - 1)) * (data.length - 1))
  );

  return (
    <Svg width={W} height={H}>
      {Y_TICKS.map((val) => {
        const y = toY(val);
        return (
          <G key={val}>
            <Line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke={colors.border} strokeWidth={1} strokeDasharray="3,3" />
            <SvgText x={PAD.left - 6} y={y + 4} fontSize={9} fill={colors.textMuted} textAnchor="end">
              {val === 200 ? '200+' : val}
            </SvgText>
          </G>
        );
      })}
      <Polyline points={polyPoints} fill="none" stroke={colors.red}
        strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => {
        const cls = getColorClass(p.entry.value, p.entry.unit, settings.glucoseLow, settings.glucoseHigh);
        const dotColor = cls === 'low' ? colors.low : cls === 'high' ? colors.high : colors.normal;
        return <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={dotColor} stroke={colors.bgCard} strokeWidth={1.5} />;
      })}
      {xLabelIndices.map((idx) => {
        const p = pts[idx];
        const ld = new Date(data[idx].timestamp);
        const label = `${String(ld.getDate()).padStart(2,'0')}/${String(ld.getMonth()+1).padStart(2,'0')}`;
        return (
          <SvgText key={idx} x={p.x} y={H - 6} fontSize={9} fill={colors.textMuted} textAnchor="middle">
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

function ExpandedLineChart({ data, colors }: { data: HistoryEntry[]; colors: any }) {
  const { settings } = useGlucoseStore();
  const screenW = Dimensions.get('window').width;
  const POINT_W = 56;
  const chartW_inner = Math.max(data.length * POINT_W, screenW - 64);
  const H = 240;
  const PAD = { top: 20, bottom: 52, left: 44, right: 20 };
  const totalW = PAD.left + chartW_inner + PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  if (data.length < 2) return null;

  const Y_MIN = 0;
  const Y_MAX = 220;
  const Y_TICKS = [0, 50, 100, 150, 200];

  const toY = (val: number) =>
    PAD.top + chartH - (Math.min(Math.max(val, Y_MIN), Y_MAX) / Y_MAX) * chartH;

  const pts = data.map((e, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW_inner,
    y: toY(e.value),
    entry: e,
  }));

  const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width={totalW} height={H}>
      {Y_TICKS.map((val) => {
        const y = toY(val);
        return (
          <G key={val}>
            <Line x1={PAD.left} y1={y} x2={totalW - PAD.right} y2={y}
              stroke={colors.border} strokeWidth={1} strokeDasharray="3,3" />
            <SvgText x={PAD.left - 6} y={y + 4} fontSize={9} fill={colors.textMuted} textAnchor="end">
              {val === 200 ? '200+' : val}
            </SvgText>
          </G>
        );
      })}
      <Polyline points={polyPoints} fill="none" stroke={colors.red}
        strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => {
        const cls = getColorClass(p.entry.value, p.entry.unit, settings.glucoseLow, settings.glucoseHigh);
        const dotColor = cls === 'low' ? colors.low : cls === 'high' ? colors.high : colors.normal;
        const ed   = new Date(p.entry.timestamp);
        const date = `${String(ed.getDate()).padStart(2,'0')}/${String(ed.getMonth()+1).padStart(2,'0')}`;
        const time = `${String(ed.getHours()).padStart(2,'0')}:${String(ed.getMinutes()).padStart(2,'0')}`;
        const baseY = H - PAD.bottom;
        return (
          <G key={i}>
            <Circle cx={p.x} cy={p.y} r={4} fill={dotColor} stroke={colors.bgCard} strokeWidth={1.5} />
            <SvgText x={p.x} y={baseY + 14} fontSize={9} fill={colors.textMuted} textAnchor="middle">{date}</SvgText>
            <SvgText x={p.x} y={baseY + 26} fontSize={9} fill={colors.textMuted} textAnchor="middle">{time}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function PieChart({ normal, high, low, colors }: { normal: number; high: number; low: number; colors: any }) {
  const total = normal + high + low;
  if (total === 0) return null;

  const W  = Dimensions.get('window').width - 64;
  const cx = W / 2, cy = 90, R = 70;

  const segments = [
    { value: normal, color: colors.normal, label: 'Normal' },
    { value: high,   color: colors.high,   label: 'High' },
    { value: low,    color: colors.low,    label: 'Low' },
  ].filter(s => s.value > 0);

  let currentAngle = -Math.PI / 2;
  const arcs = segments.map(seg => {
    const fraction   = seg.value / total;
    const startAngle = currentAngle;
    const endAngle   = currentAngle + fraction * 2 * Math.PI;
    currentAngle     = endAngle;

    const x1 = cx + R * Math.cos(startAngle), y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle),   y2 = cy + R * Math.sin(endAngle);
    const largeArc  = fraction > 0.5 ? 1 : 0;
    const midAngle  = startAngle + (endAngle - startAngle) / 2;
    const lx = cx + (R + 22) * Math.cos(midAngle);
    const ly = cy + (R + 22) * Math.sin(midAngle);

    const d = segments.length === 1
      ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx - R + 0.001} ${cy} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return { ...seg, d, lx, ly, fraction };
  });

  return (
    <View>
      <Svg width={W} height={cy * 2 + 40}>
        {arcs.map((arc, i) => (
          <G key={i}>
            <Path d={arc.d} fill={arc.color} opacity={0.9} />
          </G>
        ))}
        <Circle cx={cx} cy={cy} r={R * 0.42} fill={colors.bgCard} />
        <SvgText x={cx} y={cy - 6} fontSize={18} fontWeight="900" fill={colors.text} textAnchor="middle">{total}</SvgText>
        <SvgText x={cx} y={cy + 12} fontSize={9} fill={colors.textMuted} textAnchor="middle">readings</SvgText>
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
        {arcs.map((arc, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: arc.color }} />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{arc.label} ({arc.value})</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { history, removeEntry, insulinEntries, profile, settings, caregiverSession, setCaregiverSession } = useGlucoseStore();

  const [caregiverHistory, setCaregiverHistory] = useState<GlucoseEntry[]>([]);
  const [caregiverInsulin, setCaregiverInsulin] = useState<InsulinEntry[]>([]);

  // ── Fetch caregiver data using code (not patientUid) ──────────────────────
useEffect(() => {
  if (!caregiverSession) return;
  fetchCaregiverHistory(caregiverSession.code)
    .then(setCaregiverHistory)
    .catch(e => console.log('FETCH ERROR:', e?.code, e?.message));
  fetchCaregiverInsulinLog(caregiverSession.code)
    .then(setCaregiverInsulin)
    .catch(() => {});
}, [caregiverSession?.code]);

  const displayHistory = caregiverSession ? caregiverHistory : history;
  const displayInsulin = caregiverSession ? caregiverInsulin : insulinEntries;
  const { glucoseLow, glucoseHigh } = settings;
  const { colors, isDark } = useTheme();
  const { isPremium, canUseFullPdf, isTrialActive, hasUsedTrialPdf, markTrialPdfUsed } = useSubscription();
  const t = useTranslation();

  const fastingDisplayLabel = (value: string) => {
    const map: Record<string, string> = {
      'Fasting': t.fasting, 'Pre-meal': t.preMeal, 'Post-meal': t.postMeal,
      'Random': t.random, 'Bedtime': t.bedtime, 'Post-exercise': t.postExercise,
    };
    return map[value] ?? value;
  };

  const interpretationLabel = (interp: string) =>
    interp === 'Low' ? t.statusLow : interp === 'High' ? t.statusHigh : t.statusNormal;

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [filterMin,      setFilterMin]      = useState('');
  const [filterMax,      setFilterMax]      = useState('');
  const [unitFilter,     setUnitFilter]     = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker,   setShowToPicker]   = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [chartWindow,    setChartWindow]    = useState<7 | 14 | 20 | 'all'>(20);
  const [showWeekly,     setShowWeekly]     = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showUpgrade,    setShowUpgrade]    = useState(false);

  const readingsScrollRef       = useRef<ScrollView>(null);
  const readingsScrollYRef      = useRef(0);
  const readingsContentHRef     = useRef(0);
  const readingsContainerHRef   = useRef(320);
  const [readingsScrollY,    setReadingsScrollY]    = useState(0);
  const [readingsContentH,   setReadingsContentH]   = useState(0);
  const [readingsContainerH, setReadingsContainerH] = useState(320);

  const rThumbHRef       = useRef(60);
  const rMaxScrollYRef   = useRef(0);
  const thumbStartScrRef = useRef(0);

  const rThumbH   = readingsContentH > 0
    ? Math.max(28, (readingsContainerH / readingsContentH) * readingsContainerH)
    : readingsContainerH;
  const rMaxScrY  = Math.max(0, readingsContentH - readingsContainerH);
  const rThumbTop = rMaxScrY > 0
    ? (readingsScrollY / rMaxScrY) * (readingsContainerH - rThumbH)
    : 0;

  useEffect(() => { rThumbHRef.current     = rThumbH;   }, [rThumbH]);
  useEffect(() => { rMaxScrollYRef.current = rMaxScrY;  }, [rMaxScrY]);

  const thumbPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        thumbStartScrRef.current = readingsScrollYRef.current;
      },
      onPanResponderMove: (_, { dy }) => {
        const cH       = readingsContainerHRef.current;
        const tH       = rThumbHRef.current;
        const maxTrack = cH - tH;
        if (maxTrack <= 0) return;
        const newY = Math.max(0, Math.min(
          rMaxScrollYRef.current,
          thumbStartScrRef.current + (dy / maxTrack) * rMaxScrollYRef.current,
        ));
        readingsScrollRef.current?.scrollTo({ y: newY, animated: false });
      },
    })
  ).current;

  const clearFilters = () => {
    setShowFromPicker(false); setShowToPicker(false);
    setFilterDateFrom(''); setFilterDateTo('');
    setFilterMin(''); setFilterMax('');
    setUnitFilter(''); setFiltersApplied(false);
  };

  const filteredHistory: HistoryEntry[] = useMemo(() => {
    const toLocalDate = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    if (!filtersApplied) return displayHistory as HistoryEntry[];
    return (displayHistory as HistoryEntry[]).filter((entry) => {
      if (unitFilter && entry.unit !== unitFilter) return false;
      const entryDate = toLocalDate(entry.timestamp);
      if (filterDateFrom && filterDateTo) { if (!(entryDate >= filterDateFrom && entryDate <= filterDateTo)) return false; }
      else if (filterDateFrom) { if (entryDate < filterDateFrom) return false; }
      else if (filterDateTo)   { if (entryDate > filterDateTo)   return false; }
      if (filterMin && entry.value < parseFloat(filterMin)) return false;
      if (filterMax && entry.value > parseFloat(filterMax)) return false;
      return true;
    });
  }, [displayHistory, filtersApplied, unitFilter, filterDateFrom, filterDateTo, filterMin, filterMax]);

  const chartData = useMemo(() => {
    const reversed = [...filteredHistory].reverse();
    const capped = isPremium ? reversed : reversed.slice(-FREE_HISTORY_DAYS);
    if (chartWindow === 'all') return capped;
    return capped.slice(-chartWindow);
  }, [filteredHistory, chartWindow, isPremium]);

  const hasOlderData = useMemo(() => {
    if (isPremium || filteredHistory.length === 0) return false;
    const cutoff = Date.now() - FREE_HISTORY_DAYS * 86_400_000;
    return filteredHistory.some(e => new Date(e.timestamp).getTime() < cutoff);
  }, [filteredHistory, isPremium]);

  const pieNormal = filteredHistory.filter(e => e.interpretation === 'Normal').length;
  const pieHigh   = filteredHistory.filter(e => e.interpretation === 'High').length;
  const pieLow    = filteredHistory.filter(e => e.interpretation === 'Low').length;
  const totalReadings = filteredHistory.length;

  const avgGlucoseMgDl = useMemo(() => {
    if (totalReadings === 0) return null;
    return filteredHistory.reduce((s, e) => {
      const mgdl = e.unit === 'mmol/L' ? e.value * 18.0182 : e.value;
      return s + mgdl;
    }, 0) / totalReadings;
  }, [filteredHistory, totalReadings]);

  const tirPercent = totalReadings > 0
    ? Math.round((pieNormal / totalReadings) * 100)
    : null;

  const eHbA1c = avgGlucoseMgDl !== null
    ? ((avgGlucoseMgDl + 46.7) / 28.7).toFixed(1)
    : null;

  const weeklyAverages = useMemo(() => {
    if (filteredHistory.length === 0) return [];
    const weeks: Record<string, number[]> = {};
    filteredHistory.forEach(e => {
      const date = new Date(e.timestamp);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];
      const mgdl = e.unit === 'mmol/L' ? e.value * 18.0182 : e.value;
      if (!weeks[key]) weeks[key] = [];
      weeks[key].push(mgdl);
    });
    return Object.entries(weeks)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 8)
      .map(([weekStart, values]) => ({
        weekStart,
        avg: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
        count: values.length,
      }));
  }, [filteredHistory]);

  const UnitPill = ({ label, value }: { label: string; value: string }) => {
    const active = unitFilter === value;
    return (
      <TouchableOpacity
        onPress={() => setUnitFilter(value)}
        style={[styles.pill,
          active ? styles.primaryBtnShadow : null,
          { borderColor: colors.red, backgroundColor: active ? colors.red : 'transparent' },
        ]}
        activeOpacity={0.7}
      >
        <Text style={[styles.pillText, { color: active ? '#fff' : colors.red }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderEntry = (entry: GlucoseEntry) => {
    const status   = getColorClass(entry.value, entry.unit, glucoseLow, glucoseHigh);
    const barColor = status === 'low' ? colors.low : status === 'high' ? colors.high : colors.normal;
    const d = new Date(entry.timestamp);
    const date = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return (
      <View key={entry.id} style={[styles.historyItem, { backgroundColor: colors.bgSecondary, borderColor: colors.bgSecondary, borderBottomColor: barColor }]}>
        <View style={styles.entryRow}>
          <Text style={[styles.entryDate,  { color: colors.text }]}>{date}</Text>
          <Text style={[styles.entryTime,  { color: colors.textMuted }]}>{time}</Text>
          <Text style={[styles.entryValue, { color: colors.text }]}>{entry.value} {entry.unit}</Text>
          <Text style={[styles.entryBadge, { color: barColor }]}>{statusIcon(entry.interpretation)} {interpretationLabel(entry.interpretation)}</Text>
          {!caregiverSession && (
            <TouchableOpacity onPress={() => removeEntry(entry.id)} activeOpacity={0.7}>
              <Text style={[styles.deleteBtn, { color: colors.textMuted }]}>{t.delete}</Text>
            </TouchableOpacity>
          )}
        </View>
        {!!entry.fasting  && <Text style={[styles.fastingLabel, { color: colors.textMuted }]}>- {fastingDisplayLabel(entry.fasting)}</Text>}
        {!!entry.symptoms && <Text style={[styles.notes, { color: colors.textMuted }]}>{t.notes} {entry.symptoms}</Text>}
      </View>
    );
  };

  const inputStyle = [styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }];

  const exportPDF = async (basic: boolean = false) => {
    const toMgdL = (value: number, unit: Unit) => unit === 'mmol/L' ? value * 18.0182 : value;
    const sevenDaysAgo = Date.now() - 7 * 86_400_000;
    const pdfData = basic
      ? filteredHistory.filter(e => new Date(e.timestamp).getTime() >= sevenDaysAgo)
      : filteredHistory;

    const fmtInsulinDate = (e: { timestamp?: string }) => {
      if (!e.timestamp) return '-';
      const d = new Date(e.timestamp);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    };

    const fmtIso = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };
    const sorted    = [...filteredHistory];
    const dateFrom  = filterDateFrom ? fmtIso(filterDateFrom + 'T00:00:00') : (sorted.length > 0 ? fmtIso(sorted[sorted.length - 1].timestamp) : '-');
    const dateTo    = filterDateTo   ? fmtIso(filterDateTo   + 'T00:00:00') : (sorted.length > 0 ? fmtIso(sorted[0].timestamp) : '-');
    const genDate   = new Date().toLocaleDateString();
    const genTime   = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const mgdlValues  = pdfData.map(e => toMgdL(e.value, e.unit));
    const n           = mgdlValues.length;
    const avgMgdL     = n > 0 ? mgdlValues.reduce((s, v) => s + v, 0) / n : null;
    const eHbA1c      = avgMgdL !== null ? ((avgMgdL + 46.7) / 28.7).toFixed(1) : null;
    const variance    = avgMgdL !== null ? mgdlValues.reduce((s, v) => s + (v - avgMgdL) ** 2, 0) / n : null;
    const stdDev      = variance !== null ? Math.sqrt(variance).toFixed(1) : null;
    const cvPercent   = avgMgdL !== null && variance !== null
      ? ((Math.sqrt(variance) / avgMgdL) * 100).toFixed(1) : null;
    const cvStable    = cvPercent !== null && parseFloat(cvPercent) <= 36;
    const totalInsulin = displayInsulin.reduce((s, e) => s + e.units, 0);

    const total5    = n || 1;
    const veryLow   = mgdlValues.filter(v => v < 54).length;
    const low5      = mgdlValues.filter(v => v >= 54 && v < 70).length;
    const target5   = mgdlValues.filter(v => v >= 70 && v <= 180).length;
    const high5     = mgdlValues.filter(v => v > 180 && v <= 250).length;
    const veryHigh  = mgdlValues.filter(v => v > 250).length;
    const tirPct    = n > 0 ? ((target5 / total5) * 100).toFixed(0) : null;

    const tirBands = [
      { label: 'Very Low',  pct: +((veryLow  / total5) * 100).toFixed(0), color: '#b71c1c' },
      { label: 'Low',       pct: +((low5     / total5) * 100).toFixed(0), color: '#e53935' },
      { label: 'Target',    pct: +((target5  / total5) * 100).toFixed(0), color: '#2e7d32' },
      { label: 'High',      pct: +((high5    / total5) * 100).toFixed(0), color: '#ef6c00' },
      { label: 'Very High', pct: +((veryHigh / total5) * 100).toFixed(0), color: '#bf360c' },
    ];

    const svgTIRBar = (() => {
      if (n === 0) return '';
      const W = 560, barH = 28, legY = barH + 10, legH = 14, svgH = barH + legY + legH + 4;
      let x = 0;
      const segments = tirBands.map(b => {
        const w = (b.pct / 100) * W;
        const label = b.pct >= 6
          ? `<text x="${(x + w / 2).toFixed(1)}" y="${(barH / 2 + 5).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">${b.pct}%</text>`
          : '';
        const seg = `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${barH}" fill="${b.color}"/>${label}`;
        x += w;
        return seg;
      }).join('');
      const legend = tirBands.map((b, i) =>
        `<rect x="${i * 112}" y="${legY}" width="10" height="${legH}" fill="${b.color}" rx="2"/><text x="${i * 112 + 13}" y="${legY + 11}" font-size="8" fill="#555">${b.label} (${b.pct}%)</text>`
      ).join('');
      return `<svg width="${W}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">${segments}${legend}</svg>`;
    })();

    const CONTEXTS = ['Fasting', 'Pre-meal', 'Post-meal', 'Bedtime', 'Post-exercise', 'Random'];
    const contextRows = CONTEXTS.map((ctx, i) => {
      const entries = pdfData.filter(e => e.fasting === ctx);
      if (entries.length === 0) return '';
      const vals   = entries.map(e => toMgdL(e.value, e.unit));
      const avg    = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(0);
      const min    = Math.min(...vals).toFixed(0);
      const max    = Math.max(...vals).toFixed(0);
      const inRng  = vals.filter(v => v >= 70 && v <= 180).length;
      const tir    = ((inRng / vals.length) * 100).toFixed(0);
      const bg     = i % 2 === 0 ? '#ffffff' : '#f9f9f9';
      return `<tr style="background:${bg}"><td style="font-weight:600">${ctx}</td><td>${entries.length}</td><td style="font-weight:700;color:#ec5557">${avg}</td><td>${min}</td><td>${max}</td><td style="color:#2e7d32;font-weight:700">${tir}%</td></tr>`;
    }).filter(Boolean).join('');

    const chartEntries = [...pdfData].reverse();
    const svgLineChart = (() => {
      if (chartEntries.length < 2) return '';
      const W = 560, H = 150, padL = 44, padR = 12, padT = 12, padB = 32;
      const vals = chartEntries.map(e => e.value);
      const minV = Math.min(...vals), maxV = Math.max(...vals);
      const rng  = maxV - minV || 1;
      const xStep = (W - padL - padR) / (chartEntries.length - 1);
      const toX = (i: number) => padL + i * xStep;
      const toY = (v: number) => padT + (H - padT - padB) * (1 - (v - minV) / rng);
      const points  = chartEntries.map((e, i) => `${toX(i).toFixed(1)},${toY(e.value).toFixed(1)}`).join(' ');
      const dots    = chartEntries.map((e, i) => {
        const col = e.interpretation === 'Low' ? '#e53935' : e.interpretation === 'High' ? '#ef6c00' : '#2e7d32';
        return `<circle cx="${toX(i).toFixed(1)}" cy="${toY(e.value).toFixed(1)}" r="3" fill="${col}" stroke="#fff" stroke-width="1"/>`;
      }).join('');
      const xLabels = Array.from({ length: Math.min(6, chartEntries.length) }, (_, k) => {
        const idx = Math.round((k / (Math.min(6, chartEntries.length) - 1)) * (chartEntries.length - 1));
        const td = new Date(chartEntries[idx].timestamp);
        const lbl = `${String(td.getDate()).padStart(2,'0')}/${String(td.getMonth()+1).padStart(2,'0')}`;
        return `<text x="${toX(idx).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="7" fill="#999">${lbl}</text>`;
      }).join('');
      const yTicks = [minV, (minV + maxV) / 2, maxV].map(v =>
        `<line x1="${padL}" y1="${toY(v).toFixed(1)}" x2="${W - padR}" y2="${toY(v).toFixed(1)}" stroke="#f0f0f0" stroke-width="1"/><text x="${padL - 4}" y="${toY(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="7" fill="#999">${v.toFixed(0)}</text>`
      ).join('');
      return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${yTicks}<polyline points="${points}" fill="none" stroke="#ec5557" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}${xLabels}<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#ddd" stroke-width="1"/><line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#ddd" stroke-width="1"/></svg>`;
    })();

    const pdfPieNormal = pdfData.filter(e => e.interpretation === 'Normal').length;
    const pdfPieHigh   = pdfData.filter(e => e.interpretation === 'High').length;
    const pdfPieLow    = pdfData.filter(e => e.interpretation === 'Low').length;
    const svgPieChart = (() => {
      const total = pdfPieNormal + pdfPieHigh + pdfPieLow;
      if (total === 0) return '';
      const cx = 100, cy = 100, R = 75;
      const W = 420, H = cy * 2 + 20;
      const segs = [
        { value: pdfPieNormal, color: '#2e7d32', label: 'Normal' },
        { value: pdfPieHigh,   color: '#ef6c00', label: 'High'   },
        { value: pdfPieLow,    color: '#e53935', label: 'Low'    },
      ].filter(s => s.value > 0);
      let angle = -Math.PI / 2;
      const paths = segs.map(seg => {
        const fraction = seg.value / total;
        const start = angle;
        const end   = angle + fraction * 2 * Math.PI;
        angle = end;
        const x1 = (cx + R * Math.cos(start)).toFixed(2);
        const y1 = (cy + R * Math.sin(start)).toFixed(2);
        const x2 = (cx + R * Math.cos(end)).toFixed(2);
        const y2 = (cy + R * Math.sin(end)).toFixed(2);
        const large = fraction > 0.5 ? 1 : 0;
        const d = segs.length === 1
          ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx - R + 0.001} ${cy} Z`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
        return `<path d="${d}" fill="${seg.color}" opacity="0.9"/>`;
      }).join('');
      const legend = segs.map((seg, i) => {
        const lx = cx + R + 24;
        const ly = cy - (segs.length - 1) * 14 + i * 28;
        const pct = ((seg.value / total) * 100).toFixed(0);
        return `<rect x="${lx}" y="${ly - 8}" width="12" height="12" fill="${seg.color}" rx="2"/><text x="${lx + 16}" y="${ly + 2}" font-size="9" fill="#444">${seg.label}: ${seg.value} (${pct}%)</text>`;
      }).join('');
      const innerR = (R * 0.42).toFixed(0);
      return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${paths}<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="white"/><text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="18" font-weight="900" fill="#1a1a1a">${total}</text><text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="8" fill="#777">readings</text>${legend}</svg>`;
    })();

    const glucoseRows = [...pdfData].reverse().map((e, i) => {
      const bg  = i % 2 === 0 ? '#ffffff' : '#f7f7f7';
      const gd  = new Date(e.timestamp);
      const dp  = `${String(gd.getDate()).padStart(2,'0')}/${String(gd.getMonth()+1).padStart(2,'0')}/${gd.getFullYear()}`;
      const tp  = `${String(gd.getHours()).padStart(2,'0')}:${String(gd.getMinutes()).padStart(2,'0')}`;
      const col = e.interpretation === 'Low' ? '#e53935' : e.interpretation === 'High' ? '#ef6c00' : '#2e7d32';
      return `<tr style="background:${bg}"><td>${dp}</td><td>${tp}</td><td style="font-weight:700">${e.value} ${e.unit}</td><td style="color:${col};font-weight:700">${e.interpretation}</td><td>${e.fasting || '-'}</td><td>${e.symptoms || '-'}</td></tr>`;
    }).join('');

    const insulinRows = displayInsulin.map((e, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f7f7f7';
      return `<tr style="background:${bg}"><td>${fmtInsulinDate(e)}</td><td>${e.time}</td><td>${e.type}</td><td style="font-weight:700">${e.units}u</td></tr>`;
    }).join('');

    const css = `
      @page{size:A4 portrait;margin:22px 26px}
      body{font-family:Arial,sans-serif;color:#1a1a1a;font-size:11px;margin:0}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #ec5557;padding-bottom:10px;margin-bottom:14px}
      .hdr-title{font-size:22px;font-weight:900;color:#ec5557}
      .hdr-sub{font-size:10px;color:#777;margin-top:2px}
      .hdr-right{font-size:9px;color:#999;text-align:right;line-height:1.6}
      .patient{border:1px solid #e8e8e8;border-radius:8px;margin-bottom:14px;overflow:hidden}
      .patient-header{background:#ec5557;padding:6px 14px}
      .patient-header-text{font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.8px}
      .patient-body{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;background:#fff}
      .pf{padding:8px 14px;border-bottom:1px solid #f5f5f5;border-right:1px solid #f5f5f5}
      .pf-label{font-size:8px;color:#aaa;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px}
      .pf-value{font-size:12px;font-weight:700;color:#1a1a1a}
      .pf-empty{font-size:11px;font-weight:400;color:#ccc;font-style:italic}
      .metrics{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
      .mc{flex:1;min-width:82px;border:1px solid #e8e8e8;border-radius:8px;padding:8px 10px;background:#fff}
      .mv{font-size:20px;font-weight:900;line-height:1}
      .ml{font-size:8px;color:#777;margin-top:3px}
      .mr{font-size:7.5px;color:#bbb;margin-top:2px}
      .sec{font-size:11px;font-weight:700;color:#333;border-bottom:1.5px solid #ec5557;padding-bottom:3px;margin:14px 0 7px}
      .badge{display:inline-block;padding:1px 7px;border-radius:10px;font-size:8px;font-weight:700}
      .stable{background:#e8f5e9;color:#2e7d32}
      .unstable{background:#fff3e0;color:#e65100}
      table{width:100%;border-collapse:collapse;font-size:9px}
      th{background:#ec5557;color:#fff;padding:4px 6px;text-align:left;font-size:8.5px}
      td{padding:3px 6px;border-bottom:1px solid #f0f0f0}
      .ctx-th{background:#f5f5f5;color:#555;font-size:8.5px}
      .pg{page-break-before:always}
      .footer{margin-top:14px;font-size:7.5px;color:#ccc;text-align:center;border-top:1px solid #eee;padding-top:6px}
    `;

    const html = `<html><head><meta charset="utf-8"/><style>${css}</style></head><body>
      <div class="hdr">
        <div><div class="hdr-title">DiabEasy</div><div class="hdr-sub">Glucose Management Report${basic ? ' · Basic (7-day)' : ''}</div></div>
        <div class="hdr-right">Generated: ${genDate} at ${genTime}<br/>Period: ${dateFrom} — ${dateTo}<br/>${n} readings &nbsp;|&nbsp; ${totalInsulin}u insulin</div>
      </div>
      <div class="patient">
        <div class="patient-header"><span class="patient-header-text">Patient Information</span></div>
        <div class="patient-body">
          ${[
            { label: 'Full Name',         value: profile?.name,          placeholder: 'Not provided — update in Profile' },
            { label: 'Age',               value: profile?.age,           placeholder: 'Not provided' },
            { label: 'Diabetes Type',     value: profile?.diabetesType,  placeholder: 'Not specified' },
            { label: 'Diagnosis Date',    value: profile?.diagnosisDate, placeholder: 'Not provided' },
            { label: 'Physician',         value: profile?.doctorName,    placeholder: 'Not provided — update in Profile' },
            { label: 'Clinic / Hospital', value: profile?.clinicName,    placeholder: 'Not provided' },
          ].map(f => `<div class="pf"><div class="pf-label">${f.label}</div>${f.value ? `<div class="pf-value">${f.value}</div>` : `<div class="pf-empty">${f.placeholder}</div>`}</div>`).join('')}
        </div>
      </div>
      <div class="metrics">
        <div class="mc"><div class="mv" style="color:#ec5557">${avgMgdL !== null ? avgMgdL.toFixed(1) : '—'}</div><div class="ml">Avg Glucose (mg/dL)</div><div class="mr">Target: ${settings.targetGlucose} mg/dL</div></div>
        <div class="mc"><div class="mv" style="color:#1565c0">${eHbA1c ?? '—'}%</div><div class="ml">Est. HbA1c (ADAG)</div><div class="mr">Target: &lt;7.0%</div></div>
        <div class="mc"><div class="mv" style="color:#2e7d32">${tirPct ?? '—'}%</div><div class="ml">Time in Range</div><div class="mr">Target: &gt;70%</div></div>
        <div class="mc"><div class="mv" style="color:#555">${stdDev ?? '—'}</div><div class="ml">Std Deviation (mg/dL)</div><div class="mr">Target: &lt;${(settings.targetGlucose * 0.36).toFixed(0)}</div></div>
        <div class="mc"><div class="mv" style="color:#555">${cvPercent ?? '—'}%</div><div class="ml">Variability (CV%)</div><div class="mr"><span class="badge ${cvStable ? 'stable' : 'unstable'}">${cvPercent !== null ? (cvStable ? 'Stable ≤36%' : 'Unstable >36%') : '—'}</span></div></div>
        <div class="mc"><div class="mv" style="color:#555">${n}</div><div class="ml">Total Readings</div><div class="mr">${totalInsulin}u insulin logged</div></div>
      </div>
      ${!basic ? `
      <div class="sec">Time in Range</div>${svgTIRBar || '<p style="color:#aaa;font-size:10px">No data</p>'}
      ${contextRows ? `<div class="sec">Readings by Context</div><table><thead><tr class="ctx-th"><th class="ctx-th">Context</th><th class="ctx-th">Readings</th><th class="ctx-th">Avg (mg/dL)</th><th class="ctx-th">Min</th><th class="ctx-th">Max</th><th class="ctx-th">In Range</th></tr></thead><tbody>${contextRows}</tbody></table>` : ''}
      ${svgLineChart ? `<div class="sec">Glucose Trend</div>${svgLineChart}` : ''}
      ${svgPieChart ? `<div class="sec">Readings Breakdown</div>${svgPieChart}` : ''}
      ` : `<div style="border:1.5px dashed #ec5557;border-radius:8px;padding:10px 14px;margin:14px 0;text-align:center;color:#ec5557;font-size:10px;font-weight:700">📊 Charts &amp; analytics available in Premium</div>`}
      <div class="pg"></div>
      <div class="sec">Glucose Log</div>
      <table><thead><tr><th>Date</th><th>Time</th><th>Glucose</th><th>Status</th><th>Context</th><th>Notes</th></tr></thead>
      <tbody>${glucoseRows || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:10px;font-style:italic">No glucose data</td></tr>'}</tbody></table>
      ${insulinRows ? `<div class="sec" style="margin-top:14px">Insulin Log</div><table><thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Units</th></tr></thead><tbody>${insulinRows}</tbody></table>` : ''}
      <div class="footer">DiabEasy is a personal management aid, not a medical device. &nbsp;|&nbsp; Generated ${genDate} at ${genTime}</div>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Glucose Report' });
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert(t.exportFailed, t.exportFailedBody);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>{t.pastMeasurements}</Text>
      <Text style={[styles.filterHeading, { color: colors.text }]}>{t.filterValues}</Text>

      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>{t.fromDate}</Text>
          <TouchableOpacity style={[inputStyle, { justifyContent: 'center' }]} onPress={() => setShowFromPicker(true)}>
            <Text style={{ color: filterDateFrom ? colors.text : colors.placeholder, fontSize: 14 }}>{filterDateFrom || t.selectDate}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>{t.toDate}</Text>
          <TouchableOpacity style={[inputStyle, { justifyContent: 'center' }]} onPress={() => setShowToPicker(true)}>
            <Text style={{ color: filterDateTo ? colors.text : colors.placeholder, fontSize: 14 }}>{filterDateTo || t.selectDate}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showFromPicker && (
        <DateTimePicker value={filterDateFrom ? new Date(filterDateFrom) : new Date()} mode="date" display="calendar"
          onChange={(event, date) => { setShowFromPicker(false); if (event.type === 'set' && date) setFilterDateFrom(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`); }} />
      )}
      {showToPicker && (
        <DateTimePicker value={filterDateTo ? new Date(filterDateTo) : new Date()} mode="date" display="calendar"
          onChange={(event, date) => { setShowToPicker(false); if (event.type === 'set' && date) setFilterDateTo(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`); }} />
      )}

      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>{t.minValue}</Text>
          <TextInput style={inputStyle} placeholder={t.minPlaceholder} placeholderTextColor={colors.placeholder} keyboardType="decimal-pad" value={filterMin} onChangeText={setFilterMin} />
        </View>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>{t.maxValue}</Text>
          <TextInput style={inputStyle} placeholder={t.maxPlaceholder} placeholderTextColor={colors.placeholder} keyboardType="decimal-pad" value={filterMax} onChangeText={setFilterMax} />
        </View>
      </View>

      <Text style={[styles.filterLabel, styles.pillHeading, { color: colors.textMuted }]}>{t.filterByUnit}</Text>
      <View style={styles.pillRow}>
        <UnitPill label="mg/dL"  value="mg/dL" />
        <UnitPill label="mmol/L" value="mmol/L" />
        <UnitPill label={t.all}  value="" />
      </View>

      <View style={styles.filterBtnsRow}>
        <PressBtn onPress={clearFilters}
          style={[styles.filterActionBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]} activeOpacity={0.7}>
          <Text style={[styles.filterActionBtnText, { color: colors.red }]}>{t.clearFilters}</Text>
        </PressBtn>
        <PressBtn onPress={() => setFiltersApplied(true)}
          style={[styles.filterActionBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]} activeOpacity={0.7}>
          <Text style={[styles.filterActionBtnText, { color: colors.red }]}>{t.applyFilters}</Text>
        </PressBtn>
      </View>

      {canUseFullPdf ? (
        <PressBtn
          onPress={() => { exportPDF(false); if (isTrialActive && !hasUsedTrialPdf) markTrialPdfUsed(); }}
          style={[styles.clearBtn, { borderColor: colors.red, backgroundColor: colors.red }, styles.primaryBtnShadow]}
        >
          <Text style={[styles.clearBtnText, { color: '#fff' }]}>
            {t.exportFullPdf}{isTrialActive && !hasUsedTrialPdf ? ' ★' : ''}
          </Text>
        </PressBtn>
      ) : (
        <View>
          <PressBtn
            onPress={() => exportPDF(true)}
            style={[styles.clearBtn, { borderColor: colors.red, backgroundColor: colors.red }, styles.primaryBtnShadow]}
          >
            <Text style={[styles.clearBtnText, { color: '#fff' }]}>{t.exportBasicPdf}</Text>
          </PressBtn>
            {caregiverSession ? (
              <Text style={[styles.upgradeLinkText, { color: colors.textMuted, textAlign: 'center', marginBottom: 12 }]}>
                {profile.name || caregiverSession.patientName} needs to upgrade to Premium for full reports.
              </Text>
            ) : (
              <TouchableOpacity onPress={() => setShowUpgrade(true)} activeOpacity={0.75} style={styles.upgradeLink}>
                <Text style={[styles.upgradeLinkText, { color: colors.red }]}>{t.unlockFullReports}</Text>
              </TouchableOpacity>
            )}
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {displayHistory.length === 0 ? (
        <EmptyState icon="📋" title={t.noReadingsYet} subtitle={t.noReadingsSubtitle} />
      ) : filteredHistory.length === 0 ? (
        <EmptyState icon="🔍" title={t.noMatches} subtitle={t.noMatchesSubtitle} />
      ) : (
        <View style={{ maxHeight: 200, position: 'relative' }}>
          <ScrollView
            ref={readingsScrollRef}
            style={{ marginRight: rMaxScrY > 0 ? 12 : 0 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              readingsScrollYRef.current = y;
              setReadingsScrollY(y);
            }}
            onContentSizeChange={(_, h) => {
              readingsContentHRef.current = h;
              setReadingsContentH(h);
            }}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              readingsContainerHRef.current = h;
              setReadingsContainerH(h);
            }}
          >
            {[...filteredHistory].reverse().map((entry) => renderEntry(entry))}
          </ScrollView>

          {rMaxScrY > 0 && (
            <View style={{ position: 'absolute', right: 0, top: 0, width: 8, height: readingsContainerH }}>
              <View style={{
                position: 'absolute', right: 2, top: 0,
                width: 4, height: readingsContainerH,
                backgroundColor: colors.border, borderRadius: 2, opacity: 0.4,
              }} />
              <View
                {...thumbPan.panHandlers}
                style={{
                  position: 'absolute', right: 0,
                  top: rThumbTop, width: 8, height: rThumbH,
                  backgroundColor: colors.red, borderRadius: 4,
                }}
              />
            </View>
          )}
        </View>
      )}

      {totalReadings >= 2 && (
        <View style={[styles.chartCard, {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          shadowColor: isDark ? '#000' : '#6070a0',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.35 : 0.1,
          shadowRadius: 18,
          elevation: isDark ? 6 : 5,
        }]}>

          {totalReadings >= 3 && (
            <>
              <Text style={[styles.chartTitle, { color: colors.textMuted }]}>{t.keyMetrics}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: tirPercent !== null && tirPercent >= 70 ? colors.normal : tirPercent !== null && tirPercent >= 50 ? colors.high : colors.low }}>
                    {tirPercent ?? '-'}%
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 }}>{t.timeInRange}</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>{t.targetTirLabel}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: colors.border }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: eHbA1c !== null && parseFloat(eHbA1c) <= 7 ? colors.normal : eHbA1c !== null && parseFloat(eHbA1c) <= 8 ? colors.high : colors.low }}>
                    {eHbA1c ?? '-'}%
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 }}>{t.estHba1c}</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>{t.targetHba1cLabel}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, color: colors.textFaint, textAlign: 'center', paddingBottom: 8 }}>
                {t.basedOnReadings(totalReadings)}
              </Text>
              <View style={[styles.chartDivider, { backgroundColor: colors.border }]} />
            </>
          )}

          <Text style={[styles.chartTitle, { color: colors.textMuted, marginTop: 8 }]}>{t.glucoseOverTime}</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 8 }}>
            {([7, 14, 20, 'all'] as const).map((w) => (
              <TouchableOpacity
                key={String(w)}
                onPress={() => setChartWindow(w)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
                  borderWidth: 1.5, borderColor: colors.red,
                  backgroundColor: chartWindow === w ? colors.red : 'transparent',
                }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: chartWindow === w ? '#fff' : colors.red }}>
                  {w === 'all' ? t.all : `${t.last} ${w}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.chartSub, { color: colors.textFaint }]}>
            {t.showingReadings(chartData.length)}{hasOlderData ? t.lastDaysParens(FREE_HISTORY_DAYS) : ''}
          </Text>
          {hasOlderData && (
            <TouchableOpacity onPress={() => setShowUpgrade(true)} activeOpacity={0.75} style={[styles.chartLockBanner, { backgroundColor: colors.lowBg, borderColor: colors.red }]}>
              <Text style={[styles.chartLockText, { color: colors.red }]}>{t.olderDataLocked}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowChartModal(true)}
            style={{ alignSelf: 'flex-start', marginTop: 6, marginBottom: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1.5, borderColor: colors.red }}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.red }}>{t.expandChart}</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <LineChart data={chartData} colors={colors} />
          </View>
          <View style={styles.lineLegend}>
            {[{ label: t.statusLow, color: colors.low }, { label: t.statusNormal, color: colors.normal }, { label: t.statusHigh, color: colors.high }].map(l => (
              <View key={l.label} style={styles.lineLegendItem}>
                <View style={[styles.lineLegendDot, { backgroundColor: l.color }]} />
                <Text style={[styles.lineLegendText, { color: colors.textMuted }]}>{l.label}</Text>
              </View>
            ))}
          </View>

          <Modal visible={showChartModal} animationType="slide" transparent onRequestClose={() => setShowChartModal(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{t.glucoseOverTimeTitle}</Text>
                  <TouchableOpacity onPress={() => setShowChartModal(false)} activeOpacity={0.7}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.red }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <ExpandedLineChart data={chartData} colors={colors} />
                </ScrollView>
                <View style={[styles.lineLegend, { marginTop: 12 }]}>
                  {[{ label: t.statusLow, color: colors.low }, { label: t.statusNormal, color: colors.normal }, { label: t.statusHigh, color: colors.high }].map(l => (
                    <View key={l.label} style={styles.lineLegendItem}>
                      <View style={[styles.lineLegendDot, { backgroundColor: l.color }]} />
                      <Text style={[styles.lineLegendText, { color: colors.textMuted }]}>{l.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </Modal>

          <View style={[styles.chartDivider, { backgroundColor: colors.border }]} />

          <Text style={[styles.chartTitle, { color: colors.textMuted, marginTop: 8 }]}>{t.readingsBreakdown}</Text>
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <PieChart normal={pieNormal} high={pieHigh} low={pieLow} colors={colors} />
          </View>

          <View style={[styles.chartDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}
            onPress={() => setShowWeekly(v => !v)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chartTitle, { color: colors.textMuted }]}>{t.weeklyAverages}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{showWeekly ? t.collapseLabel : t.expandLabel}</Text>
          </TouchableOpacity>

          {showWeekly && (
            <View style={{ marginTop: 8 }}>
              {weeklyAverages.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 8 }}>
                  {t.notEnoughData}
                </Text>
              ) : (
                weeklyAverages.map((week, i) => {
                  const color = week.avg < 75 ? colors.low : week.avg <= 150 ? colors.normal : colors.high;
                  const label = week.avg < 75 ? t.statusLow : week.avg <= 150 ? t.statusNormal : t.statusHigh;
                  return (
                    <View key={i} style={{
                      flexDirection: 'row', justifyContent: 'space-between',
                      alignItems: 'center', paddingVertical: 8,
                      borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border,
                    }}>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        {t.weekOf} {week.weekStart.substring(5).replace('-', '/')}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>{t.weeklyReadingsCount(week.count)}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color }}>{week.avg} mg/dL</Text>
                      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      )}

      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />

      {caregiverSession && (
        <TouchableOpacity
          style={[styles.exitCaregiverBtn, { borderColor: colors.red }]}
          onPress={() => setCaregiverSession(null)}
          activeOpacity={0.8}
        >
          <Text style={[styles.exitCaregiverBtnText, { color: colors.red }]}>{t.exitCaregiverMode}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  contentContainer: { padding: 12, paddingBottom: 28 },
  title:            { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  filterHeading:    { fontSize: 15, marginBottom: 4, textAlign: 'center' },
  filterRow:        { flexDirection: 'row', gap: 12, marginBottom: 8 },
  filterGroup:      { flex: 1 },
  filterLabel:      { fontSize: 13, marginBottom: 4, textAlign: 'center' },
  filterInput:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 6 : 4, fontSize: 14, height: 36 },
  pillHeading:      { marginTop: 10, marginBottom: 6 },
  pillRow:          { flexDirection: 'row', gap: 10, marginBottom: 8, justifyContent: 'center' },
  pill:             { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 6, borderWidth: 1.5, minWidth: 72, alignItems: 'center' },
  pillText:         { fontSize: 14, fontWeight: '500' },
  filterBtnsRow:    { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 4 },
  filterActionBtn:  { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5, marginBottom: 12 },
  filterActionBtnText: { fontSize: 14, fontWeight: '500' },
  clearBtn:         { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5, marginBottom: 6 },
  clearBtnText:     { fontSize: 14, fontWeight: '500' },
  upgradeLink:      { alignItems: 'center', marginBottom: 10 },
  upgradeLinkText:  { fontSize: 13, fontWeight: '600' },
  chartLockBanner:  { borderRadius: 8, borderWidth: 1.5, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 6 },
  chartLockText:    { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  divider:          { height: 1, marginBottom: 10 },
  historyItem:      { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 4, borderWidth: 1, overflow: 'hidden', borderBottomWidth: 3 },
  entryRow:         { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  entryDate:        { fontSize: 13, fontWeight: '600' },
  entryTime:        { fontSize: 13 },
  entryValue:       { fontSize: 14, fontWeight: '700' },
  entryBadge:       { fontSize: 13, fontWeight: '600', marginLeft: 'auto' },
  fastingLabel:     { fontSize: 12, marginTop: 3 },
  notes:            { fontSize: 12, marginTop: 3, fontStyle: 'italic' },
  deleteBtn:        { fontSize: 13, fontWeight: '600', paddingHorizontal: 6 },
  exitCaregiverBtn:     { margin: 12, borderWidth: 1.5, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  exitCaregiverBtnText: { fontSize: 15, fontWeight: '700' },
  chartCard:        { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 12, marginBottom: 12, overflow: 'hidden' },
  chartTitle:       { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  chartSub:         { fontSize: 11, marginBottom: 4 },
  chartDivider:     { height: 1, marginVertical: 8 },
  lineLegend:       { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 },
  lineLegendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lineLegendDot:    { width: 8, height: 8, borderRadius: 4 },
  lineLegendText:   { fontSize: 11 },
  primaryBtnShadow: { shadowColor: '#7a1010', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.45, shadowRadius: 0, elevation: 4 },
  outlineBtnShadow: { shadowColor: '#000', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
});