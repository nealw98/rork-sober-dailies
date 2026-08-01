// "Saved to your Journey" — the answer to a real confusion: people write an
// entry, tap Save, land back on Today, and have no idea the thing they wrote
// still exists (Neal, 2026-07-31).
//
// A snackbar rather than a dialog, for two reasons. The save has already
// happened, so there is nothing to confirm or cancel — an OK button would just
// be a tax on every entry. And the four Journey tools call router.back() the
// moment they save, so anything rendered inside a tool screen would unmount
// before it could be read. This lives at the ROOT and is driven by a
// module-level signal, so it rides over whatever screen you land on.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useThemedStyles } from '@/hooks/useTokens';

const VISIBLE_MS = 4200;

// How long a tool should linger before navigating away, so the snackbar is read
// ON the page where Save was pressed rather than appearing after the user has
// already been dropped back on Today (Neal, 2026-07-31).
export const SAVED_TOAST_LEAD_MS = 850;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Tell the user their entry landed in Journey. Call it right before navigating away. */
export function notifySaved(): void {
  listeners.forEach((fn) => fn());
}

export default function SavedSnackbar() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [shown, setShown] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = React.useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    Animated.timing(anim, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true })
      .start(({ finished }) => { if (finished) setShown(false); });
  }, [anim]);

  useEffect(() => {
    const onSaved = () => {
      setShown(true);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      timer.current = setTimeout(hide, VISIBLE_MS);
    };
    listeners.add(onSaved);
    return () => {
      listeners.delete(onSaved);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [anim, hide]);

  if (!shown) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
      ]}
    >
      <View style={styles.bar}>
        <Text style={styles.text}>Saved to your Journey</Text>
        <Pressable
          onPress={() => { hide(); router.push('/(main)/(tabs)/journey' as Href); }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="View it in Journey"
        >
          <Text style={styles.action}>View</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors } = tk;
  return StyleSheet.create({
    // Fixed offset rather than safe-area insets: this renders as a SIBLING of
    // the router Stack, where there is no SafeAreaProvider to read from. 120 clears
    // the floating tab bar and the home indicator on every current device.
    wrap: { position: 'absolute', left: 16, right: 16, bottom: 120, zIndex: 60 },
    bar: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: c.text, borderRadius: 14,
      paddingVertical: 13, paddingHorizontal: 16, ...shadows.md,
    },
    text: { flex: 1, fontFamily: fontFamily.regular, fontSize: 14.5, color: c.background },
    action: { fontFamily: fontFamily.bold, fontSize: 14.5, color: colors.primaryLight },
  });
};
