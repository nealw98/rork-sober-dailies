const { withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');
const { resolve } = require('path');
const { readFileSync, writeFileSync, copyFileSync, existsSync } = require('fs');

/**
 * Expo Config Plugin for Firebase Setup
 * 
 * This plugin does two things:
 * 1. Copies Firebase config files from project root to native directories (iOS and Android)
 * 2. Adds Firebase initialization code to iOS AppDelegate.swift
 * 
 * Why we need this:
 * - Expo's googleServicesFile config only copies files, it doesn't initialize Firebase
 * - @react-native-firebase/app plugin doesn't work with Swift AppDelegate in Expo
 * - We need FirebaseApp.configure() in AppDelegate for Firebase to work
 */

const withFirebaseConfig = (config) => {
  // iOS: Copy GoogleService-Info.plist and add initialization to AppDelegate.swift
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosProjectDirectory = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName;
      
      // 1. Copy GoogleService-Info.plist
      const googleServiceInfoPlist = resolve(projectRoot, 'GoogleService-Info.plist');
      const plistDestination = resolve(iosProjectDirectory, projectName, 'GoogleService-Info.plist');

      if (existsSync(googleServiceInfoPlist)) {
        console.log(`[Firebase] Copying GoogleService-Info.plist to ${plistDestination}`);
        copyFileSync(googleServiceInfoPlist, plistDestination);
      } else {
        console.warn(`[Firebase] WARNING: GoogleService-Info.plist not found at ${googleServiceInfoPlist}`);
      }

      // 2. Add Firebase initialization to AppDelegate.swift
      const appDelegatePath = resolve(iosProjectDirectory, projectName, 'AppDelegate.swift');
      
      if (existsSync(appDelegatePath)) {
        let appDelegateContents = readFileSync(appDelegatePath, 'utf-8');
        
        // Add import if not already there
        if (!appDelegateContents.includes('import FirebaseCore')) {
          // Add after the other imports (after 'import React' or similar)
          const importIndex = appDelegateContents.lastIndexOf('import ');
          if (importIndex !== -1) {
            const endOfLine = appDelegateContents.indexOf('\n', importIndex);
            appDelegateContents = 
              appDelegateContents.slice(0, endOfLine + 1) +
              'import FirebaseCore\n' +
              appDelegateContents.slice(endOfLine + 1);
          }
        }
        
        // Add FirebaseApp.configure() if not already there
        if (!appDelegateContents.includes('FirebaseApp.configure()')) {
          // Find the didFinishLaunchingWithOptions method and add at the start
          const methodPattern = /(didFinishLaunchingWithOptions[^{]*\{[^\n]*\n)/;
          if (methodPattern.test(appDelegateContents)) {
            appDelegateContents = appDelegateContents.replace(
              methodPattern,
              '$1    FirebaseApp.configure()\n'
            );
          }
        }
        
        writeFileSync(appDelegatePath, appDelegateContents);
        console.log('[Firebase] Added Firebase initialization to AppDelegate.swift');
      } else {
        console.warn(`[Firebase] WARNING: AppDelegate.swift not found at ${appDelegatePath}`);
      }
      
      return config;
    },
  ]);

  // Android: Copy google-services.json
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidAppDirectory = resolve(config.modRequest.platformProjectRoot, 'app');
      const googleServicesJson = resolve(projectRoot, 'google-services.json');
      const destination = resolve(androidAppDirectory, 'google-services.json');

      if (existsSync(googleServicesJson)) {
        console.log(`[Firebase] Copying google-services.json to ${destination}`);
        copyFileSync(googleServicesJson, destination);
      } else {
        console.warn(`[Firebase] WARNING: google-services.json not found at ${googleServicesJson}`);
      }
      
      return config;
    },
  ]);

  return config;
};

module.exports = withFirebaseConfig;
