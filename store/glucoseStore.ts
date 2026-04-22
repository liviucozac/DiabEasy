/**
 * glucoseStore.ts
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/idUtils';

export type Unit                  = 'mg/dL' | 'mmol/L';
export type DiabetesType          = 'Type 1' | 'Type 2' | 'LADA' | 'Other' | '';
export type ThemeType             = 'light' | 'dark' | 'system';
export type InsulinAnalogType     = 'standard' | 'ultra-rapid' | 'inhaled';
export type LongActingInsulinType = 'glargine-u100' | 'glargine-u300' | 'detemir' | 'degludec' | 'nph';
export type SecurityMethod        = 'none' | 'pin' | 'password' | 'biometrics';
export type LockTimeout           = 'immediate' | '1min' | '5min' | 'app-close';
import { syncGlucoseEntry, deleteGlucoseEntry, syncInsulinEntry, syncProfile } from '../utils/firestoreSync';

export interface GlucoseEntry {
  id: string;
  value: number;
  unit: Unit;
  timestamp: string;
  interpretation: string;
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
  time: string;
  type: 'Rapid-acting' | 'Long-acting';
  units: number;
  active: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  age: string;
  diabetesType: DiabetesType;
  diagnosisDate: string;
  doctorName: string;
  clinicName: string;
}

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
  insulinParamsSet: boolean;
  glucoseLow: number;
  glucoseHigh: number;
  securityMethod: SecurityMethod;
  securityHash: string;
  lockTimeout: LockTimeout;
  hasSeenSecuritySetup: boolean;
}

interface GlucoseStore {
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (v: boolean) => void;

  glucoseValue: number | null;
  unit: Unit;
  setGlucoseValue: (value: number, unit: Unit) => void;

  totalCarbs: number;
  setTotalCarbs: (carbs: number) => void;

  history: GlucoseEntry[];
  addEntry: (entry: Omit<GlucoseEntry, 'id'>) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;

  insulinEntries: InsulinEntry[];
  addInsulinEntry: (entry: InsulinEntry) => void;
  clearInsulinLog: () => void;

  loadFromFirestore: (history: GlucoseEntry[], insulinEntries: InsulinEntry[], profile: Partial<UserProfile>) => void;
  clearLocalData: () => void;

  reminders: Reminder[];
  addReminder: (r: Reminder) => void;
  updateReminder: (id: string, changes: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;

  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;

  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
}

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
  insulinAnalogType: 'standard' as InsulinAnalogType,
  dia: 5,
  longActingInsulinType: 'glargine-u100' as LongActingInsulinType,
  emergencyNumber: '112',
  insulinParamsSet: false,
  glucoseLow: 70,
  glucoseHigh: 175,
  securityMethod: 'none',
  securityHash: '',
  lockTimeout: '1min',
  hasSeenSecuritySetup: false,
};

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
        set((state) => {
        syncInsulinEntry(entry).catch(() => {});
          return { insulinEntries: [...state.insulinEntries, entry] };
        }),
      clearInsulinLog: () => set({ insulinEntries: [] }),

      loadFromFirestore: (history, insulinEntries, profile) =>
        set((state) => ({
          history,
          insulinEntries,
          profile: { ...state.profile, ...profile },
        })),

      clearLocalData: () =>
        set({
          history: [],
          insulinEntries: [],
          glucoseValue: null,
          totalCarbs: 0,
          profile: DEFAULT_PROFILE,
        }),

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
        set((state) => {
          const updated = { ...state.profile, ...partial };
          syncProfile(updated).catch(() => {});
          return { profile: updated };
        }),

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
        insulinEntries: (persistedState.insulinEntries ?? []).map((e: any) =>
          e.timestamp ? e : { ...e, timestamp: new Date(0).toISOString() }
        ),
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