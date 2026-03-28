import { Platform, TextStyle, ViewStyle } from 'react-native';

type FontWeight = TextStyle['fontWeight'];

// Utility function to adjust font weights for Android
export const adjustFontWeight = (weight: FontWeight, isHeader: boolean = false): FontWeight => {
  if (Platform.OS === 'android') {
    // For header text on Android, use 700 (bold)
    if (isHeader) {
      return '700';
    }
    
    // For body text on Android, use 500 if it's 400
    if (weight === '400' || weight === 400) {
      return '500';
    }
  }
  
  // Return original weight for iOS or if no adjustment needed
  return weight;
};

// Utility function to get platform-specific screen padding
export const getScreenPadding = (): ViewStyle => {
  if (Platform.OS === 'android') {
    return {
      paddingTop: 24,
      paddingBottom: 24,
      paddingHorizontal: 16
    };
  }
  
  return {};
};