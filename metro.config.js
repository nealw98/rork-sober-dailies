/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix for SDK 53 TypeScript issues
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Explicit package resolution for problematic dependencies
config.resolver.extraNodeModules = {
  '@supabase/supabase-js': path.resolve(__dirname, 'node_modules/@supabase/supabase-js'),
  'superstruct': path.resolve(__dirname, 'node_modules/superstruct'),
};

// Note: Reanimated plugin removed to avoid Metro conflicts

module.exports = config;