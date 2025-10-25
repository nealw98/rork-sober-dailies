# Local EAS Build Setup Guide

This guide explains how to build iOS and Android apps locally on your Mac instead of using Expo's cloud servers, saving costs.

---

## Prerequisites

### For iOS Builds:
- macOS with Xcode installed
- Apple Developer account
- Provisioning profiles and certificates set up

### For Android Builds:
- macOS, Linux, or Windows
- Android Studio or Android SDK command-line tools
- Java Development Kit (JDK)

---

## Initial Setup

### 1. Install EAS CLI (if not already installed)
```bash
npm install -g eas-cli
```

### 2. Configure for Local Builds

Update your `eas.json` to specify local builds:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store"
    },
    "preview-local": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "resourceClass": "local"
      },
      "android": {
        "buildType": "apk",
        "resourceClass": "local"
      }
    },
    "production-local": {
      "distribution": "store",
      "ios": {
        "resourceClass": "local"
      },
      "android": {
        "resourceClass": "local"
      }
    }
  }
}
```

---

## Building Locally

### iOS Local Build

```bash
# For development/testing (can install via TestFlight or direct install)
eas build --platform ios --profile preview-local --local

# For production
eas build --platform ios --profile production-local --local
```

**Important for iOS:**
- You need valid provisioning profiles and certificates
- First time: EAS will help you set these up
- Builds create an `.ipa` file you can install via Xcode or TestFlight

### Android Local Build

```bash
# For development/testing (creates APK)
eas build --platform android --profile preview-local --local

# For production (creates AAB for Play Store)
eas build --platform android --profile production-local --local
```

**Android is easier:**
- No special accounts needed for local testing
- Creates `.apk` file you can install directly on device
- For Play Store: creates `.aab` (Android App Bundle)

---

## Installing Local Builds

### iOS Installation Options:

1. **Via Xcode:**
   ```bash
   # Connect your iPhone via USB
   # Open Xcode > Window > Devices and Simulators
   # Drag and drop the .ipa file onto your device
   ```

2. **Via TestFlight:**
   - Upload the `.ipa` to App Store Connect
   - Distribute via TestFlight as usual

3. **Via ad-hoc distribution:**
   - Use tools like Apple Configurator
   - Or share via diawi.com or similar services

### Android Installation:

1. **Direct APK install:**
   ```bash
   # Connect device via USB with USB debugging enabled
   adb install path/to/your-app.apk
   
   # Or just copy the APK to your phone and open it
   ```

2. **For others:**
   - Share the `.apk` file directly
   - They need to enable "Install from Unknown Sources"
   - Open the APK file to install

---

## Cost Savings

### Cloud Build Costs:
- **Free tier:** 30 builds/month (shared iOS/Android)
- **Production Plan:** $29/month for unlimited builds
- **Priority builds:** Extra costs for faster builds

### Local Build Benefits:
- ✅ **Free** - unlimited builds
- ✅ **Faster** - no queue times
- ✅ **Privacy** - code stays on your machine
- ❌ Requires local setup and maintenance
- ❌ Your machine needs to be on during build

---

## Tips for Local Builds

### 1. **Build Time Optimization:**
```bash
# Use --local-cache to speed up subsequent builds
eas build --platform android --profile preview-local --local --clear-cache
```

### 2. **Only build what you need:**
```bash
# iOS simulator build (much faster, for testing only)
eas build --platform ios --profile development --local
```

### 3. **Keep dependencies in check:**
- Local builds are slower with many dependencies
- Clean your project regularly: `npm run clean` or `expo prebuild --clean`

### 4. **Use Android for quick testing:**
- Android builds are generally faster
- APKs are easier to distribute for testing
- Save iOS builds for final testing or release

---

## Alternative: Development Builds

For fastest iteration, use **development builds** with Expo Go workflow:

```bash
# One-time setup - build development client
eas build --platform ios --profile development --local

# Then use expo start for instant updates
npx expo start --dev-client
```

This creates a custom Expo Go app with your native code, but allows instant JavaScript updates without rebuilding.

---

## Troubleshooting

### iOS Certificate Issues:
```bash
# Let EAS manage certificates
eas credentials
```

### Android Keystore:
```bash
# Use your existing keystore or let EAS create one
# Make sure keystore path in eas.json is correct
```

### Build Failures:
```bash
# Clear all caches
npm run clean
npx expo prebuild --clean
rm -rf node_modules
npm install

# Try again
eas build --platform android --profile preview-local --local
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Android APK (local) | `eas build --platform android --profile preview-local --local` |
| iOS IPA (local) | `eas build --platform ios --profile preview-local --local` |
| Install Android | `adb install app.apk` |
| Install iOS | Drag to Xcode Devices window |
| Check build status | `eas build:list` |
| View build logs | `eas build:view` |

---

## Recommendation for Your Use Case

Since you want to save costs for preview testing:

1. **Primary testing:** Use local Android APK builds
   - Fast to build
   - Easy to install and share
   - Free

2. **iOS testing:** Build locally only when needed
   - Slower but free
   - Use for final testing before releases

3. **Development:** Use dev client with `expo start`
   - Instant updates
   - No rebuilds needed for JS changes

---

*Note: First-time local builds require significant setup, but subsequent builds are much faster and completely free!*

