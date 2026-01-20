# Firebase Setup Instructions

## Step 1: Download Config Files from Firebase Console

### iOS Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon)
4. Scroll to "Your apps" section
5. Click on your iOS app
6. Click "Download GoogleService-Info.plist"

### Android Configuration
1. Same Firebase Console → Project Settings
2. Click on your Android app
3. Click "Download google-services.json"

## Step 2: Place Files in Project Root

Copy both files to the project root directory:

```
/Users/nealwagner/Projects/rork-sober-dailies/
  ├── GoogleService-Info.plist  ← Put iOS file HERE
  ├── google-services.json      ← Put Android file HERE
  ├── package.json
  ├── app.json
  └── ...
```

**IMPORTANT:** Files must be in the root folder (same level as `package.json`), NOT in `ios/` or `android/` folders.

## Step 3: Verify Bundle Identifiers Match

### iOS - GoogleService-Info.plist
Open the file and verify:
```xml
<key>BUNDLE_ID</key>
<string>com.nealwagner.soberdailies</string>
```

Should match `app.json` → `expo.ios.bundleIdentifier`

### Android - google-services.json
Open the file and verify:
```json
"package_name": "com.nealwagner.soberdailies.paid"
```

Should match `app.json` → `expo.android.package`

## Step 4: Build

Once files are in place, the custom Expo config plugin (`plugins/withFirebaseConfig.js`) will automatically:
- Copy `GoogleService-Info.plist` to `ios/SoberDailies/` during prebuild
- Copy `google-services.json` to `android/app/` during prebuild
- Add Firebase initialization code to iOS AppDelegate

### Test Locally
```bash
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
```

### Build with EAS
```bash
eas build --platform all --profile preview
```

## What Happens

The plugin runs during `expo prebuild` and:

1. **iOS**: Copies `GoogleService-Info.plist` → `ios/SoberDailies/GoogleService-Info.plist`
2. **Android**: Copies `google-services.json` → `android/app/google-services.json`
3. **iOS**: Adds `[FIRApp configure];` to AppDelegate

You should see these console messages during prebuild:
```
✅ Copied GoogleService-Info.plist to iOS project
✅ Copied google-services.json to Android project
```

## Troubleshooting

### "GoogleService-Info.plist not found in project root"
- Make sure the file is in the project root, not in `ios/` folder
- Check filename exactly matches (case-sensitive)

### "google-services.json not found in project root"  
- Make sure the file is in the project root, not in `android/` folder
- Check filename exactly matches (case-sensitive)

### Firebase still not initializing
- Verify bundle IDs match between config files and app.json
- Check that files were copied (look in `ios/SoberDailies/` and `android/app/` after prebuild)
- Run prebuild with `--clean` flag to regenerate everything

## Files Structure

```
rork-sober-dailies/
├── GoogleService-Info.plist        ← Add this file (iOS config)
├── google-services.json            ← Add this file (Android config)
├── plugins/
│   └── withFirebaseConfig.js       ← Plugin that copies the files
├── app.json                         ← References the plugin
└── ...
```
