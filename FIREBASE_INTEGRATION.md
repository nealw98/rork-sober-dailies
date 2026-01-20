# Firebase Analytics Integration - Complete ✅

## Summary

Successfully integrated Firebase Analytics into Sober Dailies app **without breaking Supabase** (version 2.75.0 maintained).

## What Was Done

### 1. Package Installation
- ✅ Installed `@react-native-firebase/app@21.8.0` (exact version)
- ✅ Installed `@react-native-firebase/analytics@21.8.0` (exact version)
- ✅ Used `--save-exact` and `--legacy-peer-deps` to prevent unwanted dependency updates
- ✅ **Verified Supabase stayed at 2.75.0** ✨

### 2. Native Configuration
- ✅ Added Google Services plugin to Android build.gradle
- ✅ Applied Google Services plugin in Android app build.gradle
- ✅ Updated app.json with expo-build-properties (iOS useFrameworks: static)
- ✅ Created custom config plugin (`plugins/withFirebaseAppDelegate.js`) to handle Objective-C AppDelegate
- ✅ Firebase config files already present:
  - `ios/SoberDailies/GoogleService-Info.plist`
  - `android/app/google-services.json`

### 3. Analytics Services Created

#### `lib/firebaseAnalytics.ts`
- Firebase-specific analytics service
- Handles Firebase event naming constraints (40 char max, alphanumeric + underscores)
- Auto-sanitizes parameters (max 100 chars for strings, max 25 params per event)
- Methods for screen tracking, feature tracking, user properties, etc.
- **Non-blocking** - errors don't crash the app

#### `lib/analytics.ts`
- **Dual analytics wrapper** that sends events to BOTH systems
- Maintains existing Supabase analytics functionality
- Adds Firebase analytics in parallel
- Simple API for future code

### 4. Integration
- ✅ Added Firebase initialization to `app/_layout.tsx`
- ✅ Runs alongside existing `initUsageLogger()` (Supabase)
- ✅ Non-blocking initialization (errors logged, not thrown)

### 5. Testing
- ✅ iOS build successful on simulator
- ✅ No linter errors
- 🟡 Android build not yet tested (pending)

## Dual Analytics System

### Why Both?

**Supabase Analytics** (existing):
- Full SQL query access
- Custom event tracking
- Complete control over data
- Direct database access for complex queries

**Firebase Analytics** (new):
- Industry-standard mobile analytics
- Firebase Console insights
- Automatic metrics (retention, engagement, etc.)
- Integration with other Firebase services
- Better mobile-optimized visualizations

### Usage

**For new code**, you can use either:

```typescript
// Option 1: Use dual system (both Supabase + Firebase)
import { analytics } from '@/lib/analytics';
await analytics.logEvent('custom_event', { key: 'value' });
await analytics.featureUse('feature_name', 'screen_name');

// Option 2: Use Firebase directly
import { firebaseAnalytics } from '@/lib/firebaseAnalytics';
await firebaseAnalytics.logEvent('event_name', { param: 'value' });

// Option 3: Keep using Supabase only (existing code still works)
import { usageLogger } from '@/lib/usageLogger';
usageLogger.featureUse('feature', 'screen');
```

**For existing code**:
- No changes needed! All existing `usageLogger` calls still work
- Gradually migrate to dual system if desired

## Firebase Event Constraints

Firebase has stricter limits than Supabase:
- **Event names**: Max 40 characters, alphanumeric + underscores, must start with letter
- **String params**: Max 100 characters
- **Total params**: Max 25 per event
- **Total events**: 500 distinct event names per app

Our `firebaseAnalytics.ts` automatically sanitizes events to meet these constraints.

## Next Steps

### Immediate
1. ✅ Test on iOS simulator - **DONE**
2. 🟡 Test on Android (when ready)
3. 🟡 Test analytics events are actually being logged to Firebase Console

### Optional Future Enhancements
1. Create a `firebase.json` config file (currently optional but recommended)
2. Consider using Firebase Crashlytics (already have the foundation)
3. Gradually migrate high-value events to use dual analytics wrapper
4. Set up custom Firebase audiences/funnels in console

## Files Changed

### New Files
- `lib/firebaseAnalytics.ts` - Firebase analytics service
- `lib/analytics.ts` - Dual analytics wrapper
- `plugins/withFirebaseAppDelegate.js` - Custom Expo config plugin

### Modified Files
- `package.json` - Added Firebase packages
- `package-lock.json` - Locked dependencies (Supabase still at 2.75.0 ✅)
- `app.json` - Added useFrameworks config and custom plugin
- `app/_layout.tsx` - Added Firebase initialization
- `android/build.gradle` - Added Google Services classpath
- `android/app/build.gradle` - Applied Google Services plugin

### Existing Files (Unchanged)
- `lib/usageLogger.ts` - Supabase analytics still works as-is
- All existing analytics hooks and components

## Git Branch

All work is on: **`firebase-analytics-v2`**

## Build Instructions

### iOS
```bash
npx expo prebuild --clean
npx expo run:ios
```

### Android
```bash
npx expo prebuild --clean
npx expo run:android
```

### EAS Build
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

## Testing Firebase Analytics

1. **In Firebase Console:**
   - Go to Firebase Console > Analytics > Events
   - Should see events appear in near real-time (up to 1 hour delay)
   - DebugView available for real-time testing

2. **Enable Debug Mode:**
   - iOS: `adb shell setprop debug.firebase.analytics.app com.nealwagner.soberdailies`
   - Android: `adb shell setprop debug.firebase.analytics.app com.nealwagner.soberdailies.paid`

3. **Check Logs:**
   - Look for `[Firebase Analytics]` logs in console
   - Should see "Initialized successfully" on app launch
   - Should see "Event logged" for each tracked event

## Troubleshooting

### If Supabase breaks
1. Check `package-lock.json` for version
2. If changed, run: `npm install @supabase/supabase-js@2.75.0 --save-exact`
3. Regenerate lockfile

### If Firebase fails to initialize
- Check that config files are present in correct locations
- Verify bundle IDs match Firebase project
- Check console for initialization errors (non-blocking)

### If build fails
- Run `npx expo prebuild --clean` to regenerate native directories
- Check that custom plugin is applied correctly
- Verify CocoaPods installed successfully

## Success Metrics

✅ Supabase version locked at 2.75.0
✅ iOS build successful
✅ No linter errors
✅ Dual analytics system created
✅ Non-breaking integration (existing code unchanged)
✅ Custom config plugin for Objective-C compatibility

---

**Status:** Ready for Android testing and production deployment when you're comfortable!
