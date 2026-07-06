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

// Reader serif for long-form reading surfaces (Daily Reflection, meeting
// readings, Big Book search snippets). Georgia is the iOS system serif the
// readers were tuned around; Android has no Georgia, so we bundle Gelasio —
// Google's metric-compatible Georgia — to keep the same optical size and
// line lengths. (Loaded in app/_layout.tsx.)
export const readerSerif = Platform.select({
  ios: 'Georgia',
  default: 'Gelasio_400Regular',
});

// Italic reader text. iOS derives italics from the Georgia family via
// fontStyle; Android custom fonts need the real italic face selected by name.
export const readerSerifItalic: TextStyle = Platform.select({
  ios: { fontFamily: 'Georgia', fontStyle: 'italic' as const },
  default: { fontFamily: 'Gelasio_400Regular_Italic' },
})!;

// Long-form reading size. We use Apple's "Body" text style (17pt) as the fixed
// base for every reading surface (Big Book, Daily Reflection, meeting readings,
// prayers, sponsor chat, markdown). It is NOT an in-app setting: React Native's
// default allowFontScaling lets these scale with the OS text-size / Dynamic Type
// preference, so accessibility sizing is handled by the system, not a custom
// control. Bump this one number to retune all reading text at once.
export const READING_FONT_SIZE = 17;
export const READING_LINE_HEIGHT = Math.round(READING_FONT_SIZE * 1.5); // 26

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