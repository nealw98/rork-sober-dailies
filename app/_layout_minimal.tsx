import React from "react";
import { View, Text } from "react-native";

export default function MinimalLayout() {
  console.log('=== MINIMAL LAYOUT LOADING ===');
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text style={{ fontSize: 24, color: 'black' }}>Minimal App Test</Text>
      <Text style={{ fontSize: 16, color: 'gray', marginTop: 10 }}>
        If you see this, the basic app structure works
      </Text>
    </View>
  );
}
