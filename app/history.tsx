import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGlucoseStore, GlucoseEntry } from '../store/glucoseStore';
import { useTheme } from '../context/AppContext';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import React, { useState, useMemo } from 'react';

type HistoryEntry = GlucoseEntry;

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

const getInterpretation = (value: number, unit: string): string => {
  if (unit === 'mg/dL') {
    if (value < 75)   return 'Low';
    if (value <= 150) return 'Normal';
    return 'High';
  } else {
    if (value < 4.2)  return 'Low';
    if (value <= 8.3) return 'Normal';
    return 'High';
  }
};

export default function HistoryScreen() {
  const { history, removeEntry } = useGlucoseStore();
  const { colors } = useTheme();

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [filterMin,      setFilterMin]      = useState('');
  const [filterMax,      setFilterMax]      = useState('');
  const [unitFilter,     setUnitFilter]     = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker,   setShowToPicker]   = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);

  const clearFilters = () => {
    setShowFromPicker(false); setShowToPicker(false);
    setFilterDateFrom(''); setFilterDateTo('');
    setFilterMin(''); setFilterMax('');
    setUnitFilter(''); setFiltersApplied(false);
  };

  const filteredHistory = !filtersApplied ? (history as HistoryEntry[]) : (history as HistoryEntry[]).filter((entry) => {
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
  });

  const UnitPill = ({ label, value }: { label: string; value: string }) => {
    const active = unitFilter === value;
    return (
      <TouchableOpacity
        onPress={() => setUnitFilter(value)}
        style={[styles.pill, { borderColor: colors.red }, active && { backgroundColor: colors.red }]}
        activeOpacity={0.7}
      >
        <Text style={[styles.pillText, { color: active ? '#fff' : colors.red }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderEntry = (entry: GlucoseEntry, index: number) => {
    const status    = getColorClass(entry.value, entry.unit);
    const barColor  = status === 'low' ? colors.low : status === 'high' ? colors.high : colors.normal;
    const date = entry.timestamp.split(' ')[0];
    const time = entry.timestamp.split(' ')[1];
    return (
      <View key={index} style={[styles.historyItem, { backgroundColor: colors.bgSecondary, borderColor: colors.bgSecondary, borderBottomColor: barColor }]}>
        <View style={styles.entryRow}>
          <Text style={[styles.entryDate,  { color: colors.text }]}>{date}</Text>
          <Text style={[styles.entryTime,  { color: colors.textMuted }]}>{time}</Text>
          <Text style={[styles.entryValue, { color: colors.text }]}>{entry.value} {entry.unit}</Text>
          <Text style={[styles.entryBadge, { color: barColor }]}>{entry.interpretation}</Text>
          <TouchableOpacity onPress={() => { const realIndex = history.indexOf(entry); removeEntry(realIndex); }} activeOpacity={0.7}>
            <Text style={[styles.deleteBtn, { color: colors.textMuted }]}>Delete</Text>
          </TouchableOpacity>
        </View>
        {!!entry.fasting  && <Text style={[styles.fastingLabel, { color: colors.textMuted }]}>– {entry.fasting}</Text>}
        {!!entry.symptoms && <Text style={[styles.notes, { color: colors.textMuted }]}>Notes: {entry.symptoms}</Text>}
      </View>
    );
  };

  const inputStyle = [styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }];

  const exportPDF = async () => {
    const { insulinEntries, profile } = useGlucoseStore.getState();

    // Build a unified timeline merging glucose + insulin entries
    const allEvents: { timestamp: string; type: 'glucose' | 'insulin'; data: any }[] = [
      ...filteredHistory.map(e => ({ timestamp: e.timestamp, type: 'glucose' as const, data: e })),
      ...insulinEntries.map(e => ({ timestamp: e.time, type: 'insulin' as const, data: e })),
    ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const rows = allEvents.map((event, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f7f7f7';
      if (event.type === 'glucose') {
        const e = event.data;
        const color = e.interpretation === 'Low' ? '#e53935' : e.interpretation === 'High' ? '#ef6c00' : '#2e7d32';
        return `
          <tr style="background-color: ${bg}">
            <td>${e.timestamp.split(' ')[0]}</td>
            <td>${e.timestamp.split(' ')[1]}</td>
            <td style="font-weight:600">${e.value} ${e.unit}</td>
            <td style="color: ${color}; font-weight:600">${e.interpretation}</td>
            <td>${e.fasting || '—'}</td>
            <td>${e.symptoms || '—'}</td>
            <td style="color:#1565c0">—</td>
            <td>—</td>
            <td>—</td>
          </tr>`;
      } else {
        const e = event.data;
        return `
          <tr style="background-color: ${bg}">
            <td>—</td>
            <td>${e.time}</td>
            <td style="color:#1565c0">—</td>
            <td style="color:#1565c0">—</td>
            <td>—</td>
            <td>—</td>
            <td style="color:#1565c0; font-weight:600">${e.type}</td>
            <td style="color:#1565c0; font-weight:600">${e.units}u</td>
            <td>—</td>
          </tr>`;
      }
    }).join('');

    const avgGlucose = filteredHistory.length > 0
      ? (filteredHistory.reduce((s, e) => s + e.value, 0) / filteredHistory.length).toFixed(1)
      : '—';
    const inRange      = filteredHistory.filter(e => e.interpretation === 'Normal').length;
    const lows         = filteredHistory.filter(e => e.interpretation === 'Low').length;
    const highs        = filteredHistory.filter(e => e.interpretation === 'High').length;
    const totalInsulin = insulinEntries.reduce((s, e) => s + e.units, 0);

    const dateFrom = filterDateFrom || (filteredHistory.length > 0 ? [...filteredHistory].reverse()[0].timestamp.split(' ')[0] : '—');
    const dateTo   = filterDateTo   || (filteredHistory.length > 0 ? filteredHistory[0].timestamp.split(' ')[0] : '—');

    // ── SVG Line Chart ──────────────────────────────────────────────────────
    const chartPoints = [...filteredHistory].reverse().slice(-20);
    const lineChartSvg = (() => {
      if (chartPoints.length < 2) return '<p style="color:#aaa;font-style:italic">Not enough data for chart (need 2+ readings)</p>';
      const W = 740, H = 160, padL = 44, padR = 16, padT = 12, padB = 36;
      const vals = chartPoints.map(e => e.value);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const range = maxV - minV || 1;
      const xStep = (W - padL - padR) / (chartPoints.length - 1);
      const toX = (i: number) => padL + i * xStep;
      const toY = (v: number) => padT + (H - padT - padB) * (1 - (v - minV) / range);
      const points = chartPoints.map((e, i) => `${toX(i).toFixed(1)},${toY(e.value).toFixed(1)}`).join(' ');
      const dots = chartPoints.map((e, i) => {
        const col = e.interpretation === 'Low' ? '#e53935' : e.interpretation === 'High' ? '#ef6c00' : '#2e7d32';
        return `<circle cx="${toX(i).toFixed(1)}" cy="${toY(e.value).toFixed(1)}" r="4" fill="${col}" />`;
      }).join('');
      const labels = chartPoints.map((e, i) => {
        const parts = e.timestamp.split(' ');
        const d = parts[0].substring(0, 5);
        const t = parts[1] ? parts[1].substring(0, 5) : '';
        return `<text x="${toX(i).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="7" fill="#666">${d}</text>
                <text x="${toX(i).toFixed(1)}" y="${H - 14}" text-anchor="middle" font-size="7" fill="#999">${t}</text>`;
      }).join('');
      const yLabels = [minV, (minV + maxV) / 2, maxV].map(v =>
        `<text x="${padL - 4}" y="${toY(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="8" fill="#666">${v.toFixed(1)}</text>`
      ).join('');
      return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <polyline points="${points}" fill="none" stroke="#ec5557" stroke-width="2" stroke-linejoin="round"/>
        ${dots}${labels}${yLabels}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#ddd" stroke-width="1"/>
        <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#ddd" stroke-width="1"/>
      </svg>`;
    })();

    // ── SVG Pie Chart ───────────────────────────────────────────────────────
    const pieChartSvg = (() => {
      const slices = [
        { label: 'Normal', count: inRange,             color: '#2e7d32' },
        { label: 'High',   count: highs,               color: '#ef6c00' },
        { label: 'Low',    count: lows,                color: '#e53935' },
      ].filter(s => s.count > 0);
      if (slices.length === 0) return '<p style="color:#aaa;font-style:italic">No data for pie chart</p>';
      const total = slices.reduce((s, d) => s + d.count, 0);
      const cx = 90, cy = 90, r = 80;
      let startAngle = -Math.PI / 2;
      const paths = slices.map(s => {
        const angle = (s.count / total) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(startAngle + angle);
        const y2 = cy + r * Math.sin(startAngle + angle);
        const large = angle > Math.PI ? 1 : 0;
        const mid = startAngle + angle / 2;
        const lx = cx + (r + 16) * Math.cos(mid);
        const ly = cy + (r + 16) * Math.sin(mid);
        const path = `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${s.color}"/>`;
        const pct = ((s.count / total) * 100).toFixed(0);
        const label = `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="#fff" font-weight="bold">${pct}%</text>`;
        startAngle += angle;
        return path + label;
      }).join('');
      const legend = slices.map((s, i) =>
        `<rect x="195" y="${20 + i * 22}" width="12" height="12" fill="${s.color}" rx="2"/>
         <text x="212" y="${30 + i * 22}" font-size="11" fill="#444">${s.label}: ${s.count} (${((s.count/total)*100).toFixed(0)}%)</text>`
      ).join('');
      return `<svg width="340" height="180" xmlns="http://www.w3.org/2000/svg">
        ${paths}${legend}
      </svg>`;
    })();

    const html = `
      <html>
        <head>
          <style>
            @page { size: A4 landscape; margin: 16px 20px; }
            body { font-family: Arial, sans-serif; padding: 0; color: #222; font-size: 11px; }
            h1 { color: #ec5557; font-size: 20px; margin-bottom: 2px; }
            h2 { color: #444; font-size: 13px; font-weight: 600; margin: 16px 0 6px 0; border-bottom: 2px solid #ec5557; padding-bottom: 3px; }
            .meta { color: #888; font-size: 10px; margin-bottom: 4px; }
            .patient { font-size: 11px; color: #444; margin-bottom: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background-color: #ec5557; color: white; padding: 5px 7px; text-align: left; font-size: 10px; }
            td { padding: 3px 7px; border-bottom: 1px solid #eee; }
            .summary { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
            .summary-box { border: 1px solid #e0e0e0; border-radius: 6px; padding: 6px 12px; text-align: center; min-width: 70px; }
            .summary-number { font-size: 18px; font-weight: bold; color: #ec5557; }
            .summary-label { font-size: 9px; color: #666; margin-top: 1px; }
            .footer { margin-top: 20px; font-size: 9px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
            .no-data { text-align: center; color: #aaa; padding: 10px; font-style: italic; }
            .insulin-row td { color: #1565c0; }
          </style>
        </head>
        <body>
          <h1>🩸 DiabEasy — Glucose Report</h1>
          <div class="meta">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div class="patient">
            ${profile?.name ? `<strong>Patient:</strong> ${profile.name} &nbsp;|&nbsp;` : ''}
            <strong>Period:</strong> ${dateFrom} — ${dateTo}
          </div>

          <div class="summary">
            <div class="summary-box">
              <div class="summary-number">${filteredHistory.length}</div>
              <div class="summary-label">Total Readings</div>
            </div>
            <div class="summary-box">
              <div class="summary-number" style="color:#2e7d32">${avgGlucose}</div>
              <div class="summary-label">Average</div>
            </div>
            <div class="summary-box">
              <div class="summary-number" style="color:#2e7d32">${inRange}</div>
              <div class="summary-label">In Range</div>
            </div>
            <div class="summary-box">
              <div class="summary-number" style="color:#e53935">${lows}</div>
              <div class="summary-label">Lows</div>
            </div>
            <div class="summary-box">
              <div class="summary-number" style="color:#ef6c00">${highs}</div>
              <div class="summary-label">Highs</div>
            </div>
            <div class="summary-box">
              <div class="summary-number" style="color:#1565c0">${totalInsulin}u</div>
              <div class="summary-label">Total Insulin</div>
            </div>
          </div>

          <h2>Glucose Over Time (last 20 readings)</h2>
          ${lineChartSvg}

          <h2>Readings Breakdown</h2>
          ${pieChartSvg}

          <h2>Health Log</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Glucose</th>
                <th>Status</th>
                <th>Reading Type</th>
                <th>Symptoms & Notes</th>
                <th>Insulin Type</th>
                <th>Insulin Dose</th>
                <th>Food Consumed</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? rows : `<tr><td colspan="9" class="no-data">No data recorded</td></tr>`}
            </tbody>
          </table>

          <div class="footer">
            DiabEasy is a personal management aid and not a medical device.
            Always confirm treatment decisions with your healthcare provider.
          </div>
        </body>
      </html>
    `;
    
    

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Glucose Report' });
    } catch (error) {
      console.error('PDF export error:', error);
    }
  };

  const screenWidth = Dimensions.get('window').width - 32;

const chartData = useMemo(() => {
  const sorted = [...filteredHistory].reverse().slice(-20);
  return sorted;
}, [filteredHistory]);

const lineData = {
  labels: chartData.map(e => {
    const parts = e.timestamp.split(' ');
    const datePart = parts[0].substring(0, 5); // dd/mm
    const timePart = parts[1] ? parts[1].substring(0, 5) : '';
    return `${datePart} ${timePart}`;
  }),
  datasets: [{
    data: chartData.length > 0 ? chartData.map(e => e.value) : [0],
    color: (opacity = 1) => `rgba(236, 85, 87, ${opacity})`,
    strokeWidth: 2,
  }],
};

const pieData = [
  {
    name: 'Normal',
    count: filteredHistory.filter(e => e.interpretation === 'Normal').length,
    color: '#2e7d32',
    legendFontColor: colors.textMuted,
    legendFontSize: 12,
  },
  {
    name: 'High',
    count: filteredHistory.filter(e => e.interpretation === 'High').length,
    color: '#ef6c00',
    legendFontColor: colors.textMuted,
    legendFontSize: 12,
  },
  {
    name: 'Low',
    count: filteredHistory.filter(e => e.interpretation === 'Low').length,
    color: '#e53935',
    legendFontColor: colors.textMuted,
    legendFontSize: 12,
  },
].filter(d => d.count > 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title,         { color: colors.text }]}>Past Measurements</Text>
      <Text style={[styles.filterHeading, { color: colors.text }]}>Filter values</Text>

      {/* Date filters */}
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

      {/* Min/Max */}
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
        <UnitPill label="mg/dL" value="mg/dL" />
        <UnitPill label="mmol/L" value="mmol/L" />
        <UnitPill label="All" value="" />
      </View>

      <View style={styles.filterBtnsRow}>
        <TouchableOpacity onPress={clearFilters} style={[styles.filterActionBtn, { borderColor: colors.red }]} activeOpacity={0.7}>
          <Text style={[styles.filterActionBtnText, { color: colors.red }]}>Clear Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFiltersApplied(true)} style={[styles.filterActionBtn, { borderColor: colors.red }]} activeOpacity={0.7}>
          <Text style={[styles.filterActionBtnText, { color: colors.red }]}>Apply Filters</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={exportPDF}
        style={[styles.clearBtn, { borderColor: colors.red, backgroundColor: colors.red }]}
        activeOpacity={0.7}
      >
        <Text style={[styles.clearBtnText, { color: '#fff' }]}>📄 Export PDF Report</Text>
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {filteredHistory.length >= 2 && (
        <View style={[styles.chartCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.textMuted }]}>GLUCOSE OVER TIME</Text>
          <LineChart
            data={lineData}
            width={screenWidth}
            height={220}
            chartConfig={{
              backgroundGradientFrom: colors.bgCard,
              backgroundGradientTo: colors.bgCard,
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(236, 85, 87, ${opacity})`,
              labelColor: () => colors.textMuted,
              propsForDots: { r: '3', strokeWidth: '1', stroke: colors.red },
              propsForBackgroundLines: { stroke: colors.border },
              propsForLabels: { fontSize: 9, rotation: -35 },
            }}
            bezier
            withInnerLines
            withOuterLines={false}
            style={{ borderRadius: 8, marginLeft: -16 }}
          />

          <Text style={[styles.chartTitle, { color: colors.textMuted, marginTop: 16 }]}>READINGS BREAKDOWN</Text>
          {pieData.length > 0 ? (
            <PieChart
              data={pieData.map(d => ({ name: `${d.name} (${d.count})`, population: d.count, color: d.color, legendFontColor: d.legendFontColor, legendFontSize: d.legendFontSize }))}
              width={screenWidth}
              height={160}
              chartConfig={{
                color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="8"
              absolute
            />
          ) : (
            <Text style={[styles.chartEmpty, { color: colors.textFaint }]}>No data to display</Text>
          )}
        </View>
      )}

      {history.length === 0 ? (
        <Text style={[styles.emptyMsg, { color: colors.textMuted }]}>No data recorded yet.</Text>
      ) : filteredHistory.length === 0 ? (
        <Text style={[styles.emptyMsg, { color: colors.textMuted }]}>No entries match your filter criteria.</Text>
      ) : (
        [...filteredHistory].reverse().map((entry, index) => renderEntry(entry, index))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chartCard:  { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 16, marginBottom: 16, overflow: 'hidden' },
  chartTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  chartEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  container:       { flex: 1 },
  contentContainer:{ padding: 16, paddingBottom: 40 },
  clearBtn:     { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5, marginBottom: 16 },
  clearBtnText: { fontSize: 14, fontWeight: '500' },
  title:           { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  filterHeading:   { fontSize: 15, marginBottom: 4, textAlign: 'center' },
  filterRow:       { flexDirection: 'row', gap: 12, marginBottom: 12 },
  filterGroup:     { flex: 1 },
  filterLabel:     { fontSize: 13, marginBottom: 4, textAlign: 'center' },
  filterInput:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 6, fontSize: 14, height: 42 },
  pillHeading:     { marginTop: 12, marginBottom: 8 },
  pillRow:         { flexDirection: 'row', gap: 10, marginBottom: 12, justifyContent: 'center' },
  pill:            { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5, minWidth: 72, alignItems: 'center' },
  pillText:        { fontSize: 14, fontWeight: '500' },
  filterBtnsRow:   { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 },
  filterActionBtn: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5, marginBottom: 16 },
  filterActionBtnText: { fontSize: 14, fontWeight: '500' },
  divider:         { height: 1, marginBottom: 16 },
  emptyMsg:        { textAlign: 'center', fontSize: 14, marginTop: 24 },
  historyItem:     { borderRadius: 6, paddingHorizontal: 14, paddingVertical: 1, marginBottom: 6, borderWidth: 1, overflow: 'hidden', borderBottomWidth: 3 },
  entryRow:        { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 },
  entryDate:       { fontSize: 13, fontWeight: '600' },
  entryTime:       { fontSize: 13 },
  entryValue:      { fontSize: 14, fontWeight: '700' },
  entryBadge:      { fontSize: 13, fontWeight: '600', marginLeft: 'auto' },
  fastingLabel:    { fontSize: 12, marginTop: 2 },
  notes:           { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  deleteBtn:       { fontSize: 13, fontWeight: '600', paddingHorizontal: 6 },
});