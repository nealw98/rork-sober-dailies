# Android Google Drive backup — activation checklist

**Goal:** turn on the Android cloud-backup feature (Google Drive) so it ships in the app. It is currently **coded but hidden** because the Google Cloud OAuth client isn't set up yet. iOS (iCloud) is unaffected and already works.

**Status when this doc was written (2026-07-23):** code complete; feature hidden; **no Google Cloud project exists yet** (the signed-in account had zero projects). Next action = create the Cloud project.

---

## The one thing to understand
There is **no app code left to write.** The Drive code (`lib/googleDriveAuth.ts`, `lib/cloudSync.ts`) is complete and correct:
- Uses the `https://www.googleapis.com/auth/drive.appdata` scope (Drive's hidden per-app folder).
- Needs **no client ID / `webClientId` in the app** — Google Play Services matches the request automatically by **package name + signing SHA-1**.
- The native module (`@react-native-google-signin/google-signin`) autolinks on Android.

So activation = **external Google setup + un-hide one line + a native rebuild.** It is **NOT OTA-able** — it must ride a new EAS build.

Key values:
| Field | Value |
|---|---|
| Android package | `com.nealwagner.soberdailies` |
| OAuth scope | `https://www.googleapis.com/auth/drive.appdata` |
| Consent-screen user type | External |

---

## Step 1 — Google Cloud Console (console.cloud.google.com)
1. **Create a project** (none exists). Name e.g. `Sober Dailies`; auto ID is fine. Use a Google account you control long-term — it holds the OAuth config the app depends on. (Does NOT need to match the Play Console account.)
2. **APIs & Services → Library → "Google Drive API" → Enable.**
3. **OAuth consent screen** → User type **External** → fill app name, support email, developer contact → add scope `.../auth/drive.appdata`.
   - ⚠️ **`drive.appdata` is a "sensitive" scope.** While the consent screen is in *Testing* status, only **test users you add** (up to 100 Gmail accounts) can sign in. For a Play **open** test with arbitrary users you must either (a) add each tester's Gmail as a test user, or (b) **publish** the consent screen — which triggers Google's **OAuth verification review** (days-to-weeks). Practical path for a first open test: add test users. Budget for verification before public launch.
4. **Credentials → Create OAuth client ID → Android**, package `com.nealwagner.soberdailies`, and register the **SHA-1** of each signing cert that will run the app (one Android client per SHA-1).

## Step 2 — Get the SHA-1s to register
| Cert | Why it's needed | How to get it |
|---|---|---|
| **Play App Signing** | Installed open-test builds run under Play's re-signing cert | Play Console → app → Test and release → Setup → **App integrity** → App signing key certificate → SHA-1 |
| **EAS keystore** | Signs the AAB you upload | `eas credentials` → Android → Keystore (shows SHA-1/256) |
| Debug (optional) | Local `expo run:android` testing | `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android` |

## Step 3 — Code / config (do this in the SAME build as the working OAuth, not before)
1. **Un-hide the feature:** in `lib/cloudSync.ts`, `cloudBackupSupported()` currently returns `false` on Android. Flip it back to `return driveAuthSupported();` (and re-add the `driveAuthSupported` import from `./googleDriveAuth`). Do NOT un-hide until the OAuth clients + SHA-1s are registered, or testers hit the dead-end "Connect" again.
2. **Do NOT add the `@react-native-google-signin/google-signin` config plugin** to `app.json` — the module autolinks on Android without it, and the plugin would demand an iOS URL scheme we don't want (keeps iOS untouched).
3. **Bump `android.versionCode`** in `app.json`.

## Step 4 — Build & ship
- Native **EAS build** for Android: `eas build --platform android --profile production` (produces the AAB). **Not OTA-able.**
- Upload the AAB to the Play **open testing** track.

## Step 5 — Verify
- On a device signed in with a **registered test-user** Google account: Settings → **Backup & Restore** → **Connect Google Drive** → confirm sign-in succeeds and a backup writes (no `DEVELOPER_ERROR`).

---

## Related
- Memory: `todo-android-drive-backup-activation`, `icloud-sync-plan` (Phase 2 Android), `android-build-3.0.6`.
- The hide/un-hide switch lives at `lib/cloudSync.ts` → `cloudBackupSupported()`.
- Symptom if shipped un-hidden without OAuth: "Connect Google Drive" throws `DEVELOPER_ERROR`, caught → *"Couldn't connect"* alert. No crash, but a visibly dead feature.
