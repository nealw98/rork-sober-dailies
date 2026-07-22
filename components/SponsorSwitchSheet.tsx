// Sponsor switcher — the quick-switch panel extracted from sponsor-chat.tsx so
// other screens (Spot Check's "Change" chip) can reuse it. Presentational only:
// callers own the open/close state and what selecting a sponsor means
// (sponsor-chat re-routes; Spot Check just swaps local state). Renders a
// backdrop + an absolutely-positioned panel; parents must be positioned
// containers (flex screens are).
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { SPONSORS, type SponsorConfig } from '@/constants/sponsors';
import { SELECTION_SPONSOR_IDS, BR_INK as BR_INK_LIGHT, BR_SOFT as BR_SOFT_LIGHT } from '@/constants/sponsorTones';
import { SponsorType } from '@/types';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const SWITCHERS = SELECTION_SPONSOR_IDS
  .map((id) => SPONSORS.find((s) => s.id === id))
  .filter(Boolean) as SponsorConfig[];

export function SponsorSwitchSheet({
  current, onSelect, onClose, top, showMeetAllThree = false,
}: {
  current: SponsorType | string;
  onSelect: (id: SponsorType) => void;
  onClose: () => void;
  top: number; // vertical offset for the panel (callers' headers differ)
  showMeetAllThree?: boolean;
}) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark } = useTokens();
  const BR_INK = isDark ? colors.primaryDark : BR_INK_LIGHT;
  const BR_SOFT = isDark ? colors.primarySoft : BR_SOFT_LIGHT;
  return (
    <>
      <Pressable style={styles.ddBackdrop} onPress={onClose} />
      <View style={[styles.dropdown, { top }]}>
        <Text style={styles.ddHead}>SWITCH SPONSOR</Text>
        {SWITCHERS.map((sp) => {
          const isCurrent = sp.id === current;
          return (
            <Pressable key={sp.id} style={[styles.ddRow, isCurrent && { backgroundColor: BR_SOFT }]} onPress={() => onSelect(sp.id as SponsorType)}>
              <Image source={sp.avatar} style={styles.ddAvatar} contentFit="cover" />
              <Text style={styles.ddName}>{sp.name}</Text>
              {isCurrent && <Check size={16} color={BR_INK} strokeWidth={2.4} />}
            </Pressable>
          );
        })}
        {showMeetAllThree && (
          <>
            <View style={styles.ddDivider} />
            <Pressable style={styles.ddAction} onPress={() => { onClose(); router.replace('/(main)/chat'); }}>
              <Text style={styles.ddActionText}>Meet all three</Text>
              <ChevronRight size={15} color={c.textMuted} strokeWidth={2} />
            </Pressable>
          </>
        )}
      </View>
    </>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  const hairline = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.06)';
  return StyleSheet.create({
    ddBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
    dropdown: { position: 'absolute', left: 14, width: 232, zIndex: 30, backgroundColor: isDark ? c.surfaceRaised : c.surface, borderRadius: 16, borderWidth: 1, borderColor: hairline, padding: 6, ...shadows.lg },
    ddHead: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1, color: c.textMuted, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6 },
    ddRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 11 },
    ddAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#fff' },
    ddName: { flex: 1, fontFamily: fontFamily.bold, fontSize: 14, color: c.text },
    ddDivider: { height: 1, backgroundColor: isDark ? c.divider : 'rgba(26,26,46,0.07)', marginHorizontal: 8, marginVertical: 6 },
    ddAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 11 },
    ddActionText: { fontFamily: fontFamily.semiBold, fontSize: 13, color: c.textSecondary },
  });
};
