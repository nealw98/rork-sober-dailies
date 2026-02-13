import { Tabs, router, Stack, usePathname } from "expo-router";
import React from "react";
import { Text, View, StyleSheet, Platform, TouchableOpacity, StatusBar } from "react-native";
import SunIcon from "@/components/SunIcon";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ChevronLeft } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { adjustFontWeight, getScreenPadding } from "@/constants/fonts";

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    maxWidth: '100%'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600', true),
    flexShrink: 0,
    textAlign: 'center'
  },
  screenContainer: {
    ...getScreenPadding()
  },
  tabIcon: {
    ...(Platform.OS === 'android' ? { marginTop: 2 } : {})
  },
  iconWrapper: {
    width: 42,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: '#4A90E2', // overridden by theme in TabLayout
  },
  iconWrapperInactive: {
    backgroundColor: '#F0F4FF',
  },
  iconOutlined: {
    opacity: 1,
  },
  iconSolid: {
    opacity: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginLeft: Platform.OS === 'android' ? 4 : 8,
    gap: 4,
  },
  backText: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 20,
  },

});

const BackButton = () => {
  const pathname = usePathname();
  const { palette } = useTheme();
  const handleBackPress = () => {
    try {
      // Use pathname to determine current location
      console.log('🧭 Navigation: Attempting to go back from path:', pathname);
      
      // Handle special cases for known navigation paths
      if (pathname && (pathname.includes('/bigbook') || pathname.endsWith('bigbook'))) {
        console.log('🧭 Navigation: Special case - navigating from bigbook to literature');
        router.push('/literature');
        return;
      } else if (pathname && (pathname.includes('/twelve-and-twelve') || pathname.endsWith('twelve-and-twelve'))) {
        console.log('🧭 Navigation: Special case - navigating from twelve-and-twelve to literature');
        router.push('/literature');
        return;
      } else if (pathname && (pathname.includes('/meeting-pocket') || pathname.endsWith('meeting-pocket'))) {
        console.log('🧭 Navigation: Special case - navigating from meeting-pocket to literature');
        router.push('/literature');
        return;
      } else if (pathname && (pathname.includes('/speaker-detail') || pathname.endsWith('speaker-detail'))) {
        console.log('🧭 Navigation: Special case - navigating from speaker-detail to speakers');
        router.push('/speakers');
        return;
      }
      
      // Actually navigate back for other cases
      router.back();
      
      // Log after navigation
      console.log('🧭 Navigation: router.back() called successfully');
    } catch (error) {
      console.error('🧭 Navigation: Error going back:', error);
      // Do not force home; better to no-op than surprise navigate
    }
  };

  return (
    <TouchableOpacity 
      style={styles.backButton}
      onPress={handleBackPress}
      testID="back-button"
    >
      <ChevronLeft size={20} color={palette.tint} />
      <Text style={[styles.backText, { color: palette.tint }]}>Back</Text>
    </TouchableOpacity>
  );
};

const createTabIcon = (
  IconComponent: any,
  iconName: string,
  iconSize = 20,
  extraProps: Record<string, any> = {}
) => ({ focused }: { color: string; size: number; focused: boolean }) => {
  const wrapperStyle = focused ? styles.iconWrapperActive : styles.iconWrapperInactive;
  const iconColor = focused ? '#FFFFFF' : '#2F5EA6';
  return (
    <View style={[styles.iconWrapper, wrapperStyle]}>
      <IconComponent
        name={iconName}
        size={iconSize}
        color={iconColor}
        {...extraProps}
        style={focused ? styles.iconSolid : styles.iconOutlined}
      />
    </View>
  );
};

const createOutlineTabIcon = (
  outlineName: string,
  filledName: string,
  tintColor: string,
  iconSize = 22
) => ({ focused }: { color: string; size: number; focused: boolean }) => {
  const iconColor = focused ? tintColor : '#8E8E93';
  const iconName = focused ? filledName : outlineName;
  return (
    <Ionicons
      name={iconName as any}
      size={iconSize}
      color={iconColor}
    />
  );
};

export default function TabLayout() {
  const { palette } = useTheme();
  return (
      <Tabs
        screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: true,
        headerTitleAlign: 'center',
        headerLeft: ({ canGoBack }) => canGoBack ? <BackButton /> : null,
        tabBarHideOnKeyboard: Platform.OS === 'android' ? true : undefined,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: palette.background,
          height: Platform.OS === 'android' ? 70 : 84,
          paddingBottom: Platform.OS === 'android' ? 14 : 28,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: palette.border,
        },
        headerStyle: {
          backgroundColor: palette.cardBackground,
        },
        headerStatusBarHeight: Platform.OS === 'android' ? StatusBar.currentHeight : undefined,
        headerTitleStyle: {
          fontWeight: adjustFontWeight("600", true),
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        lazy: false, // Pre-load all tabs to ensure tab bar is always available
        }}
      >
      {/* Main Tab: Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <SunIcon size={24} />
              <Text style={styles.headerTitle}>
                Sober Dailies
              </Text>
            </View>
          ),
          tabBarIcon: createOutlineTabIcon('home-outline', 'home', palette.tint),
        }}
      />

      {/* Tab 1: Daily Reflection */}
      <Tabs.Screen
        name="daily-reflections"
        options={{
          title: "Reflection",
          headerShown: false,
          tabBarIcon: createOutlineTabIcon('calendar-outline', 'calendar', palette.tint),
        }}
      />

      {/* Tab 2: AI Sponsor */}
      <Tabs.Screen
        name="chat"
        options={{
          title: "Sponsor",
          headerShown: false,
          tabBarHideOnKeyboard: Platform.OS === 'android' ? true : undefined,
          tabBarIcon: createOutlineTabIcon('chatbubble-outline', 'chatbubble', palette.tint),
        }}
      />

      {/* Tab 3: Literature */}
      <Tabs.Screen
        name="literature"
        options={{
          title: "Literature",
          headerShown: false,
          tabBarIcon: createOutlineTabIcon('book-outline', 'book', palette.tint),
        }}
      />

      {/* Tools - Hidden from tab bar (accessible from home page) */}
      <Tabs.Screen
        name="tools"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      {/* Tab 4: Settings */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          headerShown: false,
          tabBarIcon: createOutlineTabIcon('settings-outline', 'settings', palette.tint),
        }}
      />

      {/* Hidden tabs - accessible from home but not in tab bar */}
      <Tabs.Screen
        name="gratitude"
        options={{
          href: null,
          title: "Gratitude",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          href: null,
          title: "Prayers",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="evening-review"
        options={{
          href: null,
          title: "Review",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          href: null,
          title: "Spot Check",
          headerShown: true,
          headerTitle: '',
          headerLeft: () => <BackButton />,
        }}
      />

      {/* Stack screens that should maintain the tab bar */}
      <Tabs.Screen
        name="bigbook"
        options={{
          href: null, // Hide from tab bar
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="twelve-and-twelve"
        options={{
          href: null, // Hide from tab bar
          headerShown: false,
          headerTitle: '',
          headerLeft: () => <BackButton />,
        }}
      />
      <Tabs.Screen
        name="meeting-pocket"
        options={{
          href: null, // Hide from tab bar
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          headerTitle: '',
          headerLeft: () => <BackButton />,
        }}
      />
      <Tabs.Screen
        name="add-contact"
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          headerTitle: '',
          headerLeft: () => <BackButton />,
        }}
      />
      <Tabs.Screen
        name="modal"
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          headerTitle: '',
          headerLeft: () => <BackButton />,
        }}
      />
      <Tabs.Screen
        name="speakers"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="speaker-detail"
        options={{
          href: null,
          headerShown: false,
        }}
      />

    </Tabs>
  );
}