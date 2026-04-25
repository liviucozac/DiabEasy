import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionState {
  trialStartDate:       string | null;
  isPremiumPaid:        boolean;
  hasUsedTrialPdf:      boolean;
  oneTimePdfPurchased:  boolean;

  startTrial:              () => void;
  setPremiumPaid:          (v: boolean) => void;
  markTrialPdfUsed:        () => void;
  setOneTimePdfPurchased:  (v: boolean) => void;
  resetSubscription:       () => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      trialStartDate:      null,
      isPremiumPaid:       false,
      hasUsedTrialPdf:     false,
      oneTimePdfPurchased: false,

      startTrial: () =>
        set((s) => s.trialStartDate ? {} : { trialStartDate: new Date().toISOString() }),

      setPremiumPaid:         (v) => set({ isPremiumPaid: v }),
      markTrialPdfUsed:       ()  => set({ hasUsedTrialPdf: true }),
      setOneTimePdfPurchased: (v) => set({ oneTimePdfPurchased: v }),

      resetSubscription: () => set({
        trialStartDate: null, isPremiumPaid: false,
        hasUsedTrialPdf: false, oneTimePdfPurchased: false,
      }),
    }),
    {
      name:    'diabeasy-subscription',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
