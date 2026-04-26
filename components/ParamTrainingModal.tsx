import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Modal, Dimensions,
} from 'react-native';
import { useTheme } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDE_ICONS = ['📉', '🍽️', '🎯', '⏱️'];

export function ParamTrainingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, isDark } = useTheme();
  const t = useTranslation();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const TOTAL = t.trainingSlides.length;

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
    setPage(idx);
  };

  const handleClose = () => { setPage(0); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={tr.overlay}>
        <View style={[tr.sheet, { backgroundColor: colors.bg, shadowColor: isDark ? '#000' : '#6070a0' }]}>

          <View style={tr.header}>
            <Text style={[tr.headerTitle, { color: colors.text }]}>{t.understandingParams}</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Close" accessibilityRole="button">
              <Text style={[tr.closeX, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
          >
            {t.trainingSlides.map((slide, i) => (
              <ScrollView key={i} style={{ width: SCREEN_W }} contentContainerStyle={tr.slide} showsVerticalScrollIndicator={false}>
                <Text style={tr.slideIcon}>{SLIDE_ICONS[i]}</Text>
                <Text style={[tr.slideTitle, { color: colors.text }]}>{slide.title}</Text>
                <Text style={[tr.slideBody, { color: colors.textMuted }]}>{slide.body}</Text>

                <View style={[tr.exampleBox, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                  <Text style={[tr.exampleLabel, { color: colors.red }]}>{t.exampleLabel}</Text>
                  <Text style={[tr.exampleText, { color: colors.text }]}>{slide.example}</Text>
                </View>

                <View style={[tr.tipBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <Text style={[tr.tipText, { color: colors.textMuted }]}>💡 {slide.tip}</Text>
                </View>
              </ScrollView>
            ))}
          </ScrollView>

          <View style={tr.dotsRow}>
            {Array.from({ length: TOTAL }, (_, i) => (
              <View key={i} style={[tr.dot, { backgroundColor: i === page ? colors.red : colors.border, width: i === page ? 16 : 8 }]} />
            ))}
          </View>

          <View style={tr.navRow}>
            {page > 0 && (
              <TouchableOpacity onPress={() => goTo(page - 1)} activeOpacity={0.75} style={[tr.navBtn, { borderColor: colors.border }]} accessibilityLabel="Previous slide" accessibilityRole="button">
                <Text style={[tr.navBtnText, { color: colors.textMuted }]}>{t.backBtn}</Text>
              </TouchableOpacity>
            )}
            {page < TOTAL - 1 ? (
              <TouchableOpacity onPress={() => goTo(page + 1)} activeOpacity={0.8} style={[tr.navBtn, tr.navBtnPrimary, { backgroundColor: colors.red }]} accessibilityLabel={`Next slide, ${page + 2} of ${TOTAL}`} accessibilityRole="button">
                <Text style={[tr.navBtnText, { color: '#fff' }]}>{t.nextBtn}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleClose} activeOpacity={0.8} style={[tr.navBtn, tr.navBtnPrimary, { backgroundColor: colors.red }]} accessibilityLabel="Done, close guide" accessibilityRole="button">
                <Text style={[tr.navBtnText, { color: '#fff' }]}>{t.gotIt}</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}

const tr = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:         { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingBottom: 36, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 20 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  headerTitle:   { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 12 },
  closeX:        { fontSize: 18, fontWeight: '600' },
  slide:         { width: SCREEN_W, paddingHorizontal: 20, paddingBottom: 12, alignItems: 'center' },
  slideIcon:     { fontSize: 40, marginBottom: 10 },
  slideTitle:    { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  slideBody:     { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 12 },
  exampleBox:    { width: '100%', borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 10 },
  exampleLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  exampleText:   { fontSize: 13, lineHeight: 20 },
  tipBox:        { width: '100%', borderRadius: 10, borderWidth: 1, padding: 10 },
  tipText:       { fontSize: 12, lineHeight: 18 },
  dotsRow:       { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14 },
  dot:           { height: 8, borderRadius: 4 },
  navRow:        { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 20 },
  navBtn:        { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, alignItems: 'center' },
  navBtnPrimary: { borderWidth: 0 },
  navBtnText:    { fontSize: 14, fontWeight: '700' },
});
