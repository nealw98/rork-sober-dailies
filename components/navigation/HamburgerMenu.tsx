import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Home,
  Mic,
  MessageCircle,
  BookOpen,
  Heart,
  NotebookPen,
  Settings,
} from 'lucide-react-native';
import { useHamburgerMenu } from '@/hooks/useHamburgerMenu';
import {
  colors,
  semanticColors,
  spacing,
  radii,
  fontFamily,
  fontSize,
} from '@/constants/designTokens';

const MENU_WIDTH = 280;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const sem = semanticColors.light;

interface MenuItem {
  label: string;
  icon: any;
  route: string | null;
  disabled?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Home', icon: Home, route: '/(main)/' },
  { label: 'Speakers', icon: Mic, route: '/(main)/speakers' },
  { label: 'AI Sponsor', icon: MessageCircle, route: '/(main)/chat' },
  { label: 'Literature', icon: BookOpen, route: '/(main)/literature' },
  { label: 'Prayers', icon: Heart, route: '/(main)/prayers' },
  { label: 'Notebook', icon: NotebookPen, route: null, disabled: true },
  { label: 'Settings', icon: Settings, route: '/(main)/settings' },
];

export default function HamburgerMenu() {
  const { isOpen, close } = useHamburgerMenu();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH - MENU_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleNavigate = (route: string) => {
    close();
    setTimeout(() => {
      router.push(route as any);
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: backdropAnim },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={close}
        />
      </Animated.View>

      {/* Menu Panel */}
      <Animated.View
        style={[
          styles.panel,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={[styles.panelInner, { paddingTop: insets.top + spacing.md }]}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={close}
            activeOpacity={0.7}
          >
            <X size={24} color={sem.text} />
          </TouchableOpacity>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {MENU_ITEMS.map((item) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    item.disabled && styles.menuItemDisabled,
                  ]}
                  onPress={() => item.route && handleNavigate(item.route)}
                  disabled={item.disabled}
                  activeOpacity={0.7}
                >
                  <IconComponent
                    size={20}
                    color={item.disabled ? sem.textMuted : sem.text}
                  />
                  <Text
                    style={[
                      styles.menuLabel,
                      item.disabled && styles.menuLabelDisabled,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.disabled && (
                    <Text style={styles.comingSoon}>Soon</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  panelInner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  menuItems: {
    gap: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.md,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    color: sem.text,
    flex: 1,
  },
  menuLabelDisabled: {
    color: sem.textMuted,
  },
  comingSoon: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: sem.textMuted,
    backgroundColor: sem.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
});
