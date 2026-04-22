import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, PermissionsAndroid, Platform,
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { BleGlucometerService, BleStatus, GlucoseReading } from '../utils/bleGlucometerService';
import { useTheme } from '../context/AppContext';

interface Props {
  visible:   boolean;
  onClose:   () => void;
  onReading: (reading: GlucoseReading) => void;
}

const bleManager = new BleManager();

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

const STATUS_LABELS: Record<BleStatus, string> = {
  idle:       '',
  scanning:   'Searching for glucometer…',
  connecting: 'Connecting…',
  reading:    'Reading last measurement…',
  done:       'Reading received!',
  error:      '',
};

export function BleGlucometerScanner({ visible, onClose, onReading }: Props) {
  const { colors } = useTheme();

  const [status,  setStatus]  = useState<BleStatus>('idle');
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState<GlucoseReading | null>(null);
  const [error,   setError]   = useState('');

  const serviceRef = useRef<BleGlucometerService | null>(null);

  useEffect(() => {
    if (!visible) {
      setStatus('idle');
      setMessage('');
      setReading(null);
      setError('');
    }
  }, [visible]);

  const handleConnect = async () => {
    const granted = await requestPermissions();
    if (!granted) {
      setError('Bluetooth permissions are required.');
      setStatus('error');
      return;
    }

    setError('');
    setReading(null);

    const service = new BleGlucometerService(bleManager);
    serviceRef.current = service;

    await service.readLastGlucose({
      onStatus: (s, msg) => {
        setStatus(s);
        if (msg) setMessage(msg);
      },
      onReading: (r) => {
        setReading(r);
        setStatus('done');
      },
      onError: (msg) => {
        setError(msg);
        setStatus('error');
      },
    });
  };

  const handleConfirm = () => {
    if (!reading) return;
    onReading(reading);
    onClose();
  };

  const formatTs = (iso: string) => {
    const d = new Date(iso);
    const date = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return `${date} at ${time}`;
  };

  const busy = status === 'scanning' || status === 'connecting' || status === 'reading';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={[s.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[s.sheet, { backgroundColor: colors.bg }]}>

          <Text style={[s.title, { color: colors.text }]}>Connect Glucometer</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>
            Turn on your Accu-Chek Instant and keep it nearby.
          </Text>

          {/* Idle */}
          {status === 'idle' && !error && (
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.red }]} onPress={handleConnect} activeOpacity={0.8}>
              <Text style={s.btnText}>Connect &amp; Import</Text>
            </TouchableOpacity>
          )}

          {/* Busy */}
          {busy && (
            <View style={s.statusRow}>
              <ActivityIndicator color={colors.red} />
              <Text style={[s.statusText, { color: colors.text }]}>
                {message || STATUS_LABELS[status]}
              </Text>
            </View>
          )}

          {/* Success */}
          {status === 'done' && reading && (
            <>
              <View style={[s.readingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[s.readingLabel, { color: colors.textMuted }]}>LAST READING</Text>
                <Text style={[s.readingValue, { color: colors.red }]}>
                  {reading.value} {reading.unit}
                </Text>
                <Text style={[s.readingDate, { color: colors.textMuted }]}>
                  {formatTs(reading.timestamp)}
                </Text>
              </View>
              <TouchableOpacity style={[s.btn, { backgroundColor: colors.red }]} onPress={handleConfirm} activeOpacity={0.8}>
                <Text style={s.btnText}>Confirm &amp; Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnOutline, { borderColor: colors.border }]} onPress={() => { setStatus('idle'); setReading(null); }} activeOpacity={0.7}>
                <Text style={[s.btnOutlineText, { color: colors.textMuted }]}>Try Again</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <>
              <Text style={[s.errorText, { color: '#e53935' }]}>{error}</Text>
              <TouchableOpacity style={[s.btn, { backgroundColor: colors.red }]} onPress={() => { setStatus('idle'); setError(''); }} activeOpacity={0.8}>
                <Text style={s.btnText}>Try Again</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={s.closeLink} onPress={onClose} activeOpacity={0.7}>
            <Text style={[s.closeLinkText, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:      { flex: 1, justifyContent: 'flex-end' },
  sheet:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
  title:        { fontSize: 18, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  subtitle:     { fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 24 },
  btn:          { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 10 },
  btnText:      { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnOutline:   { borderWidth: 1.5, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  btnOutlineText:{ fontSize: 14, fontWeight: '600' },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 20 },
  statusText:   { fontSize: 14, fontWeight: '500' },
  readingCard:  { borderWidth: 1, borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16 },
  readingLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  readingValue: { fontSize: 40, fontWeight: '900', marginBottom: 4 },
  readingDate:  { fontSize: 13 },
  errorText:    { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  closeLink:    { alignItems: 'center', marginTop: 4 },
  closeLinkText:{ fontSize: 14 },
});
