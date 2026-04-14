import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Platform, Dimensions, PanResponder,
} from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { PressBtn } from '../components/PressBtn';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGlucoseStore, GlucoseEntry } from '../store/glucoseStore';
import { useTheme } from '../context/AppContext';
import Svg, { Polyline, Line, Text as SvgText, Circle, G, Path } from 'react-native-svg';
import React, { useState, useMemo, useRef, useEffect } from 'react';

type HistoryEntry = GlucoseEntry;

const statusIcon = (interpretation: string): string =>
  interpretation === 'Low' ? '↓' : interpretation === 'High' ? '↑' : '✓';

const getColorClass = (value: number, unit: string): 'low' | 'normal' | 'high' => {
  if (unit === 'mg/dL') {
    if (value < 75)   return 'low';
    if (value <= 150) return 'normal';
    return 'high';
  } else {
    if (value < 4.2)  return 'low';
    if (value <= 8.3) return 'normal';
    return 'high';
  }
};

function LineChart({ data, colors }: { data: HistoryEntry[]; colors: any }) {
  const W = Dimensions.get('window').width - 64;
  const H = 160;
  const PAD = { top: 16, bottom: 32, left: 44, right: 16 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  if (data.length < 2) return null;

  const values = data.map(e => e.value);
  const minV   = Math.min(...values);
  const maxV   = Math.max(...values);
  const range  = maxV - minV || 1;

  const pts = data.map((e, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top + chartH - ((e.value - minV) / range) * chartH,
    entry: e,
  }));

  const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks }, (_, i) => minV + (range / (yTicks - 1)) * i);
  const xLabelCount   = Math.min(5, data.length);
  const xLabelIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i / (xLabelCount - 1)) * (data.length - 1))
  );

  return (
    <Svg width={W} height={H}>
      {yTickVals.map((val, i) => {
        const y = PAD.top + chartH - ((val - minV) / range) * chartH;
        return (
          <G key={i}>
            <Line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke={colors.border} strokeWidth={1} strokeDasharray="3,3" />
            <SvgText x={PAD.left - 6} y={y + 4} fontSize={9} fill={colors.textMuted} textAnchor="end">
              {Math.round(val)}
            </SvgText>
          </G>
        );
      })}
      <Polyline points={polyPoints} fill="none" stroke={colors.red}
        strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => {
        const cls = getColorClass(p.entry.value, p.entry.unit);
        const dotColor = cls === 'low' ? colors.low : cls === 'high' ? colors.high : colors.normal;
        return <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={dotColor} stroke={colors.bgCard} strokeWidth={1.5} />;
      })}
      {xLabelIndices.map((idx) => {
        const p = pts[idx];
        const label = data[idx].timestamp.split(' ')[0].substring(0, 5);
        return (
          <SvgText key={idx} x={p.x} y={H - 6} fontSize={9} fill={colors.textMuted} textAnchor="middle">
            {label}
          </SvgText>
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
      <Svg width={W} height={cy * 2 + 20}>
        {arcs.map((arc, i) => (
          <G key={i}>
            <Path d={arc.d} fill={arc.color} opacity={0.9} />
            {arc.fraction > 0.08 && (
              <SvgText x={arc.lx} y={arc.ly} fontSize={10}
                fill={arc.color} textAnchor="middle" fontWeight="700">
                {arc.label}{'\n'}{arc.value}
              </SvgText>
            )}
          </G>
        ))}
        <Circle cx={cx} cy={cy} r={R * 0.42} fill={colors.bgCard} />
        <SvgText x={cx} y={cy - 6} fontSize={18} fontWeight="900" fill={colors.text} textAnchor="middle">{total}</SvgText>
        <SvgText x={cx} y={cy + 12} fontSize={9} fill={colors.textMuted} textAnchor="middle">readings</SvgText>
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 }}>
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
  const { history, removeEntry } = useGlucoseStore();
  const { colors, isDark } = useTheme();

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

  // ── Readings list custom red scrollbar ──────────────────────────────────────
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
  // ────────────────────────────────────────────────────────────────────────────

  const clearFilters = () => {
    setShowFromPicker(false); setShowToPicker(false);
    setFilterDateFrom(''); setFilterDateTo('');
    setFilterMin(''); setFilterMax('');
    setUnitFilter(''); setFiltersApplied(false);
  };

  const filteredHistory: HistoryEntry[] = useMemo(() => !filtersApplied
    ? (history as HistoryEntry[])
    : (history as HistoryEntry[]).filter((entry) => {
        if (unitFilter && entry.unit !== unitFilter) return false;
        const entryDate = entry.timestamp.split(' ')[0];
        const [d, m, y] = entryDate.split('/');
        const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        if (filterDateFrom && filterDateTo) { if (!(iso >= filterDateFrom && iso <= filterDateTo)) return false; }
        else if (filterDateFrom) { if (iso < filterDateFrom) return false; }
        else if (filterDateTo)   { if (iso > filterDateTo)   return false; }
        if (filterMin && entry.value < parseFloat(filterMin)) return false;
        if (filterMax && entry.value > parseFloat(filterMax)) return false;
        return true;
      }), [history, filtersApplied, unitFilter, filterDateFrom, filterDateTo, filterMin, filterMax]);

  const chartData = useMemo(() => {
    const reversed = [...filteredHistory].reverse();
    if (chartWindow === 'all') return reversed;
    return reversed.slice(-chartWindow);
  }, [filteredHistory, chartWindow]);

  const pieNormal = filteredHistory.filter(e => e.interpretation === 'Normal').length;
  const pieHigh   = filteredHistory.filter(e => e.interpretation === 'High').length;
  const pieLow    = filteredHistory.filter(e => e.interpretation === 'Low').length;
  const totalReadings = filteredHistory.length;

  const avgGlucoseMgDl = useMemo(() => {
    if (totalReadings === 0) return null;
    return filteredHistory.reduce((s, e) => {
      const mgdl = e.unit === 'mmol/L' ? e.value * 18 : e.value;
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
      const [d, m, y] = e.timestamp.split(' ')[0].split('/');
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];
      const mgdl = e.unit === 'mmol/L' ? e.value * 18 : e.value;
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

  const renderEntry = (entry: GlucoseEntry, index: number) => {
    const status   = getColorClass(entry.value, entry.unit);
    const barColor = status === 'low' ? colors.low : status === 'high' ? colors.high : colors.normal;
    const date = entry.timestamp.split(' ')[0];
    const time = entry.timestamp.split(' ')[1];
    return (
      <View key={index} style={[styles.historyItem, { backgroundColor: colors.bgSecondary, borderColor: colors.bgSecondary, borderBottomColor: barColor }]}>
        <View style={styles.entryRow}>
          <Text style={[styles.entryDate,  { color: colors.text }]}>{date}</Text>
          <Text style={[styles.entryTime,  { color: colors.textMuted }]}>{time}</Text>
          <Text style={[styles.entryValue, { color: colors.text }]}>{entry.value} {entry.unit}</Text>
          <Text style={[styles.entryBadge, { color: barColor }]}>{statusIcon(entry.interpretation)} {entry.interpretation}</Text>
          <TouchableOpacity onPress={() => { const realIndex = history.indexOf(entry); removeEntry(realIndex); }} activeOpacity={0.7}>
            <Text style={[styles.deleteBtn, { color: colors.textMuted }]}>Delete</Text>
          </TouchableOpacity>
        </View>
        {!!entry.fasting  && <Text style={[styles.fastingLabel, { color: colors.textMuted }]}>- {entry.fasting}</Text>}
        {!!entry.symptoms && <Text style={[styles.notes, { color: colors.textMuted }]}>Notes: {entry.symptoms}</Text>}
      </View>
    );
  };

  const inputStyle = [styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }];

  const exportPDF = async () => {
    const { insulinEntries, profile } = useGlucoseStore.getState();
    const allEvents: { timestamp: string; type: 'glucose' | 'insulin'; data: any }[] = [
      ...filteredHistory.map(e => ({ timestamp: e.timestamp, type: 'glucose' as const, data: e })),
      ...insulinEntries.map(e => ({ timestamp: e.time, type: 'insulin' as const, data: e })),
    ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const rows = allEvents.map((event, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f7f7f7';
      if (event.type === 'glucose') {
        const e = event.data;
        const color = e.interpretation === 'Low' ? '#e53935' : e.interpretation === 'High' ? '#ef6c00' : '#2e7d32';
        return `<tr style="background-color: ${bg}"><td>${e.timestamp.split(' ')[0]}</td><td>${e.timestamp.split(' ')[1]}</td><td style="font-weight:600">${e.value} ${e.unit}</td><td style="color:${color};font-weight:600">${e.interpretation}</td><td>${e.fasting || '-'}</td><td>${e.symptoms || '-'}</td><td style="color:#1565c0">-</td><td>-</td></tr>`;
      } else {
        const e = event.data;
        return `<tr style="background-color: ${bg}"><td>-</td><td>${e.time}</td><td style="color:#1565c0">-</td><td style="color:#1565c0">-</td><td>-</td><td>-</td><td style="color:#1565c0;font-weight:600">${e.type}</td><td style="color:#1565c0;font-weight:600">${e.units}u</td></tr>`;
      }
    }).join('');

    const avgGlucose   = filteredHistory.length > 0 ? (filteredHistory.reduce((s, e) => s + e.value, 0) / filteredHistory.length).toFixed(1) : '-';
    const inRange      = filteredHistory.filter(e => e.interpretation === 'Normal').length;
    const lows         = filteredHistory.filter(e => e.interpretation === 'Low').length;
    const highs        = filteredHistory.filter(e => e.interpretation === 'High').length;
    const totalInsulin = insulinEntries.reduce((s, e) => s + e.units, 0);
    const dateFrom     = filterDateFrom || (filteredHistory.length > 0 ? [...filteredHistory].reverse()[0].timestamp.split(' ')[0] : '-');
    const dateTo       = filterDateTo   || (filteredHistory.length > 0 ? filteredHistory[0].timestamp.split(' ')[0] : '-');

    const chartEntries = [...filteredHistory].reverse().slice(-20);
    const svgLineChart = (() => {
      if (chartEntries.length < 2) return '';
      const W = 620, H = 160, padL = 48, padR = 16, padT = 14, padB = 36;
      const vals = chartEntries.map(e => e.value);
      const minV = Math.min(...vals), maxV = Math.max(...vals);
      const range = maxV - minV || 1;
      const xStep = (W - padL - padR) / (chartEntries.length - 1);
      const toX = (i: number) => padL + i * xStep;
      const toY = (v: number) => padT + (H - padT - padB) * (1 - (v - minV) / range);
      const points = chartEntries.map((e, i) => `${toX(i).toFixed(1)},${toY(e.value).toFixed(1)}`).join(' ');
      const dots = chartEntries.map((e, i) => {
        const col = e.interpretation === 'Low' ? '#e53935' : e.interpretation === 'High' ? '#ef6c00' : '#2e7d32';
        return `<circle cx="${toX(i).toFixed(1)}" cy="${toY(e.value).toFixed(1)}" r="4" fill="${col}" stroke="#fff" stroke-width="1.5"/>`;
      }).join('');
      const xLabels = Array.from({ length: Math.min(5, chartEntries.length) }, (_, k) => {
        const idx = Math.round((k / (Math.min(5, chartEntries.length) - 1)) * (chartEntries.length - 1));
        const label = chartEntries[idx].timestamp.split(' ')[0].substring(0, 5);
        return `<text x="${toX(idx).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="8" fill="#888">${label}</text>`;
      }).join('');
      const yTicks = [minV, (minV + maxV) / 2, maxV].map(v =>
        `<text x="${padL - 6}" y="${toY(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="8" fill="#888">${v.toFixed(0)}</text><line x1="${padL}" y1="${toY(v).toFixed(1)}" x2="${W - padR}" y2="${toY(v).toFixed(1)}" stroke="#eee" stroke-width="1"/>`
      ).join('');
      return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${yTicks}<polyline points="${points}" fill="none" stroke="#ec5557" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}${xLabels}<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#ddd" stroke-width="1"/><line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#ddd" stroke-width="1"/></svg>`;
    })();

    const svgPieChart = (() => {
      const slices = [
        { label: 'Normal', count: inRange, color: '#2e7d32' },
        { label: 'High',   count: highs,   color: '#ef6c00' },
        { label: 'Low',    count: lows,    color: '#e53935' },
      ].filter(s => s.count > 0);
      if (slices.length === 0) return '';
      const total = slices.reduce((s, d) => s + d.count, 0);
      const cx = 100, cy = 100, R = 80, innerR = R * 0.42;
      let angle = -Math.PI / 2;
      const paths = slices.map(s => {
        const frac = s.count / total;
        const a1 = angle, a2 = angle + frac * 2 * Math.PI;
        angle = a2;
        const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
        const large = frac > 0.5 ? 1 : 0;
        const d = slices.length === 1
          ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx - R + 0.001} ${cy} Z`
          : `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
        return `<path d="${d}" fill="${s.color}" opacity="0.9"/>`;
      }).join('');
      const legend = slices.map((s, i) =>
        `<rect x="215" y="${20 + i * 24}" width="12" height="12" fill="${s.color}" rx="2"/><text x="232" y="${31 + i * 24}" font-size="11" fill="#444">${s.label}: ${s.count} (${((s.count/total)*100).toFixed(0)}%)</text>`
      ).join('');
      return `<svg width="380" height="200" xmlns="http://www.w3.org/2000/svg">${paths}<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#fff"/><text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="18" font-weight="900" fill="#222">${total}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="9" fill="#888">readings</text>${legend}</svg>`;
    })();

    const html = `<html><head><style>@page{size:A4 portrait;margin:20px 24px}body{font-family:Arial,sans-serif;color:#222;font-size:11px}h1{color:#ec5557;font-size:20px;margin-bottom:2px}h2{color:#444;font-size:13px;font-weight:600;margin:16px 0 6px;border-bottom:2px solid #ec5557;padding-bottom:3px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#ec5557;color:#fff;padding:4px 5px;text-align:left;font-size:9px}td{padding:3px 5px;border-bottom:1px solid #eee}.sb{border:1px solid #e0e0e0;border-radius:6px;padding:5px 8px;text-align:center;min-width:62px}.sn{font-size:16px;font-weight:bold;color:#ec5557}.sl{font-size:8px;color:#666}.footer{margin-top:20px;font-size:9px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:8px}</style></head><body><h1>DiabEasy - Glucose Report</h1><div style="color:#888;font-size:10px;margin-bottom:4px">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><div style="font-size:11px;color:#444;margin-bottom:14px">${profile?.name ? `<strong>Patient:</strong> ${profile.name} &nbsp;|&nbsp;` : ''}<strong>Period:</strong> ${dateFrom} - ${dateTo}</div><div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px"><div class="sb"><div class="sn">${filteredHistory.length}</div><div class="sl">Total Readings</div></div><div class="sb"><div class="sn" style="color:#2e7d32">${avgGlucose}</div><div class="sl">Average</div></div><div class="sb"><div class="sn" style="color:#2e7d32">${inRange}</div><div class="sl">In Range</div></div><div class="sb"><div class="sn" style="color:#e53935">${lows}</div><div class="sl">Lows</div></div><div class="sb"><div class="sn" style="color:#ef6c00">${highs}</div><div class="sl">Highs</div></div><div class="sb"><div class="sn" style="color:#1565c0">${totalInsulin}u</div><div class="sl">Total Insulin</div></div><div class="sb"><div class="sn" style="color:#2e7d32">${tirPercent ?? '-'}%</div><div class="sl">Time in Range</div></div><div class="sb"><div class="sn" style="color:#1565c0">${eHbA1c ?? '-'}%</div><div class="sl">Est. HbA1c</div></div></div>${svgLineChart ? `<h2>Glucose Trend</h2>${svgLineChart}` : ''}${svgPieChart ? `<h2>Readings Breakdown</h2>${svgPieChart}` : ''}<h2>Health Log</h2><table><thead><tr><th>Date</th><th>Time</th><th>Glucose</th><th>Status</th><th>Reading Type</th><th>Notes</th><th>Insulin Type</th><th>Insulin Dose</th></tr></thead><tbody>${rows.length > 0 ? rows : '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:10px;font-style:italic">No data recorded</td></tr>'}</tbody></table><div class="footer">DiabEasy is a personal management aid and not a medical device. Always confirm treatment decisions with your healthcare provider.</div></body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Glucose Report' });
    } catch (error) { console.error('PDF export error:', error); }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>Past Measurements</Text>
      <Text style={[styles.filterHeading, { color: colors.text }]}>Filter values</Text>

      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>From Date</Text>
          <TouchableOpacity style={[inputStyle, { justifyContent: 'center' }]} onPress={() => setShowFromPicker(true)}>
            <Text style={{ color: filterDateFrom ? colors.text : colors.placeholder, fontSize: 14 }}>{filterDateFrom || 'Select date'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>To Date</Text>
          <TouchableOpacity style={[inputStyle, { justifyContent: 'center' }]} onPress={() => setShowToPicker(true)}>
            <Text style={{ color: filterDateTo ? colors.text : colors.placeholder, fontSize: 14 }}>{filterDateTo || 'Select date'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showFromPicker && (
        <DateTimePicker value={filterDateFrom ? new Date(filterDateFrom) : new Date()} mode="date" display="calendar"
          onChange={(event, date) => { setShowFromPicker(false); if (event.type === 'set' && date) setFilterDateFrom(date.toISOString().split('T')[0]); }} />
      )}
      {showToPicker && (
        <DateTimePicker value={filterDateTo ? new Date(filterDateTo) : new Date()} mode="date" display="calendar"
          onChange={(event, date) => { setShowToPicker(false); if (event.type === 'set' && date) setFilterDateTo(date.toISOString().split('T')[0]); }} />
      )}

      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Min Value</Text>
          <TextInput style={inputStyle} placeholder="Min" placeholderTextColor={colors.placeholder} keyboardType="decimal-pad" value={filterMin} onChangeText={setFilterMin} />
        </View>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Max Value</Text>
          <TextInput style={inputStyle} placeholder="Max" placeholderTextColor={colors.placeholder} keyboardType="decimal-pad" value={filterMax} onChangeText={setFilterMax} />
        </View>
      </View>

      <Text style={[styles.filterLabel, styles.pillHeading, { color: colors.textMuted }]}>Filter by measuring unit:</Text>
      <View style={styles.pillRow}>
        <UnitPill label="mg/dL"  value="mg/dL" />
        <UnitPill label="mmol/L" value="mmol/L" />
        <UnitPill label="All"    value="" />
      </View>

      <View style={styles.filterBtnsRow}>
        <PressBtn onPress={clearFilters}
          style={[styles.filterActionBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]} activeOpacity={0.7}>
          <Text style={[styles.filterActionBtnText, { color: colors.red }]}>Clear Filters</Text>
        </PressBtn>
        <PressBtn onPress={() => setFiltersApplied(true)}
          style={[styles.filterActionBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]} activeOpacity={0.7}>
          <Text style={[styles.filterActionBtnText, { color: colors.red }]}>Apply Filters</Text>
        </PressBtn>
      </View>

      <PressBtn
        onPress={exportPDF}
        style={[styles.clearBtn, { borderColor: colors.red, backgroundColor: colors.red }, styles.primaryBtnShadow]}
      >
        <Text style={[styles.clearBtnText, { color: '#fff' }]}>Export PDF Report</Text>
      </PressBtn>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {history.length === 0 ? (
        <EmptyState icon="📋" title="No readings yet" subtitle="Submit a glucose value on the Home tab to start your history." />
      ) : filteredHistory.length === 0 ? (
        <EmptyState icon="🔍" title="No matches" subtitle="No entries match your current filter criteria." />
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
            {filteredHistory.map((entry, index) => renderEntry(entry, index))}
          </ScrollView>

          {rMaxScrY > 0 && (
            <View style={{ position: 'absolute', right: 0, top: 0, width: 8, height: readingsContainerH }}>
              {/* Track */}
              <View style={{
                position: 'absolute', right: 2, top: 0,
                width: 4, height: readingsContainerH,
                backgroundColor: colors.border, borderRadius: 2, opacity: 0.4,
              }} />
              {/* Thumb */}
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
              <Text style={[styles.chartTitle, { color: colors.textMuted }]}>KEY METRICS</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: tirPercent !== null && tirPercent >= 70 ? colors.normal : tirPercent !== null && tirPercent >= 50 ? colors.high : colors.low }}>
                    {tirPercent ?? '-'}%
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 }}>Time in Range</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>Target: 70%+</Text>
                </View>
                <View style={{ width: 1, backgroundColor: colors.border }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: eHbA1c !== null && parseFloat(eHbA1c) <= 7 ? colors.normal : eHbA1c !== null && parseFloat(eHbA1c) <= 8 ? colors.high : colors.low }}>
                    {eHbA1c ?? '-'}%
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 }}>Est. HbA1c</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>Target: below 7%</Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, color: colors.textFaint, textAlign: 'center', paddingBottom: 8 }}>
                Based on {totalReadings} readings. Estimates only - confirm with a lab test.
              </Text>
              <View style={[styles.chartDivider, { backgroundColor: colors.border }]} />
            </>
          )}

          <Text style={[styles.chartTitle, { color: colors.textMuted, marginTop: 8 }]}>GLUCOSE OVER TIME</Text>

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
                  {w === 'all' ? 'All' : `Last ${w}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.chartSub, { color: colors.textFaint }]}>
            Showing {chartData.length} reading{chartData.length !== 1 ? 's' : ''}
          </Text>
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <LineChart data={chartData} colors={colors} />
          </View>
          <View style={styles.lineLegend}>
            {[{ label: 'Low', color: colors.low }, { label: 'Normal', color: colors.normal }, { label: 'High', color: colors.high }].map(l => (
              <View key={l.label} style={styles.lineLegendItem}>
                <View style={[styles.lineLegendDot, { backgroundColor: l.color }]} />
                <Text style={[styles.lineLegendText, { color: colors.textMuted }]}>{l.label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.chartDivider, { backgroundColor: colors.border }]} />

          <Text style={[styles.chartTitle, { color: colors.textMuted, marginTop: 8 }]}>READINGS BREAKDOWN</Text>
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <PieChart normal={pieNormal} high={pieHigh} low={pieLow} colors={colors} />
          </View>

          <View style={[styles.chartDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}
            onPress={() => setShowWeekly(v => !v)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chartTitle, { color: colors.textMuted }]}>WEEKLY AVERAGES</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{showWeekly ? 'collapse' : 'expand'}</Text>
          </TouchableOpacity>

          {showWeekly && (
            <View style={{ marginTop: 8 }}>
              {weeklyAverages.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 8 }}>
                  Not enough data.
                </Text>
              ) : (
                weeklyAverages.map((week, i) => {
                  const color = week.avg < 75 ? colors.low : week.avg <= 150 ? colors.normal : colors.high;
                  const label = week.avg < 75 ? 'Low' : week.avg <= 150 ? 'Normal' : 'High';
                  return (
                    <View key={i} style={{
                      flexDirection: 'row', justifyContent: 'space-between',
                      alignItems: 'center', paddingVertical: 8,
                      borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border,
                    }}>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        Week of {week.weekStart.substring(5).replace('-', '/')}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>{week.count} readings</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  title:            { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  filterHeading:    { fontSize: 15, marginBottom: 4, textAlign: 'center' },
  filterRow:        { flexDirection: 'row', gap: 12, marginBottom: 12 },
  filterGroup:      { flex: 1 },
  filterLabel:      { fontSize: 13, marginBottom: 4, textAlign: 'center' },
  filterInput:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 6, fontSize: 14, height: 42 },
  pillHeading:      { marginTop: 12, marginBottom: 8 },
  pillRow:          { flexDirection: 'row', gap: 10, marginBottom: 12, justifyContent: 'center' },
  pill:             { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5, minWidth: 72, alignItems: 'center' },
  pillText:         { fontSize: 14, fontWeight: '500' },
  filterBtnsRow:    { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8 },
  filterActionBtn:  { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5, marginBottom: 16 },
  filterActionBtnText: { fontSize: 14, fontWeight: '500' },
  clearBtn:         { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5, marginBottom: 16 },
  clearBtnText:     { fontSize: 14, fontWeight: '500' },
  divider:          { height: 1, marginBottom: 16 },
  historyItem:      { borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 6, borderWidth: 1, overflow: 'hidden', borderBottomWidth: 3 },
  entryRow:         { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  entryDate:        { fontSize: 13, fontWeight: '600' },
  entryTime:        { fontSize: 13 },
  entryValue:       { fontSize: 14, fontWeight: '700' },
  entryBadge:       { fontSize: 13, fontWeight: '600', marginLeft: 'auto' },
  fastingLabel:     { fontSize: 12, marginTop: 4 },
  notes:            { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  deleteBtn:        { fontSize: 13, fontWeight: '600', paddingHorizontal: 6 },
  chartCard:        { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 16, marginBottom: 16, overflow: 'hidden' },
  chartTitle:       { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  chartSub:         { fontSize: 11, marginBottom: 4 },
  chartDivider:     { height: 1, marginVertical: 12 },
  lineLegend:       { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 },
  lineLegendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lineLegendDot:    { width: 8, height: 8, borderRadius: 4 },
  lineLegendText:   { fontSize: 11 },
  primaryBtnShadow: { shadowColor: '#7a1010', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.45, shadowRadius: 0, elevation: 4 },
  outlineBtnShadow: { shadowColor: '#000', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
});