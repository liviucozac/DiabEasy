/**
 * glucoseStore.ts
 *
 * Global state shared across all DiabEasy tabs.
 * Install: npx expo install zustand
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/idUtils';

export type Unit             = 'mg/dL' | 'mmol/L';
export type DiabetesType     = 'Type 1' | 'Type 2' | 'LADA' | 'Other' | '';
export type ThemeType        = 'light' | 'dark' | 'system';
export type InsulinAnalogType    = 'standard' | 'ultra-rapid' | 'inhaled';
export type LongActingInsulinType = 'glargine-u100' | 'glargine-u300' | 'detemir' | 'degludec' | 'nph';
export type SecurityMethod       = 'none' | 'pin' | 'password' | 'biometrics';
export type LockTimeout          = 'immediate' | '1min' | '5min' | 'app-close';
import { syncGlucoseEntry, deleteGlucoseEntry } from '../utils/firestoreSync';

export interface GlucoseEntry {
  id: string;
  value: number;
  unit: Unit;
  timestamp: string;       // ISO 8601
  interpretation: string;  // "Low" | "Normal" | "High"
  fasting: string;
  symptoms: string;
}

export interface InsulinEntry {
  id:        string;
  units:     number;
  time:      string;
  type:      'Rapid-acting' | 'Long-acting';
  timestamp: string;
}

export interface Reminder {
  id: string;
  label: string;
  time: string;            // "HH:MM"
  type: 'Rapid-acting' | 'Long-acting';
  units: number;
  active: boolean;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  name: string;
  email: string;
  age: string;
  diabetesType: DiabetesType;
  diagnosisDate: string;    // "MM/YYYY"
  doctorName: string;
  clinicName: string;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  theme: ThemeType;
  glucoseUnit: Unit;
  language: string;
  notificationsEnabled: boolean;
  isf: number;
  carbRatio: number;
  targetGlucose: number;
  insulinAnalogType: InsulinAnalogType;
  dia: number;
  longActingInsulinType: LongActingInsulinType;
  emergencyNumber: string;
  insulinParamsSet: boolean;  // true once user has explicitly saved ISF/carbRatio/target
  glucoseLow: number;         // low threshold in mg/dL (default 70)
  glucoseHigh: number;        // high threshold in mg/dL (default 180)
  securityMethod: SecurityMethod;
  securityHash: string;       // djb2 hash of PIN or password
  lockTimeout: LockTimeout;
  hasSeenSecuritySetup: boolean;
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface GlucoseStore {
  // Onboarding
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (v: boolean) => void;

  // Current reading (shared with Medication & Food Guide tabs)
  glucoseValue: number | null;
  unit: Unit;
  setGlucoseValue: (value: number, unit: Unit) => void;

  // Meal carbs total (set by Food Guide, read by Medication)
  totalCarbs: number;
  setTotalCarbs: (carbs: number) => void;

  // History log
  history: GlucoseEntry[];
  addEntry: (entry: Omit<GlucoseEntry, 'id'>) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;

  // Insulin log
  insulinEntries: InsulinEntry[];
  addInsulinEntry: (entry: InsulinEntry) => void;
  clearInsulinLog: () => void;

  // Reminders
  reminders: Reminder[];
  addReminder: (r: Reminder) => void;
  updateReminder: (id: string, changes: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;

  // User profile
  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;

  // App settings
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
}

// ─── Default values ───────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  email: '',
  age: '',
  diabetesType: '',
  diagnosisDate: '',
  doctorName: '',
  clinicName: '',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  glucoseUnit: 'mg/dL',
  language: 'en',
  notificationsEnabled: true,
  isf: 50,
  carbRatio: 10,
  targetGlucose: 100,
  insulinAnalogType:    'standard'      as InsulinAnalogType,
  dia:                  5,
  longActingInsulinType: 'glargine-u100' as LongActingInsulinType,
    emergencyNumber: '112',
  insulinParamsSet: false,
  glucoseLow: 70,
  glucoseHigh: 180,
  securityMethod: 'none',
  securityHash: '',
  lockTimeout: '1min',
  hasSeenSecuritySetup: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGlucoseStore = create<GlucoseStore>()(
  persist(
    (set) => ({
  hasSeenOnboarding: false,
  setHasSeenOnboarding: (v) => set({ hasSeenOnboarding: v }),

  glucoseValue: null,
  unit: 'mg/dL',
  setGlucoseValue: (value, unit) => set({ glucoseValue: value, unit }),

  totalCarbs: 0,
  setTotalCarbs: (carbs) => set({ totalCarbs: carbs }),

  history: [],
  addEntry: (entry) =>
    set((state) => {
      const newEntry = { ...entry, id: generateId() };
      syncGlucoseEntry(newEntry).catch(() => {});
      return { history: [...state.history, newEntry] };
    }),
  clearHistory: () => set({ history: [] }),
  removeEntry: (id) =>
    set((state) => {
      deleteGlucoseEntry(id).catch(() => {});
      return { history: state.history.filter((e) => e.id !== id) };
    }),

  insulinEntries: [],
  addInsulinEntry: (entry) =>
    set((state) => ({ insulinEntries: [...state.insulinEntries, entry] })),
  clearInsulinLog: () => set({ insulinEntries: [] }),

  reminders: [
    { id: generateId(), label: 'Morning rapid insulin', time: '08:00', type: 'Rapid-acting', units: 0,  active: true },
    { id: generateId(), label: 'Evening long insulin',  time: '22:00', type: 'Long-acting',  units: 10, active: true },
  ],
  addReminder: (r) => set((state) => ({ reminders: [...state.reminders, r] })),
  updateReminder: (id, changes) =>
    set((state) => ({ reminders: state.reminders.map((r) => r.id === id ? { ...r, ...changes } : r) })),
  deleteReminder: (id) =>
    set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) })),

  profile: DEFAULT_PROFILE,
  setProfile: (partial) =>
    set((state) => ({ profile: { ...state.profile, ...partial } })),

  settings: DEFAULT_SETTINGS,
  setSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),
    }),
    {
      name: 'diabeasy-store',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        settings: { ...currentState.settings, ...(persistedState.settings ?? {}) },
        profile:  { ...currentState.profile,  ...(persistedState.profile  ?? {}) },
        // Backfill legacy insulin entries that predate the required timestamp field
        insulinEntries: (persistedState.insulinEntries ?? []).map((e: any) =>
          e.timestamp ? e : { ...e, timestamp: new Date(0).toISOString() }
        ),
        // Backfill missing IDs and convert legacy "dd/mm/yyyy HH:MM" timestamps to ISO 8601
        history: (persistedState.history ?? []).map((e: any) => {
          const withId = e.id ? e : { ...e, id: generateId() };
          if (withId.timestamp && !withId.timestamp.includes('T')) {
            const [datePart, timePart = '00:00'] = withId.timestamp.split(' ');
            const [d, m, y] = datePart.split('/');
            const [h, min]  = timePart.split(':');
            const iso = new Date(+y, +m - 1, +d, +h, +min).toISOString();
            return { ...withId, timestamp: iso };
          }
          return withId;
        }),
      }),
    }
  )
);