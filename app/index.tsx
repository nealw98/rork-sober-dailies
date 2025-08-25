import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Index() {
  console.log('=== INDEX PAGE LOADING ===');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expo Router Test</Text>
      <Text style={styles.subtitle}>
        If you see this, expo-router is working!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
});
