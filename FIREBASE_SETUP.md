# Firebase Setup for Sober Dailies

## Overview
Firebase Analytics is integrated alongside our existing Supabase analytics system to provide:
- Industry-standard mobile analytics metrics
- Firebase Console insights and automatic reporting
- Cross-platform analytics infrastructure

## Configuration Files

### Required Files (MUST be in project root)

```
rork-sober-dailies/
├── GoogleService-Info.plist    ← iOS config (from Firebase Console)
├── google-services.json         ← Android config (from Firebase Console)
├── app.json                     ← Points to these files
└── ...
```

⚠️ **CRITICAL**: These files MUST be in the **project root** (same folder as `app.json`), not in `ios/` or `android/` folders.

### Why?
- `expo prebuild --clean` wipes the `ios/` and `android/` folders completely
- EAS builds regenerate native folders from scratch
- Expo's `googleServicesFile` config automatically copies these files to the correct locations during prebuild

## app.json Configuration

```json
{
  "expo": {
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "@react-native-firebase/app",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```

### Key Points:
1. **`googleServicesFile`**: Official Expo config - no custom plugins needed
2. **`@react-native-firebase/app`**: Official React Native Firebase plugin
3. **`useFrameworks: "static"`**: Required for React Native Firebase on iOS

## Native Configuration (Automatic)

### Android
Expo automatically:
- Copies `google-services.json` to `android/app/`
- Applies the Google Services gradle plugin
- Configures Firebase SDK dependencies

### iOS
Expo automatically:
- Copies `GoogleService-Info.plist` to the Xcode project
- Adds it to "Copy Bundle Resources"
- Initializes Firebase in AppDelegate

## Code Integration

### Initialization
Firebase is automatically initialized from the config files. Our code just enables analytics:

```typescript
// lib/firebaseAnalytics.ts
import analytics from '@react-native-firebase/analytics';

await analytics().setAnalyticsCollectionEnabled(true);
await analytics().logEvent('my_event', { param: 'value' });
```

### Dual Analytics System
We maintain BOTH analytics systems:

- **Supabase** (`lib/usageLogger.ts`): Custom events, SQL queries, full control
- **Firebase** (`lib/firebaseAnalytics.ts`): Standard metrics, Firebase Console

The unified wrapper (`lib/analytics.ts`) logs to both simultaneously.

## Testing

### Debug Mode
Enable Firebase DebugView for real-time event monitoring:

**iOS Simulator:**
```bash
xcrun simctl spawn booted log config --mode "level:debug" --subsystem com.google.firebase.analytics
```

**Android Emulator:**
```bash
adb shell setprop debug.firebase.analytics.app com.nealwagner.soberdailies.paid
```

### Verify Events
1. Open Firebase Console → Analytics → DebugView
2. Select your test device
3. Use the app - events should appear within seconds

## Building

### Local Development Build
```bash
npx expo prebuild --clean
npx expo run:ios
# or
npx expo run:android
```

### EAS Preview Build
```bash
eas build --platform all --profile preview
```

Expo will automatically:
1. Run `expo prebuild`
2. Copy config files to native projects
3. Build with Firebase fully configured

## Troubleshooting

### "No Firebase App '[DEFAULT]' has been created"
**Cause**: Config files missing from native build directories
**Fix**: 
1. Verify files are in project root (not `ios/` or `android/`)
2. Check `app.json` has correct `googleServicesFile` paths
3. Run `npx expo prebuild --clean`

### "TypeError: Object is not a function"
**Cause**: Incorrect Firebase initialization code
**Fix**: Don't call `firebase.initializeApp()` - React Native Firebase auto-initializes

### Events Not Showing in Firebase Console
**Cause**: Debug mode not enabled or wrong app identifier
**Fix**: 
1. Enable debug mode (see Testing section above)
2. Verify bundle ID / package name matches Firebase project
3. Wait 24-48 hours for production data (debug is instant)

### Build Fails with "google-services.json missing"
**Cause**: Files not in Git or EAS secrets
**Fix**: 
1. Commit config files to Git, OR
2. Upload as EAS secrets (for private repos)

## Git Considerations

These files contain your Firebase API keys. Options:

1. **Commit them** (recommended for mobile apps)
   - Mobile API keys are safe to commit
   - They're restricted by bundle ID/package name
   - Simplest setup

2. **Use EAS Secrets** (for sensitive projects)
   - Add to `.gitignore`
   - Upload via EAS CLI or Expo dashboard
   - More complex setup

## References

- [Expo Firebase Setup](https://docs.expo.dev/guides/using-firebase/)
- [React Native Firebase Docs](https://rnfirebase.io/)
- [Firebase Analytics](https://firebase.google.com/docs/analytics)
