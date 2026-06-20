import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PrototypeIcon } from '@/components/ui/PrototypeIcon';
import {
  redesignColors,
  redesignRadii,
  redesignShadows,
} from '@/constants/redesignTokens';

const TAB_META = {
  index: { label: 'Today', icon: 'sunrise', color: redesignColors.teal },
  tools: { label: 'Tools', icon: 'library', color: redesignColors.amber },
  journey: { label: 'Journey', icon: 'pen', color: redesignColors.blue },
  settings: { label: 'Settings', icon: 'user', color: redesignColors.lavender },
} as const;

const FAB_TABS = new Set(['index', 'tools', 'journey']);

const sponsorImages: Record<string, any> = {
  cowboy: require('@/assets/images/cowboy_pete2.webp'),
  cosign: require('@/assets/images/new_co-sign_sally.webp'),
  fresh: require('@/assets/images/fresh_freddie4.webp'),
  grace: require('@/assets/images/gentle_grace3.webp'),
  'mama-jo': require('@/assets/images/mamma_jo.webp'),
  salty: require('@/assets/images/salty_sam4.webp'),
  supportive: require('@/assets/images/steady_eddie4.webp'),
};

export function RedesignTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeRoute = state.routes[state.index]?.name;
  const [lastSponsor, setLastSponsor] = useState('supportive');
  const visibleRoutes = state.routes.filter(
    (route: { name: string }) => route.name in TAB_META,
  );

  useEffect(() => {
    AsyncStorage.getItem('aa-chat-sponsor-type')
      .then(value => {
        if (value) setLastSponsor(value);
      })
      .catch(() => {});
  }, [activeRoute]);

  const openLastSponsor = async () => {
    const lastSponsor =
      (await AsyncStorage.getItem('aa-chat-sponsor-type')) || 'supportive';
    setLastSponsor(lastSponsor);
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
            <Image
              source={sponsorImages[lastSponsor] || sponsorImages.supportive}
              style={styles.fabImage}
              resizeMode="cover"
            />
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
              <View style={[
                styles.iconWrap,
                selected && [styles.iconWrapSelected, { backgroundColor: meta.color }],
              ]}>
                <PrototypeIcon
                  name={meta.icon}
                  size={20}
                  color={selected ? redesignColors.white : redesignColors.inkMuted}
                  stroke={selected ? 2.1 : 1.8}
                />
              </View>
              <AppText
                size={11}
                weight={selected ? 'semiBold' : 'medium'}
                color={selected ? meta.color : redesignColors.inkMuted}
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
    borderColor: redesignColors.white,
    zIndex: 20,
    overflow: 'hidden',
    ...redesignShadows.floating,
  },
  fabImage: {
    height: '100%',
    width: '100%',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
});
