# Release Operations

## Channels and runtime policy

- Channel: `production`
- Runtime policy: `{ "policy": "appVersion" }`
- Current app version/runtime: `1.8.3`

## Build profiles

- production: distribution `store`, channel `production`
- preview: distribution `internal`, channel `dev`

## Build the 1.8.3 release candidate (iOS)

```bash
git checkout main
eas build --platform ios --profile production
```

Verify on the build page:
- Channel = `production`
- Runtime version = `1.8.3`

## OTA updates for 1.8.3 (JS-only)

```bash
git checkout main
eas update --branch main --message "OTA: <what changed>"
```

## Hotfixing a previous runtime (1.8.2)

```bash
git checkout -b release/1.8.2 v1.8.2
eas update --branch release/1.8.2 --message "1.8.2 hotfix: <desc>"
```

Explanation: Devices on 1.8.2 receive updates published to `release/1.8.2`. Devices on 1.8.3 ignore them due to runtime mismatch.

## Guardrails for OTA safety

OTA is safe only if ALL are true:
- Same channel (`production`)
- Same runtime (`appVersion`, here `1.8.3`)
- No native changes (permissions, icons, entitlements, iOS/Android config, Expo/React Native native modules, Xcode/Gradle changes)

Quick preflight diff (replace BUILD_SHA with the TestFlight/Play build commit):

```bash
git diff --name-only <BUILD_SHA>..HEAD -- app.json app.config.* package.json ios android
```

If any native changes exist → cut a new build, do NOT publish an OTA.


