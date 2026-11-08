import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { fontFamily, fontSize, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

// One-time coach mark on Today, right after onboarding (R8): the screen dims,
// the first dailies section stays lit, and a card points at its Edit (pencil)
// control. Onboarding no longer has a "define your dailies" step — everyone
// starts on the six defaults — so this is where Edit gets introduced.
//
// Targets are window coordinates (measureInWindow), so it lines up the same in
// the compact layout and in the expanded list column.

export type TipRect = { x: number; y: number; width: number; height: number };

const PAD = 8;       // lit margin around the section
const RADIUS = 20;   // the lit hole's corner radius

// The dim layer: the whole window with a rounded-rect hole, as one even-odd
// path (dim strips can only cut a square hole, which leaves the corners
// outside the rounded ring undimmed).
function dimPath(w: number, h: number, x: number, y: number, hw: number, hh: number, r: number): string {
  return [
    `M0 0H${w}V${h}H0Z`,
    `M${x + r} ${y}H${x + hw - r}A${r} ${r} 0 0 1 ${x + hw} ${y + r}V${y + hh - r}A${r} ${r} 0 0 1 ${x + hw - r} ${y + hh}`,
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + hh - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`,
  ].join('');
}
const GAP = 16;      // card ↔ section
const ARROW = 18;

export default function EditDailiesTip({ section, edit, onDismiss }: {
  section: TipRect;
  edit: TipRect;
  onDismiss: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTokens();
  const dimColor = isDark ? 'rgba(0,0,0,0.72)' : 'rgba(23,26,34,0.55)';
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [cardH, setCardH] = useState(0);

  const hole = {
    x: Math.max(0, section.x - PAD),
    y: Math.max(0, section.y - PAD),
    w: Math.min(winW, section.width + PAD * 2),
    h: Math.min(winH - Math.max(0, section.y - PAD), section.height + PAD * 2),
  };
  // Card sits above the lit section when there's room (the usual case: the
  // counter and reflection hero sit above the dailies), else below the
  // section's header row so the Edit control stays visible.
  const roomAbove = hole.y - GAP - insets.top - 8;
  const above = cardH === 0 || roomAbove >= cardH;
  // The Modal draws in its own window, outside the app root's SideInsetGuard,
  // so the card keeps out of the Duo's side strips itself (0 on other phones).
  const minLeft = insets.left + 16;
  const maxRight = winW - insets.right - 16;
  const cardWidth = Math.min(420, Math.max(240, hole.w - 8), maxRight - minLeft);
  // Right-aligned toward the pencil (which sits at the section's right edge),
  // so on a wide column the pointer can still reach it.
  const editCenter = edit.x + edit.width / 2;
  const cardLeft = Math.min(maxRight - cardWidth, Math.max(minLeft, hole.x + 4, editCenter + 40 - cardWidth));
  const cardTop = above ? hole.y - GAP - cardH : edit.y + edit.height + GAP;
  // Arrow under (or over) the pencil, clamped inside the card's corners.
  const arrowLeft = Math.min(cardWidth - 36, Math.max(20, edit.x + edit.width / 2 - cardLeft - ARROW / 2));

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onDismiss}>
      <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        <Svg width={winW} height={winH} style={StyleSheet.absoluteFill}>
          <Path d={dimPath(winW, winH, hole.x, hole.y, hole.w, hole.h, RADIUS)} fill={dimColor} fillRule="evenodd" />
        </Svg>
        <View pointerEvents="none" style={[styles.ring, { left: hole.x, top: hole.y, width: hole.w, height: hole.h }]} />

        <View
          style={[styles.card, { left: cardLeft, width: cardWidth, top: Math.max(insets.top + 8, cardTop), opacity: cardH ? 1 : 0 }]}
          onLayout={(e) => setCardH(e.nativeEvent.layout.height)}
        >
          <View style={[styles.arrow, above ? styles.arrowDown : styles.arrowUp, { left: arrowLeft }]} />
          <Text style={styles.overline}>YOUR DAILY PRACTICES</Text>
          <Text style={styles.title} accessibilityRole="header">We started you with six simple practices</Text>
          <Text style={styles.body}>
            Check them off through the day. Tap <Text style={styles.bodyStrong}>Edit</Text> any time to add, remove or reorder — there are lots more to choose from.
          </Text>
          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={onDismiss} accessibilityRole="button">
              <Text style={styles.buttonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    ring: { position: 'absolute', borderRadius: RADIUS, borderWidth: 3, borderColor: colors.primary },
    card: { position: 'absolute', backgroundColor: isDark ? c.surfaceRaised : '#fff', borderRadius: 20, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16, ...shadows.lg },
    arrow: { position: 'absolute', width: ARROW, height: ARROW, backgroundColor: isDark ? c.surfaceRaised : '#fff', transform: [{ rotate: '45deg' }] },
    arrowDown: { bottom: -ARROW / 2 },
    arrowUp: { top: -ARROW / 2 },
    overline: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.6, color: colors.primaryDark },
    title: { fontFamily: fontFamily.displayBold, fontSize: 20, lineHeight: 25, color: c.text, marginTop: 6 },
    body: { fontFamily: fontFamily.regular, fontSize: fontSize.md, lineHeight: 20, color: c.textSecondary, marginTop: 8 },
    bodyStrong: { fontFamily: fontFamily.bold, color: c.text },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
    button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22 },
    buttonText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.base, color: '#fff' },
  });
};
