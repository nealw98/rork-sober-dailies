/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for SDK 53 TypeScript issues
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx'];
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Ignore problematic Reanimated worklet files
config.resolver.blockList = [
  /node_modules\/react-native-reanimated\/.*\/worklets\/.*\.ts$/,
];

// Note: Reanimated plugin removed to avoid Metro conflicts

module.exports = config;