/**
 * bleGlucometerService.ts
 *
 * Standard Bluetooth Glucose Profile (GLP) implementation.
 * Tested against Accu-Chek Instant (device name prefix: "METER+").
 *
 * Protocol:
 *  1. Scan for device with name matching "METER+"
 *  2. Connect and discover services
 *  3. Enable notifications on Glucose Measurement (0x2A18)
 *  4. Enable indications on Record Access Control Point (0x2A52)
 *  5. Write "Report Last Record" opcode to RACP
 *  6. Device sends one Glucose Measurement notification
 *  7. Parse the notification → { value, unit, timestamp }
 */

import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

// ── UUIDs ─────────────────────────────────────────────────────────────────────
export const UUID_GLUCOSE_SERVICE  = '00001808-0000-1000-8000-00805f9b34fb';
export const UUID_GLUCOSE_MEAS     = '00002a18-0000-1000-8000-00805f9b34fb';
export const UUID_RACP             = '00002a52-0000-1000-8000-00805f9b34fb';

// RACP opcodes — opcode 0x01 = Report Stored Records, operator 0x06 = Last Record, 0x01 = All Records
const RACP_REPORT_LAST  = Buffer.from([0x01, 0x06]).toString('base64'); // Report last stored record
const RACP_REPORT_ALL   = Buffer.from([0x01, 0x01]).toString('base64'); // Report all stored records — unused for now

export interface GlucoseReading {
  value:     number;
  unit:      'mg/dL' | 'mmol/L';
  timestamp: string; // ISO 8601
}

// ── SFLOAT decoder ────────────────────────────────────────────────────────────
// BLE Glucose Measurement uses IEEE-11073 SFLOAT (16-bit)
function decodeSFloat(raw: number): number {
  const mantissa = raw & 0x0FFF;
  const exponent = raw >> 12;
  const exp = exponent >= 8 ? exponent - 16 : exponent;       // signed 4-bit
  const mant = mantissa >= 0x0800 ? mantissa - 0x1000 : mantissa; // signed 12-bit
  return mant * Math.pow(10, exp);
}

// ── Glucose Measurement parser (0x2A18) ───────────────────────────────────────
export function parseGlucoseMeasurement(base64: string): GlucoseReading | null {
  try {
    const buf = Buffer.from(base64, 'base64');
    const flags = buf.readUInt8(0);

    const timeOffsetPresent       = (flags & 0x01) !== 0;
    const glucoseConcentrationPresent = (flags & 0x02) !== 0;
    const unitIsKgL               = (flags & 0x04) === 0; // 0 = kg/L, 1 = mol/L

    // Base time starts at byte 3 (sequence number is bytes 1-2)
    let offset = 3;
    const year    = buf.readUInt16LE(offset); offset += 2;
    const month   = buf.readUInt8(offset++);
    const day     = buf.readUInt8(offset++);
    const hours   = buf.readUInt8(offset++);
    const minutes = buf.readUInt8(offset++);
    const seconds = buf.readUInt8(offset++);

    // Time offset (minutes, signed int16)
    let timeOffsetMinutes = 0;
    if (timeOffsetPresent) {
      timeOffsetMinutes = buf.readInt16LE(offset); offset += 2;
    }

    if (!glucoseConcentrationPresent) return null;

    const rawSFloat = buf.readUInt16LE(offset);
    const concentration = decodeSFloat(rawSFloat); // in kg/L or mol/L

    // Convert to mg/dL
    // kg/L × 100000 = mg/dL  |  mol/L × 1000 = mmol/L × 18.0182 = mg/dL
    let valueMgDl: number;
    if (unitIsKgL) {
      valueMgDl = Math.round(concentration * 100000);
    } else {
      valueMgDl = Math.round(concentration * 1000 * 18.0182);
    }

    // Build timestamp from device clock + optional time offset
    const baseTs = new Date(year, month - 1, day, hours, minutes, seconds);
    baseTs.setMinutes(baseTs.getMinutes() + timeOffsetMinutes);
    const timestamp = baseTs.toISOString();

    return { value: valueMgDl, unit: 'mg/dL', timestamp };
  } catch {
    return null;
  }
}

// ── Main service ──────────────────────────────────────────────────────────────

export type BleStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'reading'
  | 'done'
  | 'error';

export interface BleServiceCallbacks {
  onStatus:  (status: BleStatus, message?: string) => void;
  onReading: (reading: GlucoseReading) => void;
  onError:   (message: string) => void;
}

export class BleGlucometerService {
  private manager:    BleManager;
  private device:     Device | null = null;
  private scanTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(manager: BleManager) {
    this.manager = manager;
  }

  async readLastGlucose(callbacks: BleServiceCallbacks, knownDeviceId?: string): Promise<string | null> {
    const { onStatus, onReading, onError } = callbacks;

    // ── Fast path: connect directly if we know the device ID ─────────────────
    if (knownDeviceId) {
      onStatus('connecting', 'Connecting to glucometer…');
      try {
        this.device = await this.manager.connectToDevice(knownDeviceId);
        await this.device.discoverAllServicesAndCharacteristics();
        onStatus('reading', 'Reading last measurement…');
        await this.readAndNotify(callbacks);
        await this.cleanup();
        return knownDeviceId;
      } catch {
        // Known device unreachable — fall through to scan
        await this.cleanup();
      }
    }

    // ── Slow path: scan for the device ────────────────────────────────────────
    onStatus('scanning', 'Searching for glucometer…');

    return new Promise((resolve) => {
      let found = false;

      this.scanTimeout = setTimeout(() => {
        if (!found) {
          this.manager.stopDeviceScan();
          onError('Glucometer not found. Make sure it is on and nearby.');
          resolve(null);
        }
      }, 15000);

      this.manager.startDeviceScan(
        [UUID_GLUCOSE_SERVICE],
        { allowDuplicates: false },
        async (error, device) => {
          if (error) {
            this.cleanup();
            onError(error.message);
            resolve(null);
            return;
          }

          // Accept any device advertising the Glucose Service
          if (!device) return;
          found = true;
          this.manager.stopDeviceScan();
          if (this.scanTimeout) clearTimeout(this.scanTimeout);

          try {
            onStatus('connecting', `Connecting to ${device.name ?? device.id}…`);
            this.device = await this.manager.connectToDevice(device.id);
            await this.device.discoverAllServicesAndCharacteristics();
            onStatus('reading', 'Reading last measurement…');
            await this.readAndNotify(callbacks);
            resolve(device.id);
          } catch (e: any) {
            onError(e?.message ?? 'Connection failed.');
            resolve(null);
          } finally {
            this.cleanup();
          }
        }
      );
    });
  }

  private readAndNotify(callbacks: BleServiceCallbacks): Promise<void> {
    const { onStatus, onReading } = callbacks;
    return new Promise<void>((resInner, rejInner) => {
      let received = false;

      // 1. Enable indications on RACP — device won't accept writes otherwise
      this.device!.monitorCharacteristicForService(
        UUID_GLUCOSE_SERVICE,
        UUID_RACP,
        (err) => {
          if (err && !received) rejInner(new Error(err.message));
        }
      );

      // 2. Enable notifications on Glucose Measurement
      this.device!.monitorCharacteristicForService(
        UUID_GLUCOSE_SERVICE,
        UUID_GLUCOSE_MEAS,
        (err, characteristic) => {
          if (err) { rejInner(new Error(err.message)); return; }
          if (!characteristic?.value || received) return;
          received = true;
          const reading = parseGlucoseMeasurement(characteristic.value);
          if (reading) {
            onStatus('done');
            onReading(reading);
            resInner();
          } else {
            rejInner(new Error('Could not parse glucose measurement.'));
          }
        }
      );

      // 3. Write RACP "Report Last Record" after subscriptions are active
      setTimeout(async () => {
        try {
          await this.device!.writeCharacteristicWithResponseForService(
            UUID_GLUCOSE_SERVICE, UUID_RACP, RACP_REPORT_LAST,
          );
        } catch (e: any) {
          rejInner(new Error(e?.message ?? 'RACP write failed.'));
        }
        setTimeout(() => {
          if (!received) rejInner(new Error('No reading received from device.'));
        }, 10000);
      }, 600);
    });
  }

  private async cleanup() {
    if (this.scanTimeout) clearTimeout(this.scanTimeout);
    if (this.device) {
      try { await this.device.cancelConnection(); } catch { /* ignore */ }
      this.device = null;
    }
  }

  destroy() {
    this.cleanup();
    this.manager.destroy();
  }
}
