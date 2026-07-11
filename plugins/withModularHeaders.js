// Config plugin: enable CocoaPods modular headers for the Google pods only.
//
// Why: @react-native-google-signin/google-signin (added for the Android Drive
// backup) pulls in AppCheckCore — a Swift pod that depends on GoogleUtilities
// and RecaptchaInterop, which do NOT define modules. Swift can't import
// non-modular pods when they're built as static libraries, so `pod install`
// fails with "cannot yet be integrated as static libraries".
//
// The fix is per-pod modular headers, NOT a global use_modular_headers!. Global
// modular headers makes CocoaPods regenerate React Native's New-Architecture
// modulemaps and the build then dies with "Redefinition of module
// 'react_runtime'" (React-jsitooling / React-RuntimeHermes). Scoping the flag
// to just the Google pods gives AppCheckCore its module maps while leaving
// React's pods untouched. Lines are added inside the app target (after
// use_expo_modules!) since `pod` declarations must live in a target.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'withModularHeaders';
const SNIPPET = [
  `  # ${MARKER} (plugins/withModularHeaders.js): give the non-modular Google`,
  '  # pods module maps so AppCheckCore (Swift) can import them as static libs.',
  "  pod 'GoogleUtilities', :modular_headers => true",
  "  pod 'RecaptchaInterop', :modular_headers => true",
].join('\n');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let src = fs.readFileSync(podfile, 'utf8');
      if (!src.includes(MARKER)) {
        src = src.replace(/(\n\s*use_expo_modules!\n)/, `$1${SNIPPET}\n`);
        fs.writeFileSync(podfile, src);
      }
      return cfg;
    },
  ]);
};
