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

import Colors from "@/constants/colors";
import { adjustFontWeight, getScreenPadding } from "@/constants/fonts";
import { TextSettingsProvider } from "@/hooks/use-text-settings";

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
    backgroundColor: Colors.light.tint,
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
    color: Colors.light.tint,
    fontWeight: '400',
    lineHeight: 20,
  },

});

const BackButton = () => {
  const pathname = usePathname();
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
      <ChevronLeft size={20} color={Colors.light.tint} />
      <Text style={styles.backText}>Back</Text>
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

export default function TabLayout() {
  return (
    <TextSettingsProvider>
      <Tabs
        screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: '#E2E8F0',
        headerShown: true,
        headerBackTitle: "",

        headerTitleAlign: 'center',
        headerLeft: ({ canGoBack }) => canGoBack ? <BackButton /> : null,
        tabBarHideOnKeyboard: Platform.OS === 'android' ? true : undefined,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          height: Platform.OS === 'android' ? 64 : 72,
          paddingBottom: Platform.OS === 'android' ? 10 : 16,
          paddingTop: Platform.OS === 'android' ? 6 : 10,
          paddingHorizontal: Platform.OS === 'android' ? 4 : 12,
          display: 'flex', // Always show tab bar
          borderTopColor: '#E4E7EC',
        },
        headerStyle: {
          backgroundColor: "#f8f9fa",
        },
        headerStatusBarHeight: Platform.OS === 'android' ? StatusBar.currentHeight : undefined,
        headerTitleStyle: {
          fontWeight: adjustFontWeight("600", true),
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'android' ? 4 : 0,
        },
        lazy: false, // Pre-load all tabs to ensure tab bar is always available
        }}
      >
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
          tabBarIcon: createTabIcon(Entypo, 'home', 20),
        }}
      />

      <Tabs.Screen
        name="gratitude"
        options={{
          title: "Gratitude",
          headerTitle: '',
          headerLeft: () => <BackButton />,
          tabBarIcon: createTabIcon(FontAwesome6, 'face-smile', 18, { solid: true }),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Sponsor",
          headerTitle: '',
          headerLeft: () => <BackButton />,
          // Android-only: hide tab bar when keyboard is open on the chat screen
          tabBarHideOnKeyboard: Platform.OS === 'android' ? true : undefined,
          tabBarIcon: createTabIcon(MaterialCommunityIcons, 'human-greeting-variant', 22),
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          title: "Prayers",
          headerTitle: '',
          headerLeft: () => <BackButton />,
          tabBarIcon: createTabIcon(FontAwesome6, 'hands-praying', 20),
        }}
      />
      <Tabs.Screen
        name="literature"
        options={{
          title: "Literature",
          headerTitle: '',
          headerLeft: () => <BackButton />,
          tabBarIcon: createTabIcon(FontAwesome, 'book', 20),
        }}
      />
      <Tabs.Screen
        name="evening-review"
        options={{
          title: "Review",
          headerTitle: '',
          headerLeft: () => <BackButton />,
          tabBarIcon: createTabIcon(Ionicons, 'moon', 20),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          headerTitle: '',
          headerShown: false,
          tabBarIcon: createTabIcon(Ionicons, 'settings-sharp', 20),
        }}
      />

      {/* Stack screens that should maintain the tab bar */}
      <Tabs.Screen
        name="bigbook"
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          headerTitle: '',
          headerLeft: () => <BackButton />,
        }}
      />
      <Tabs.Screen
        name="daily-reflections"
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          headerTitle: '',
          headerLeft: () => <BackButton />,
        }}
      />
      <Tabs.Screen
        name="twelve-and-twelve"
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          headerTitle: '',
          headerLeft: () => <BackButton />,
        }}
      />
      <Tabs.Screen
        name="meeting-pocket"
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          headerTitle: '',
          headerLeft: () => <BackButton />,
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
        name="store"
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          headerTitle: '',
          headerLeft: () => <BackButton />,
        }}
      />

    </Tabs>
    </TextSettingsProvider>
  );
}