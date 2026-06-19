import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  BookHeart,
  MessageCircle,
  Route,
  Settings,
  Sun,
  Wrench,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import {
  redesignColors,
  redesignRadii,
  redesignShadows,
} from '@/constants/redesignTokens';

const TAB_META = {
  index: { label: 'Today', icon: Sun },
  tools: { label: 'Tools', icon: Wrench },
  journey: { label: 'Journey', icon: Route },
  settings: { label: 'Settings', icon: Settings },
} as const;

const FAB_TABS = new Set(['index', 'tools', 'journey']);

export function RedesignTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeRoute = state.routes[state.index]?.name;
  const visibleRoutes = state.routes.filter(
    (route: { name: string }) => route.name in TAB_META,
  );

  const openLastSponsor = async () => {
    const lastSponsor =
      (await AsyncStorage.getItem('aa-chat-sponsor-type')) || 'supportive';
    router.push(`/sponsor-chat?sponsor=${lastSponsor}` as any);
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {FAB_TABS.has(activeRoute) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open AI Sponsor"
          onPress={openLastSponsor}
          style={({ pressed }) => [
            styles.fab,
            { bottom: insets.bottom + 76 },
            pressed && styles.pressed,
          ]}
        >
          <MessageCircle size={23} color={redesignColors.white} strokeWidth={2} />
        </Pressable>
      )}

      <View
        style={[
          styles.bar,
          { bottom: Math.max(insets.bottom, 8) },
        ]}
      >
        {visibleRoutes.map((route: { key: string; name: keyof typeof TAB_META }) => {
          const meta = TAB_META[route.name];
          const Icon = meta.icon;
          const selected = route.name === activeRoute;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={meta.label}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!selected && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                {selected && route.name === 'index' ? (
                  <BookHeart
                    size={20}
                    color={redesignColors.white}
                    strokeWidth={2.1}
                  />
                ) : (
                  <Icon
                    size={20}
                    color={
                      selected ? redesignColors.white : redesignColors.inkMuted
                    }
                    strokeWidth={selected ? 2.2 : 1.8}
                  />
                )}
              </View>
              <AppText
                size={11}
                weight={selected ? 'semiBold' : 'medium'}
                color={selected ? redesignColors.teal : redesignColors.inkMuted}
                numberOfLines={1}
              >
                {meta.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    minHeight: 66,
    borderRadius: redesignRadii.lg,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: redesignColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    ...redesignShadows.floating,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 52,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: redesignRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: redesignColors.teal,
    transform: [{ translateY: -5 }],
    ...redesignShadows.soft,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 54,
    height: 54,
    borderRadius: redesignRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.lavender,
    borderWidth: 3,
    borderColor: redesignColors.paper,
    zIndex: 20,
    ...redesignShadows.floating,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
});

