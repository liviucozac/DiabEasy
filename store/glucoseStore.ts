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

import { syncGlucoseEntry, deleteGlucoseEntry, syncInsulinEntry, syncProfile, syncSavedMeal, deleteSavedMeal, syncEntryToCaregiverData } from '../utils/firestoreSync';
import { useSubscriptionStore } from './subscriptionStore';

let _caregiverSyncEnabled = false;
const isSyncEnabled = () => useSubscriptionStore.getState().isPremiumPaid || _caregiverSyncEnabled;

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
  days?: string;
  type: 'Rapid-acting' | 'Long-acting';
  units: number;
  active: boolean;
}

export interface SavedMeal {
  id: string;
  date: string;
  action: 'lower' | 'maintain' | 'raise' | '';
  items: { name: string; carbs: number; sugars: number; fiber: number; protein: number; fat: number; kcal: number; gi: number; sodium: number; potassium: number }[];
  totals: { carbs: number; sugars: number; fiber: number; protein: number; fat: number; kcal: number; sodium: number; potassium: number };
  estimatedGlycemia: number | null;
  currentGlucose: number | null;
  unit: string;
}

// isPremium reflects the patient's premium status when in caregiver mode
export interface CaregiverSession {
  code: string;
  patientName: string;
  isPremium: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  age: string;
  diabetesType: DiabetesType;
  diagnosisDate: string;
  doctorName: string;
  clinicName: string;
  address: string;
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
  hasConsented: boolean;
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
  removeInsulinEntry: (id: string) => void;
  clearInsulinLog: () => void;

  savedMeals: SavedMeal[];
  addSavedMeal: (meal: SavedMeal) => void;
  removeSavedMeal: (id: string) => void;

  caregiverSession: CaregiverSession | null;
  setCaregiverSession: (session: CaregiverSession | null) => void;

  // Snapshot of the caregiver's own premium status before entering caregiver mode
  ownPremiumBeforeCaregiver: boolean;
  setOwnPremiumBeforeCaregiver: (v: boolean) => void;

  caregiverSyncEnabled: boolean;
  setCaregiverSyncEnabled: (v: boolean) => void;

  loadFromFirestore: (history: GlucoseEntry[], insulinEntries: InsulinEntry[], profile: Partial<UserProfile>, savedMeals?: SavedMeal[]) => void;
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
  name: '', email: '', age: '', diabetesType: '',
  diagnosisDate: '', doctorName: '', clinicName: '', address: '',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light', glucoseUnit: 'mg/dL', language: 'en',
  notificationsEnabled: true, isf: 50, carbRatio: 10, targetGlucose: 100,
  insulinAnalogType: 'standard' as InsulinAnalogType, dia: 5,
  longActingInsulinType: 'glargine-u100' as LongActingInsulinType,
  emergencyNumber: '112', insulinParamsSet: false,
  glucoseLow: 70, glucoseHigh: 175,
  securityMethod: 'none', securityHash: '', lockTimeout: '1min',
  hasSeenSecuritySetup: false,
  hasConsented: false,
};

export const useGlucoseStore = create<GlucoseStore>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      setHasSeenOnboarding: (v) => set({ hasSeenOnboarding: v }),

      glucoseValue: null,
      unit: 'mg/dL',
      setGlucoseValue: (value, unit) => set({ glucoseValue: value, unit, totalCarbs: 0 }),

      totalCarbs: 0,
      setTotalCarbs: (carbs) => set({ totalCarbs: carbs }),

      history: [],
      addEntry: (entry) =>
        set((state) => {
          const newEntry = { ...entry, id: generateId() };
          if (isSyncEnabled()) {
            syncGlucoseEntry(newEntry).catch(() => {});
            syncEntryToCaregiverData('glucoseHistory', newEntry).catch(() => {});
          }
          return { history: [...state.history, newEntry] };
        }),
      clearHistory: () => set({ history: [] }),
      removeEntry: (id) =>
        set((state) => {
          if (isSyncEnabled()) deleteGlucoseEntry(id).catch(() => {});
          return { history: state.history.filter((e) => e.id !== id) };
        }),

      insulinEntries: [],
      addInsulinEntry: (entry) =>
      set((state) => {
        syncInsulinEntry(entry).catch(() => {});
        if (isSyncEnabled()) {
          syncEntryToCaregiverData('insulinLog', entry).catch(() => {});
        }
        return { insulinEntries: [...state.insulinEntries, entry] };
      }),
      removeInsulinEntry: (id) =>
        set((state) => ({ insulinEntries: state.insulinEntries.filter((e) => e.id !== id) })),
      clearInsulinLog: () => set({ insulinEntries: [] }),

      savedMeals: [],
      addSavedMeal: (meal) =>
        set((state) => {
          if (isSyncEnabled()) {
            syncSavedMeal(meal).catch(() => {});
            syncEntryToCaregiverData('savedMeals', meal).catch(() => {});
          }
          return { savedMeals: [meal, ...state.savedMeals] };
        }),
      removeSavedMeal: (id) =>
        set((state) => {
          if (isSyncEnabled()) deleteSavedMeal(id).catch(() => {});
          return { savedMeals: state.savedMeals.filter((m) => m.id !== id) };
        }),

      caregiverSession: null,
      setCaregiverSession: (session) => set({ caregiverSession: session }),

      ownPremiumBeforeCaregiver: false,
      setOwnPremiumBeforeCaregiver: (v) => set({ ownPremiumBeforeCaregiver: v }),

      caregiverSyncEnabled: false,
      setCaregiverSyncEnabled: (v) => { _caregiverSyncEnabled = v; set({ caregiverSyncEnabled: v }); },

      loadFromFirestore: (history, insulinEntries, profile, savedMeals) =>
        set((state) => ({
          history, insulinEntries,
          profile: { ...state.profile, ...profile },
          ...(savedMeals !== undefined ? { savedMeals } : {}),
        })),

      clearLocalData: () =>
        set({ history: [], insulinEntries: [], savedMeals: [], glucoseValue: null, totalCarbs: 0, profile: DEFAULT_PROFILE }),

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
          if (isSyncEnabled()) syncProfile(updated).catch(() => {});
          return { profile: updated };
        }),

      settings: DEFAULT_SETTINGS,
      setSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),
    }),
    {
      name: 'diabeasy-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.caregiverSyncEnabled) _caregiverSyncEnabled = true;
      },
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        settings: { ...currentState.settings, ...(persistedState.settings ?? {}) },
        profile:  { ...currentState.profile,  ...(persistedState.profile  ?? {}) },
        insulinEntries: (persistedState.insulinEntries ?? []).map((e: any) => {
          const withId = e.id ? e : { ...e, id: generateId() };
          const withTimestamp = withId.timestamp ? withId : { ...withId, timestamp: new Date(0).toISOString() };
          // Handle migration from old 'DD/MM/YYYY HH:mm' format to ISO
          if (withTimestamp.timestamp && !withTimestamp.timestamp.includes('T')) {
            const [datePart, timePart = '00:00'] = withTimestamp.timestamp.split(' ');
            const [d, m, y] = datePart.split('/');
            const [h, min]  = timePart.split(':');
            return { ...withTimestamp, timestamp: new Date(+y, +m - 1, +d, +h, +min).toISOString() };
          }
          return withTimestamp;
        }),
        history: (persistedState.history ?? []).map((e: any) => {
          const withId = e.id ? e : { ...e, id: generateId() };
          if (withId.timestamp && !withId.timestamp.includes('T')) {
            const [datePart, timePart = '00:00'] = withId.timestamp.split(' ');
            const [d, m, y] = datePart.split('/');
            const [h, min]  = timePart.split(':');
            return { ...withId, timestamp: new Date(+y, +m - 1, +d, +h, +min).toISOString() };
          }
          return withId;
        }),
      }),
    }
  )
);