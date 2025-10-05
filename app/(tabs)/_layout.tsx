import { Tabs, router, Stack, usePathname } from "expo-router";
import { Home, MessageCircle, Smile, Moon, ChevronLeft, BookOpen, CheckSquare } from "lucide-react-native";
import React from "react";
import { Text, View, StyleSheet, Platform, TouchableOpacity } from "react-native";
import SunIcon from "@/components/SunIcon";

import Colors from "@/constants/colors";
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.OS === 'android' ? 4 : 8,
    marginLeft: Platform.OS === 'android' ? 0 : 4
  },
  backText: {
    fontSize: 14,
    color: Colors.light.tint,
    marginLeft: 4,
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
      <ChevronLeft color={Colors.light.tint} size={20} />
      <Text style={styles.backText}>Back</Text>
    </TouchableOpacity>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        headerShown: true,
        headerBackTitle: "",
        headerTitleAlign: 'center',
        headerLeft: ({ canGoBack }) => canGoBack ? <BackButton /> : null,
        tabBarHideOnKeyboard: Platform.OS === 'android' ? true : undefined,
        tabBarStyle: {
          backgroundColor: "#f8f9fa",
          height: Platform.OS === 'android' ? 75 : 88,
          paddingBottom: Platform.OS === 'android' ? 8 : 0,
          paddingTop: Platform.OS === 'android' ? 2 : 0,
          paddingHorizontal: Platform.OS === 'android' ? 4 : 0,
          display: 'flex', // Always show tab bar
        },
        headerStyle: {
          backgroundColor: "#f8f9fa",
          ...(Platform.OS === 'android' && { height: 44 }),
        },
        headerTitleStyle: {
          fontWeight: adjustFontWeight("600", true),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: Platform.OS === 'android' ? 2 : 0,
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
          tabBarIcon: ({ color }) => <Home color={color} size={22} style={styles.tabIcon} />,
        }}
      />

      <Tabs.Screen
        name="gratitude"
        options={{
          title: "Grateful",
          headerTitle: '',
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <Smile color={color} size={22} style={styles.tabIcon} />,
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
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={22} style={styles.tabIcon} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Spot",
          headerTitle: '',
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <CheckSquare color={color} size={22} style={styles.tabIcon} />,
        }}
      />
      <Tabs.Screen
        name="literature"
        options={{
          title: "Books",
          headerTitle: '',
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <BookOpen color={color} size={22} style={styles.tabIcon} />,
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          headerTitle: '',
          headerLeft: () => <BackButton />,
        }}
      />
      <Tabs.Screen
        name="evening-review"
        options={{
          title: "Review",
          headerTitle: '',
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <Moon color={color} size={22} style={styles.tabIcon} />,
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
  );
}