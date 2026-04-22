import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { useTheme } from '../context/AppContext';

const { width: SCREEN_W } = Dimensions.get('window');

interface ScanResult {
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  timestamp: string; // ISO 8601
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: ScanResult) => void;
}

// ── Parsing helpers ────────────────────────────────────────────────────────────

function parseGlucometerText(blocks: string[]): ScanResult | null {
  const fullText = blocks.join(' ');

  // ── Unit ──────────────────────────────────────────────────────────────────
  const unit: 'mg/dL' | 'mmol/L' = /mmol/i.test(fullText) ? 'mmol/L' : 'mg/dL';

  // ── Glucose value ─────────────────────────────────────────────────────────
  const mgLow  = unit === 'mg/dL' ? 40  : 2.0;
  const mgHigh = unit === 'mg/dL' ? 600 : 33.3;

  // LCD displays often fragment digits — e.g. "182" becomes "1" + "82" in OCR.
  // Build a list of candidates from single tokens AND adjacent merged pairs.
  const tokenRe = /\d+(?:\.\d+)?/g;
  const tokens: Array<{ text: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(fullText)) !== null) {
    tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }

  const candidates: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const v = parseFloat(tokens[i].text);
    if (v >= mgLow && v <= mgHigh) candidates.push(v);

    // Try merging with the next token when there is at most one separating character
    // (space between LCD digit segments), e.g. "1 82" → "182"
    if (i + 1 < tokens.length) {
      const gap = tokens[i + 1].start - tokens[i].end;
      if (gap <= 2 && !tokens[i].text.includes('.') && !tokens[i + 1].text.includes('.')) {
        const merged = parseFloat(tokens[i].text + tokens[i + 1].text);
        if (merged >= mgLow && merged <= mgHigh) candidates.push(merged);
      }
    }
  }

  if (candidates.length === 0) return null;

  // Prefer 3-digit values for mg/dL (the most common glucometer range is 100–400)
  let value: number;
  if (unit === 'mg/dL') {
    const preferred = candidates.filter(v => v >= 100);
    value = preferred.length > 0 ? preferred[0] : candidates[0];
  } else {
    value = candidates[0];
  }

  // ── Time ──────────────────────────────────────────────────────────────────
  // Matches HH:MM or H:MM, optionally followed by AM/PM
  const timeMatch = fullText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  let hours   = timeMatch ? parseInt(timeMatch[1]) : new Date().getHours();
  let minutes = timeMatch ? parseInt(timeMatch[2]) : new Date().getMinutes();
  if (timeMatch?.[3]) {
    const meridiem = timeMatch[3].toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }

  // ── Date ──────────────────────────────────────────────────────────────────
  // Matches M/D, MM/DD, D/M, DD/MM
  const dateMatch = fullText.match(/(\d{1,2})\/(\d{1,2})/);
  const now = new Date();
  let month = now.getMonth() + 1;
  let day   = now.getDate();

  if (dateMatch) {
    const a = parseInt(dateMatch[1]);
    const b = parseInt(dateMatch[2]);
    // If first number > 12 it must be a day (DD/MM), otherwise assume MM/DD
    // (Contour devices default to MM/DD but we check both)
    if (a > 12) { day = a; month = b; }
    else        { month = a; day = b; }
  }

  const year = now.getFullYear();
  const ts   = new Date(year, month - 1, day, hours, minutes, 0, 0);

  // If the resulting date is in the future, assume previous year
  if (ts > now) ts.setFullYear(year - 1);

  return { value, unit, timestamp: ts.toISOString() };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlucometerScanner({ visible, onClose, onConfirm }: Props) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning,   setScanning]   = useState(false);
  const [result,     setResult]     = useState<ScanResult | null>(null);
  const [error,      setError]      = useState('');
  const cameraRef = useRef<CameraView>(null);
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setResult(null);
      setError('');
      setScanning(false);
    }
    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, [visible]);

  const startScanning = () => {
    setScanning(true);
    setError('');
    setResult(null);

    scanInterval.current = setInterval(async () => {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: true,
        });
        if (!photo?.uri) return;

        const recognized = await TextRecognition.recognize(photo.uri);
        const blocks = recognized.blocks.map(b => b.text);
        const parsed = parseGlucometerText(blocks);

        if (parsed) {
          if (scanInterval.current) clearInterval(scanInterval.current);
          setScanning(false);
          setResult(parsed);
        }
      } catch (e) {
        // silent — keep trying
      }
    }, 1500);

    // Timeout after 15 seconds
    setTimeout(() => {
      if (scanInterval.current) { clearInterval(scanInterval.current); scanInterval.current = null; }
      setScanning(false);
      if (!result) setError('Could not read the display. Try holding the camera closer and steadier.');
    }, 15000);
  };

  const stopScanning = () => {
    if (scanInterval.current) { clearInterval(scanInterval.current); scanInterval.current = null; }
    setScanning(false);
  };

  const handleConfirm = () => {
    if (!result) return;
    onConfirm(result);
    onClose();
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    const date = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return `${date} at ${time}`;
  };

  if (!permission) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: '#000' }]}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { stopScanning(); onClose(); }} activeOpacity={0.7}>
            <Text style={styles.cancelBtn}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Glucometer</Text>
          <View style={{ width: 70 }} />
        </View>

        {/* Camera or permission */}
        {!permission.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>Camera access is needed to scan your glucometer.</Text>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.red }]} onPress={requestPermission} activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>Allow Camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={styles.camera} facing="back">
              {/* Targeting overlay */}
              <View style={styles.overlay}>
                <View style={styles.overlayTop} />
                <View style={styles.overlayMiddle}>
                  <View style={styles.overlaySide} />
                  <View style={styles.scanWindow}>
                    {/* Corner markers */}
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                  </View>
                  <View style={styles.overlaySide} />
                </View>
                <View style={styles.overlayBottom}>
                  <Text style={styles.hint}>
                    {scanning ? 'Reading display...' : 'Point at your glucometer display'}
                  </Text>
                </View>
              </View>
            </CameraView>

            {/* Result card */}
            {result && (
              <View style={[styles.resultCard, { backgroundColor: colors.bgCard }]}>
                <Text style={[styles.resultTitle, { color: colors.textMuted }]}>DETECTED READING</Text>
                <Text style={[styles.resultValue, { color: colors.red }]}>{result.value} {result.unit}</Text>
                <Text style={[styles.resultDate, { color: colors.textMuted }]}>{formatTimestamp(result.timestamp)}</Text>
                <View style={styles.resultBtns}>
                  <TouchableOpacity
                    style={[styles.retryBtn, { borderColor: colors.border }]}
                    onPress={() => { setResult(null); setError(''); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.retryBtnText, { color: colors.textMuted }]}>Retry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: colors.red }]}
                    onPress={handleConfirm}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmBtnText}>Confirm & Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Error */}
            {!!error && !result && (
              <View style={[styles.resultCard, { backgroundColor: colors.bgCard }]}>
                <Text style={[styles.errorText, { color: '#e53935' }]}>{error}</Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.red, marginTop: 12 }]}
                  onPress={() => { setError(''); startScanning(); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scan button */}
            {!result && !error && (
              <View style={styles.scanBtnContainer}>
                {scanning ? (
                  <View style={styles.scanningRow}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.scanningText}>Scanning...</Text>
                    <TouchableOpacity onPress={stopScanning} activeOpacity={0.7}>
                      <Text style={styles.stopBtn}>Stop</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.red }]}
                    onPress={startScanning}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>📷 Scan Display</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const SCAN_W = SCREEN_W * 0.75;
const SCAN_H = SCAN_W * 0.55;
const CORNER = 20;
const BORDER = 3;

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#000' },
  cancelBtn:   { fontSize: 14, color: '#fff', fontWeight: '600', width: 70 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },

  camera: { flex: 1 },

  overlay:       { flex: 1 },
  overlayTop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { flexDirection: 'row' },
  overlaySide:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', paddingTop: 16 },
  hint:          { color: '#fff', fontSize: 14, fontWeight: '500', textAlign: 'center' },

  scanWindow: { width: SCAN_W, height: SCAN_H },
  corner:     { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#EC5557', },
  cornerTL:   { top: 0, left: 0,  borderTopWidth: BORDER, borderLeftWidth: BORDER },
  cornerTR:   { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER },
  cornerBL:   { bottom: 0, left: 0,  borderBottomWidth: BORDER, borderLeftWidth: BORDER },
  cornerBR:   { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },

  resultCard:   { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  resultTitle:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  resultValue:  { fontSize: 36, fontWeight: '900', marginBottom: 4 },
  resultDate:   { fontSize: 13, marginBottom: 16 },
  resultBtns:   { flexDirection: 'row', gap: 12 },
  retryBtn:     { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  retryBtnText: { fontSize: 14, fontWeight: '600' },
  confirmBtn:   { flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmBtnText:{ fontSize: 14, fontWeight: '700', color: '#fff' },

  errorText: { fontSize: 13, lineHeight: 20, textAlign: 'center' },

  scanBtnContainer: { padding: 20, backgroundColor: '#000' },
  actionBtn:        { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  actionBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff' },
  scanningRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  scanningText:     { color: '#fff', fontSize: 15, fontWeight: '600' },
  stopBtn:          { color: '#aaa', fontSize: 14, fontWeight: '600' },

  permissionBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  permissionText:   { color: '#fff', fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
});