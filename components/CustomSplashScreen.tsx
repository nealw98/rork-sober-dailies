import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { adjustFontWeight } from '@/constants/fonts';

export default function CustomSplashScreen() {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/icon.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>AA Sober Dailies</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: adjustFontWeight('600', true),
    color: '#333333',
    textAlign: 'center',
  },
});
