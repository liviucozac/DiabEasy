import { useEffect, useState } from 'react';
import { useSubscriptionStore } from '../store/subscriptionStore';

export const TRIAL_DAYS        = 7;
export const FREE_HISTORY_DAYS = 15;

export function useSubscription() {
  const {
    trialStartDate, isPremiumPaid,
    hasUsedTrialPdf, oneTimePdfPurchased,
    startTrial, markTrialPdfUsed,
  } = useSubscriptionStore();

  // Tick every 30 seconds so the countdown stays live
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const msElapsed   = trialStartDate ? now - new Date(trialStartDate).getTime() : 0;
  const daysElapsed = Math.floor(msElapsed / 86_400_000);
  const isTrialActive   = !!trialStartDate && daysElapsed < TRIAL_DAYS;
  const daysLeftInTrial = isTrialActive ? TRIAL_DAYS - daysElapsed : 0;

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
    startTrial,
  };
}