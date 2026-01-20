const { withAppDelegate } = require('@expo/config-plugins');

/**
 * Custom config plugin for React Native Firebase
 * 
 * The default @react-native-firebase/app plugin doesn't support Swift AppDelegate,
 * so we need to manually add Firebase initialization code.
 */
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
      // Find the method
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

module.exports = withFirebaseAppDelegate;
