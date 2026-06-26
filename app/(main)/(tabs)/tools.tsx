import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import {
  NotebookPen,
  Heart,
  CircleCheck,
  Moon,
  Phone,
  Users,
  Settings,
  Check,
} from 'lucide-react-native';
// Prayer + Meditation use Phosphor (Lucide has no praying-hands / lotus).
import { HandsPraying, FlowerLotus } from 'phosphor-react-native';
import { fontFamily, fontSize, shadows, lighten } from '@/constants/designTokens';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useToolsWallpaper, type WallpaperKey } from '@/hooks/use-tools-wallpaper';

/**
 * Tools — a phone home screen (redesign 3.0). A swappable wallpaper, the three
 * flagship tools as photo widgets, and the rest as an app-icon grid. Pure
 * launcher: no completion, no "Add to My Day". Spec: `Today & Tools Update/Tools.md`.
 */

const INK = '#2B2A30';

type Wall = {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
  light: boolean; // light → dark ink labels; false (dusk) → white labels
};

const WALLPAPERS: Record<WallpaperKey, Wall> = {
  dawn:  { colors: ['#F6E7D6', '#EFD9DC', '#DAE2EC'], locations: [0, 0.42, 1], start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 }, light: true },
  coast: { colors: ['#C3E2DF', '#AECBEA', '#A6BBDD'], locations: [0, 0.55, 1], start: { x: 0.12, y: 0 }, end: { x: 0.88, y: 1 }, light: true },
  dusk:  { colors: ['#9690C8', '#7286BC', '#515F92'], locations: [0, 0.58, 1], start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 }, light: false },
  paper: { colors: ['#F4F1EA', '#F4F1EA'], start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 }, light: true },
};

const WALLPAPER_ORDER: WallpaperKey[] = ['dawn', 'coast', 'dusk', 'paper'];

type Tone = { solid: string; light: string };
const tone = (solid: string): Tone => ({ solid, light: lighten(solid, 0.22) });

const TONE = {
  teal: tone('#3D8B8B'),
  lavender: tone('#A386D5'),
  amber: tone('#E8A95D'),
  blue: tone('#5C8DFF'),
  coral: tone('#D36A5A'),
};

type GlyphComponent = React.ComponentType<{ size?: number; color?: string }>;

type AppDef = { id: string; name: string; tone: Tone; Icon: GlyphComponent; route: Href };

const APPS: AppDef[] = [
  { id: 'prayers', name: 'Prayers', tone: TONE.amber, Icon: HandsPraying, route: '/(main)/prayers' },
  { id: 'meditation', name: 'Meditation', tone: TONE.lavender, Icon: FlowerLotus, route: '/(main)/meditation' },
  { id: 'journal', name: 'Journal', tone: TONE.blue, Icon: NotebookPen, route: '/(main)/journal' as Href },
  { id: 'gratitude', name: 'Gratitude', tone: TONE.amber, Icon: Heart, route: '/(main)/gratitude' },
  { id: 'spotcheck', name: 'Spot Check', tone: TONE.coral, Icon: CircleCheck, route: '/(main)/inventory' },
  { id: 'nightly', name: 'Nightly Review', tone: TONE.lavender, Icon: Moon, route: '/(main)/evening-review' },
  { id: 'another', name: 'Reach Out', tone: TONE.blue, Icon: Phone, route: '/(main)/reach-out' as Href },
  { id: 'meeting', name: 'Meetings', tone: TONE.lavender, Icon: Users, route: '/(main)/meetings' },
];

// ─── App icon — gradient squircle with a label beneath ───────────────────────
function AppIcon({ app, labelColor, labelShadow, onPress }: { app: AppDef; labelColor: string; labelShadow: object; onPress: () => void }) {
  const { Icon } = app;
  return (
    <Pressable style={styles.appCell} onPress={onPress} accessibilityRole="button" accessibilityLabel={app.name}>
      <View style={[styles.iconShadow, { shadowColor: app.tone.solid }]}>
        <LinearGradient
          colors={[app.tone.light, app.tone.solid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.55, y: 1 }}
          style={styles.iconFill}
        >
          {/* tactile top highlight (replaces the web inset highlight) */}
          <LinearGradient
            colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
            style={styles.iconHighlight}
            pointerEvents="none"
          />
          <Icon size={28} color="#fff" />
        </LinearGradient>
      </View>
      <Text style={[styles.appLabel, { color: labelColor }, labelShadow]} numberOfLines={1}>{app.name}</Text>
    </Pressable>
  );
}

// ─── Photo widget — rounded tile + label beneath (Maps/Calendar style) ───────
function ToolWidget({ image, label, wide, labelColor, labelShadow, onPress }: { image: any; label: string; wide?: boolean; labelColor: string; labelShadow: object; onPress: () => void }) {
  return (
    <Pressable style={wide ? styles.widgetWide : styles.widgetSquare} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.widgetTile, wide ? styles.widgetTileWide : styles.widgetTileSquare]}>
        <Image source={image} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
      <Text style={[styles.widgetLabel, { color: labelColor }, labelShadow]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

// ─── Wallpaper picker popover (anchored top-right) ───────────────────────────
function WallpaperPicker({ current, top, onPick, onClose }: { current: WallpaperKey; top: number; onPick: (w: WallpaperKey) => void; onClose: () => void }) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <View style={[styles.pickerCard, { top }]}>
          <Text style={styles.pickerTitle}>Wallpaper</Text>
          <View style={styles.swatchRow}>
            {WALLPAPER_ORDER.map((key) => {
              const w = WALLPAPERS[key];
              const selected = key === current;
              return (
                <Pressable key={key} onPress={() => onPick(key)} style={styles.swatchWrap} accessibilityLabel={key}>
                  <LinearGradient
                    colors={w.colors}
                    locations={w.locations}
                    start={w.start}
                    end={w.end}
                    style={[styles.swatch, selected && styles.swatchSelected]}
                  >
                    {selected && (
                      <View style={styles.swatchCheck}>
                        <Check size={12} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </LinearGradient>
                  <Text style={styles.swatchLabel}>{key[0].toUpperCase() + key.slice(1)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function ToolsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wallpaper, setWallpaper } = useToolsWallpaper();
  const [pickerOpen, setPickerOpen] = useState(false);
  useScreenTimeTracking('Tools');

  const wall = WALLPAPERS[wallpaper];
  const labelColor = wall.light ? INK : '#fff';
  const labelShadow = wall.light
    ? { textShadowColor: 'rgba(255,255,255,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }
    : { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 };
  const gearBorder = wall.light ? 'rgba(43,42,48,0.30)' : 'rgba(255,255,255,0.55)';

  return (
    <View style={styles.root}>
      {/* Wallpaper layer */}
      <LinearGradient
        colors={wall.colors}
        locations={wall.locations}
        start={wall.start}
        end={wall.end}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header with gear */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: labelColor }, labelShadow]}>Tools</Text>
            <Text style={[styles.subtitle, { color: labelColor }, labelShadow]}>Open any tool</Text>
          </View>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={[styles.gear, { borderColor: gearBorder }]}
            accessibilityRole="button"
            accessibilityLabel="Change wallpaper"
            hitSlop={8}
          >
            <Settings size={15} color={labelColor} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Featured widgets */}
          <ToolWidget
            image={require('@/assets/images/literature-hero.webp')}
            label="Literature"
            wide
            labelColor={labelColor}
            labelShadow={labelShadow}
            onPress={() => router.push('/(main)/literature')}
          />
          <View style={styles.widgetPair}>
            <ToolWidget
              image={require('@/assets/images/speaker-hero.webp')}
              label="Speaker Tapes"
              labelColor={labelColor}
              labelShadow={labelShadow}
              onPress={() => router.push('/(main)/speakers')}
            />
            <ToolWidget
              image={require('@/assets/images/ai_sponsor_hero.webp')}
              label="AI Sponsor"
              labelColor={labelColor}
              labelShadow={labelShadow}
              onPress={() => router.push('/(main)/chat')}
            />
          </View>

          {/* App-icon grid */}
          <View style={styles.grid}>
            {APPS.map((app) => (
              <AppIcon
                key={app.id}
                app={app}
                labelColor={labelColor}
                labelShadow={labelShadow}
                onPress={() => router.push(app.route)}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {pickerOpen && (
        <WallpaperPicker
          current={wallpaper}
          top={insets.top + 52}
          onPick={(w) => { setWallpaper(w); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 10 },
  title: { fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.5 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: fontSize.md, marginTop: 2 },
  gear: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },

  scroll: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 120 },

  // Widgets
  widgetWide: { marginBottom: 18 },
  widgetSquare: { flex: 1 },
  widgetPair: { flexDirection: 'row', gap: 14, marginBottom: 22 },
  widgetTile: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.25)',
    ...shadows.md,
  },
  widgetTileWide: { width: '100%', aspectRatio: 16 / 9 },
  widgetTileSquare: { width: '100%', aspectRatio: 1, borderRadius: 20 },
  widgetLabel: { fontFamily: fontFamily.semiBold, fontSize: 13, textAlign: 'center', marginTop: 8 },

  // App-icon grid
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  appCell: { width: '25%', alignItems: 'center', marginBottom: 20 },
  iconShadow: {
    borderRadius: 15,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  iconFill: { width: 60, height: 60, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iconHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  appLabel: { fontFamily: fontFamily.medium, fontSize: 11.5, textAlign: 'center', marginTop: 7 },

  // Wallpaper picker popover
  pickerBackdrop: { flex: 1 },
  pickerCard: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#FFFDF8',
    borderRadius: 18,
    padding: 14,
    width: 250,
    borderWidth: 1,
    borderColor: 'rgba(120,98,60,0.13)',
    ...shadows.lg,
  },
  pickerTitle: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: '#8A8A9A', marginBottom: 10, marginLeft: 2 },
  swatchRow: { flexDirection: 'row', justifyContent: 'space-between' },
  swatchWrap: { alignItems: 'center', width: 50 },
  swatch: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderWidth: 2, borderColor: '#3D8B8B' },
  swatchCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(61,139,139,0.92)', alignItems: 'center', justifyContent: 'center' },
  swatchLabel: { fontFamily: fontFamily.medium, fontSize: 10.5, color: '#4A4A5E', marginTop: 5 },
});
