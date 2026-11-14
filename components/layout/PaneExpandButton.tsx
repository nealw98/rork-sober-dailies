// "Expand" — the wide layouts' escape hatch from a detail pane to the full
// screen (handoff: the right pane is the content, but you can take it over
// the whole display). A round 34pt button matching the readers' aA/share
// chrome. Renders nothing unless it has something to do: pass `onPress`, or
// let it pick up `expand` from the enclosing PaneProvider.
//
// On the full-screen route an expand pushed (useExpandedRoute) the same
// button turns into Collapse, so the control toggles in place and is that
// screen's only way back (BackButton hides there). `onCollapse` overrides
// the plain router.back() for screens whose exit asks first (Spot Check).
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Maximize2, Minimize2 } from 'lucide-react-native';
import { type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { usePane, useExpandedRoute } from '@/components/layout/PaneContext';

export default function PaneExpandButton({ onPress, onCollapse }: { onPress?: () => void; onCollapse?: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const router = useRouter();
  const pane = usePane();
  const collapse = useExpandedRoute();
  const action = collapse ? (onCollapse ?? (() => router.back())) : (onPress ?? pane?.expand);
  if (!action) return null;
  const Glyph = collapse ? Minimize2 : Maximize2;
  return (
    <Pressable
      onPress={action}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={collapse ? 'Collapse' : 'Expand to full screen'}
      style={styles.btn}
    >
      <Glyph size={15} color={c.textSecondary} strokeWidth={2} />
    </Pressable>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  return StyleSheet.create({
    btn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
      ...(isDark ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' } : null),
    },
  });
};
