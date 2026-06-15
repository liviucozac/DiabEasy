import { useEffect } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { useSubscriptionStore } from '../store/subscriptionStore';

export function useEntitlements() {
  const { setPremiumPaid } = useSubscriptionStore();

  useEffect(() => {
    const check = async () => {
      try {
        const info: CustomerInfo = await Purchases.getCustomerInfo();
        const isPremium = !!info.entitlements.active['premium'];
        setPremiumPaid(isPremium);
      } catch (e) {
        console.error('RevenueCat check failed:', e);
      }
    };
    check();

    Purchases.addCustomerInfoUpdateListener((info) => {
      const isPremium = !!info.entitlements.active['premium'];
      setPremiumPaid(isPremium);
    });
  }, []);
}