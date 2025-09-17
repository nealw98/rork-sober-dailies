import { Tabs, router, Stack } from "expo-router";
import { Home, MessageCircle, Heart, Smile, Moon, ChevronLeft, BookOpen } from "lucide-react-native";
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
  const handleBackPress = () => {
    try {
      // Log the current route before navigation
      const currentState = router.getState();
      console.log('🧭 Navigation: Current state before back:', JSON.stringify({
        routes: currentState.routes.map(r => ({ 
          name: r.name,
          path: r.path,
          params: r.params
        })),
        index: currentState.index,
        key: currentState.key,
        stale: currentState.stale,
        type: currentState.type
      }, null, 2));
      
      // Get current route name for logging
      const currentRouteName = currentState.routes[currentState.index]?.name || 'unknown';
      console.log(`🧭 Navigation: Attempting to go back from "${currentRouteName}"`);
      
      // Handle special cases for known navigation paths
      if (currentRouteName === 'bigbook') {
        console.log('🧭 Navigation: Special case - navigating from bigbook to literature');
        router.navigate('/(tabs)/literature');
        return;
      } else if (currentRouteName === 'twelve-and-twelve') {
        console.log('🧭 Navigation: Special case - navigating from twelve-and-twelve to literature');
        router.navigate('/(tabs)/literature');
        return;
      } else if (currentRouteName === 'meeting-pocket') {
        console.log('🧭 Navigation: Special case - navigating from meeting-pocket to literature');
        router.navigate('/(tabs)/literature');
        return;
      }
      
      // Actually navigate back for other cases
      router.back();
      
      // Log after navigation
      console.log('🧭 Navigation: router.back() called successfully');
      
      // Log the state after navigation (on next tick)
      setTimeout(() => {
        try {
          const newState = router.getState();
          const newRouteName = newState.routes[newState.index]?.name || 'unknown';
          console.log(`🧭 Navigation: Now on "${newRouteName}" after back navigation`);
        } catch (err) {
          console.error('🧭 Navigation: Error getting state after back:', err);
        }
      }, 100);
    } catch (error) {
      console.error('🧭 Navigation: Error going back:', error);
      // Fallback to home if router.back() fails
      console.log('🧭 Navigation: Falling back to home navigation');
      router.navigate('/');
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
          title: "Gratitude",
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
        name="literature"
        options={{
          title: "Literature",
          headerTitle: '',
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <BookOpen color={color} size={22} style={styles.tabIcon} />,
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          title: "Prayers",
          headerTitle: '',
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <Heart color={color} size={22} style={styles.tabIcon} />,
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
        name="inventory"
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