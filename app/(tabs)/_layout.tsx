import { Tabs, router } from "expo-router";
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
    padding: 8,
    marginLeft: 4
  },
  backText: {
    fontSize: 17,
    color: Colors.light.tint,
    marginLeft: 4,
  }
});

const BackButton = () => (
  <TouchableOpacity 
    style={styles.backButton}
    onPress={() => router.push('/')}
    testID="back-button"
  >
    <ChevronLeft color={Colors.light.tint} size={20} />
    <Text style={styles.backText}>Back</Text>
  </TouchableOpacity>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        headerShown: true,
        tabBarStyle: {
          backgroundColor: "#f8f9fa",
        },
        headerStyle: {
          backgroundColor: "#f8f9fa",
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <SunIcon size={24} />
              <Text style={styles.headerTitle}>Sober Dailies</Text>
            </View>
          ),
          tabBarIcon: ({ color }) => <Home color={color} size={22} style={styles.tabIcon} />,
        }}
      />
      <Tabs.Screen
        name="daily-reflections"
        options={{
          title: "Reflections",
          headerTitle: "Daily Reflections",
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <BookOpen color={color} size={22} style={styles.tabIcon} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="gratitude"
        options={{
          title: "Gratitude",
          headerTitle: "Daily Gratitude",
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <Smile color={color} size={22} style={styles.tabIcon} />,
        }}
      />
      <Tabs.Screen
        name="evening-review"
        options={{
          title: "Review",
          headerTitle: "Evening Review",
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <Moon color={color} size={22} style={styles.tabIcon} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "AI Sponsor",
          headerTitle: "AI Sponsor",
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={22} style={styles.tabIcon} />,
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          title: "Prayers",
          headerTitle: "AA Prayers",
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <Heart color={color} size={22} style={styles.tabIcon} />,
        }}
      />
      <Tabs.Screen
        name="literature"
        options={{
          title: "Literature",
          headerTitle: "AA Literature",
          headerLeft: () => <BackButton />,
          tabBarIcon: ({ color }) => <BookOpen color={color} size={22} style={styles.tabIcon} />,
        }}
      />



    </Tabs>
  );
}