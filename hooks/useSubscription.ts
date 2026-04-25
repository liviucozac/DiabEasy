import { useEffect } from 'react';
import { useSubscriptionStore } from '../store/subscriptionStore';

export const TRIAL_DAYS       = 14;
export const FREE_HISTORY_DAYS = 15;

export function useSubscription() {
  const {
    trialStartDate, isPremiumPaid,
    hasUsedTrialPdf, oneTimePdfPurchased,
    startTrial, markTrialPdfUsed,
  } = useSubscriptionStore();

  // Auto-start 14-day trial on very first app open
  useEffect(() => {
    if (!trialStartDate) startTrial();
  }, []);

  const msElapsed   = trialStartDate ? Date.now() - new Date(trialStartDate).getTime() : 0;
  const daysElapsed = Math.floor(msElapsed / 86_400_000);
  const isTrialActive    = !!trialStartDate && daysElapsed < TRIAL_DAYS;
  const daysLeftInTrial  = isTrialActive ? TRIAL_DAYS - daysElapsed : 0;

  const isPremium          = isPremiumPaid || isTrialActive;
  const canUseBle          = isPremium;
  const canUseFullPdf      = isPremiumPaid || oneTimePdfPurchased || (isTrialActive && !hasUsedTrialPdf);
  const canUseFirebaseSync = isPremiumPaid;

  return {
    isTrialActive,
    daysLeftInTrial,
    isPremium,
    isPremiumPaid,
    canUseBle,
    canUseFullPdf,
    canUseFirebaseSync,
    hasUsedTrialPdf,
    oneTimePdfPurchased,
    markTrialPdfUsed,
  };
}
