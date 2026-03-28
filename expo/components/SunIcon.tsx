import React from 'react';
import { Image, StyleSheet } from 'react-native';

export default function SunIcon({ size = 120 }: { size?: number }) {
  return (
    <Image
      source={{ uri: 'https://r2-pub.rork.com/attachments/ptmsa753yy8i9y2wurj5r' }}
      style={[styles.icon, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    // No additional styling needed, just the image
  },
});