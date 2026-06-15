import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { PressBtn } from './PressBtn';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function UpgradeModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { setPremiumPaid, setOneTimePdfPurchased } = useSubscriptionStore();
  const t = useTranslation();

  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingPackages, setFetchingPackages] = useState(true);

  useEffect(() => {
    if (!visible) return;
    fetchPackages();
  }, [visible]);

  const fetchPackages = async () => {
    try {
      setFetchingPackages(true);
      const offerings = await Purchases.getOfferings();
      const offering = offerings.all['premium_offering'] ?? offerings.current;
      if (offering) {
        const monthly = offering.availablePackages.find(p => p.identifier === '$rc_monthly') ?? null;
        const yearly = offering.availablePackages.find(p => p.identifier === '$rc_annual') ?? null;
        setMonthlyPackage(monthly);
        setYearlyPackage(yearly);
      }
    } catch (e) {
      console.error('RC fetchPackages error:', e);
    } finally {
      setFetchingPackages(false);
    }
  };

  const handleSubscribe = async (pkg: PurchasesPackage | null) => {
    if (!pkg) return;
    try {
      setLoading(true);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['premium']) {
        setPremiumPaid(true);
        onClose();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e.message ?? 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOneTimePdf = async () => {
    try {
      setLoading(true);
      const { customerInfo } = await Purchases.purchaseStoreProduct(
        await Purchases.getProducts(['diabeasy_pdf_export']).then(p => p[0])
      );
      if (customerInfo.nonSubscriptionTransactions.some(t => t.productIdentifier === 'diabeasy_pdf_export')) {
        setOneTimePdfPurchased(true);
        onClose();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e.message ?? 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['premium']) {
        setPremiumPaid(true);
        Alert.alert('Restored!', 'Your premium access has been restored.');
        onClose();
      } else {
        Alert.alert('Nothing to restore', 'No active premium subscription found.');
      }
    } catch (e: any) {
      Alert.alert('Restore failed', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const monthlyPrice = monthlyPackage?.product.priceString ?? '€3.99';
  const yearlyPrice = yearlyPackage?.product.priceString ?? '€35.99';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: colors.bg }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>

            <Text style={[s.title, { color: colors.red }]}>{t.diabeasyPremium}</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>{t.upgradeForFullExperience}</Text>

            <View style={s.compareRow}>
              <View style={[s.col, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[s.colHeader, { color: colors.textMuted }]}>{t.freeLabel}</Text>
                {t.freeFeatures.map((f, i) => (
                  <View key={i} style={s.featureRow}>
                    <Text style={[s.featureIcon, { color: colors.textMuted }]}>○</Text>
                    <Text style={[s.featureText, { color: colors.textMuted }]}>{f}</Text>
                  </View>
                ))}
              </View>

              <View style={[s.col, s.premiumCol, { backgroundColor: colors.bgCard, borderColor: colors.red }]}>
                <Text style={[s.colHeader, { color: colors.red }]}>{t.premiumLabel}</Text>
                {t.premiumFeatures.map((f, i) => (
                  <View key={i} style={s.featureRow}>
                    <Text style={[s.featureIcon, { color: colors.red }]}>✓</Text>
                    <Text style={[s.featureText, { color: colors.text }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>

            {fetchingPackages ? (
              <ActivityIndicator color={colors.red} style={{ marginVertical: 16 }} />
            ) : (
              <>
                <PressBtn
                  style={[s.primaryBtn, { backgroundColor: colors.red }, s.btnShadow]}
                  onPress={() => handleSubscribe(monthlyPackage)}
                  disabled={loading}
                >
                  <Text style={s.primaryBtnText}>{t.goPremium} — {monthlyPrice}/mo</Text>
                </PressBtn>
                <Text style={[s.btnNote, { color: colors.textMuted }]}>{t.cancelAnytime}</Text>

                <PressBtn
                  style={[s.outlineBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]}
                  onPress={() => handleSubscribe(yearlyPackage)}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <Text style={[s.outlineBtnText, { color: colors.red }]}>{yearlyPrice}/yr — Save ~25%</Text>
                </PressBtn>
                <Text style={[s.btnNote, { color: colors.textMuted }]}>{t.cancelAnytime}</Text>

                <View style={[s.divider, { backgroundColor: colors.border }]} />

                <PressBtn
                  style={[s.outlineBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]}
                  onPress={handleOneTimePdf}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <Text style={[s.outlineBtnText, { color: colors.red }]}>{t.oneTimePdf} — €0.99</Text>
                </PressBtn>
                <Text style={[s.btnNote, { color: colors.textMuted }]}>{t.singleExport}</Text>
              </>
            )}

            {loading && <ActivityIndicator color={colors.red} style={{ marginVertical: 8 }} />}

            <TouchableOpacity onPress={handleRestore} activeOpacity={0.7} style={s.restoreLink}>
              <Text style={[s.closeLinkText, { color: colors.textMuted }]}>Restore purchases</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={s.closeLink}>
              <Text style={[s.closeLinkText, { color: colors.textMuted }]}>{t.maybeLater}</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:        { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:          { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '92%' },
  title:          { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  subtitle:       { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  compareRow:     { flexDirection: 'row', gap: 10, marginBottom: 20 },
  col:            { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12 },
  premiumCol:     { borderWidth: 2 },
  colHeader:      { fontSize: 13, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  featureRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 7 },
  featureIcon:    { fontSize: 11, fontWeight: '700', marginTop: 1, width: 12 },
  featureText:    { flex: 1, fontSize: 11, lineHeight: 16 },
  primaryBtn:     { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 6 },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  btnShadow:      { shadowColor: '#7a1010', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.45, shadowRadius: 0, elevation: 4 },
  btnNote:        { fontSize: 11, textAlign: 'center', marginBottom: 16 },
  divider:        { height: 1, marginVertical: 12 },
  outlineBtn:     { borderRadius: 12, borderWidth: 1.5, paddingVertical: 13, alignItems: 'center', marginBottom: 6 },
  outlineBtnText: { fontSize: 14, fontWeight: '700' },
  restoreLink:    { alignItems: 'center', marginTop: 10, marginBottom: 4 },
  closeLink:      { alignItems: 'center', marginTop: 4 },
  closeLinkText:  { fontSize: 13 },
});