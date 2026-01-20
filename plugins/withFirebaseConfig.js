const { withAppDelegate, withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom config plugin for React Native Firebase
 * 
 * This plugin:
 * 1. Copies GoogleService-Info.plist to iOS project
 * 2. Copies google-services.json to Android project
 * 3. Adds Firebase initialization to AppDelegate (Objective-C)
 * 
 * Place your Firebase config files in the project root:
 * - GoogleService-Info.plist (for iOS)
 * - google-services.json (for Android)
 */

const withFirebaseIOS = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      const sourceFile = path.join(config.modRequest.projectRoot, 'GoogleService-Info.plist');
      const targetDir = path.join(platformProjectRoot, config.modRequest.projectName || 'SoberDailies');
      const targetFile = path.join(targetDir, 'GoogleService-Info.plist');

      // Check if source file exists
      if (fs.existsSync(sourceFile)) {
        // Copy GoogleService-Info.plist to iOS project
        fs.copyFileSync(sourceFile, targetFile);
        console.log('✅ Copied GoogleService-Info.plist to iOS project');
      } else {
        console.warn('⚠️  GoogleService-Info.plist not found in project root');
      }

      return config;
    },
  ]);
};

const withFirebaseAndroid = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      const sourceFile = path.join(config.modRequest.projectRoot, 'google-services.json');
      const targetFile = path.join(platformProjectRoot, 'app', 'google-services.json');

      // Check if source file exists
      if (fs.existsSync(sourceFile)) {
        // Copy google-services.json to Android project
        fs.copyFileSync(sourceFile, targetFile);
        console.log('✅ Copied google-services.json to Android project');
      } else {
        console.warn('⚠️  google-services.json not found in project root');
      }

      return config;
    },
  ]);
};

const withFirebaseAppDelegate = (config) => {
  return withAppDelegate(config, (config) => {
    const { modResults } = config;
    let contents = modResults.contents;

    // Check if Firebase is already imported
    if (!contents.includes('@import Firebase;')) {
      // Add Firebase import at the top (after other imports)
      const importIndex = contents.lastIndexOf('#import');
      if (importIndex !== -1) {
        const endOfLine = contents.indexOf('\n', importIndex);
        contents = 
          contents.slice(0, endOfLine + 1) +
          '@import Firebase;\n' +
          contents.slice(endOfLine + 1);
      }
    }

    // Check if Firebase is already configured
    if (!contents.includes('[FIRApp configure]')) {
      // Add Firebase configuration in didFinishLaunchingWithOptions
      const methodRegex = /(- \(BOOL\)application:\(UIApplication \*\)application didFinishLaunchingWithOptions:\(NSDictionary \*\)launchOptions\s*{)/;
      if (methodRegex.test(contents)) {
        contents = contents.replace(
          methodRegex,
          '$1\n  [FIRApp configure];\n'
        );
      }
    }

    modResults.contents = contents;
    return config;
  });
};

module.exports = (config) => {
  return withPlugins(config, [
    withFirebaseIOS,
    withFirebaseAndroid,
    withFirebaseAppDelegate,
  ]);
};
