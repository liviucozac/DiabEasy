/**
 * glucoseStore.ts
 *
 * Global state shared across all DiabEasy tabs.
 * Install: npx expo install zustand
 */

import { create } from 'zustand';

export type Unit = 'mg/dL' | 'mmol/L';
export type DiabetesType = 'Type 1' | 'Type 2' | 'LADA' | 'Other' | '';
export type ThemeType = 'light' | 'dark' | 'system';

export interface GlucoseEntry {
  value: number;
  unit: Unit;
  timestamp: string;       // "dd/mm/yyyy HH:MM"
  interpretation: string;  // "Low" | "Normal" | "High"
  fasting: string;
  symptoms: string;
}

export interface InsulinEntry {
  units: number;
  time: string;
  type: 'Rapid-acting' | 'Long-acting';
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
  language: string;          // e.g. 'en', 'it', 'ro' — placeholder for i18n
  notificationsEnabled: boolean;
  // Insulin calculator defaults
  isf: number;               // Insulin Sensitivity Factor (mg/dL per unit)
  carbRatio: number;         // Grams of carbs per unit of insulin
  targetGlucose: number;     // Target glucose in mg/dL
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
  addEntry: (entry: GlucoseEntry) => void;
  removeEntry: (index: number) => void;
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
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGlucoseStore = create<GlucoseStore>((set) => ({
  hasSeenOnboarding: false,
  setHasSeenOnboarding: (v) => set({ hasSeenOnboarding: v }),

  glucoseValue: null,
  unit: 'mg/dL',
  setGlucoseValue: (value, unit) => set({ glucoseValue: value, unit }),

  totalCarbs: 0,
  setTotalCarbs: (carbs) => set({ totalCarbs: carbs }),

  history: [],
  addEntry: (entry) =>
    set((state) => ({ history: [...state.history, entry] })),
  clearHistory: () => set({ history: [] }),
  removeEntry: (index) =>
    set((state) => ({
      history: state.history.filter((_, i) => i !== index),
    })),

  insulinEntries: [],
  addInsulinEntry: (entry) =>
    set((state) => ({ insulinEntries: [...state.insulinEntries, entry] })),
  clearInsulinLog: () => set({ insulinEntries: [] }),

  reminders: [
    { id: '1', label: 'Morning rapid insulin', time: '08:00', type: 'Rapid-acting', units: 0,  active: true },
    { id: '2', label: 'Evening long insulin',  time: '22:00', type: 'Long-acting',  units: 10, active: true },
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
}));