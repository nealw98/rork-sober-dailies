# PROJECT RULES - Sober Dailies App
## Critical Guidelines for AI Coding Assistants

---

## ⚠️ MOST IMPORTANT RULES ⚠️

### Version Number Management
- **I manually control ALL version numbers**
- **NEVER change version numbers without explicit permission**
- Version numbers are set in `app.json`:
  - iOS: `expo.ios.buildNumber`
  - Android: `expo.android.versionCode`
- When I say "bump to version X", only change those two fields

### EAS Configuration (eas.json)
- **`appVersionSource` MUST ALWAYS be "local"**
- This ensures EAS reads version numbers from app.json (not from stores)
- NEVER change this to "remote" - it causes version number chaos
- **Before modifying ANY setting in eas.json, EXPLAIN what you're changing and WHY**

### Workflow Type
- **This is a MANAGED WORKFLOW project**
- We do NOT use the `/ios` and `/android` folders
- The `.easignore` file keeps these folders from being uploaded to EAS
- NEVER run `npx expo prebuild` unless explicitly asked
- NEVER suggest switching to native workflow to "fix" problems

---

## 📋 Build & Deployment Rules

### Building for Production
- Always use: `eas build --platform [ios|android] --profile production`
- For clean builds add: `--clear-cache`
- NEVER modify build profiles without explaining the change first

### Git & Commits
- Check git history BEFORE making configuration changes
- Look at recent commits to understand what I've been doing manually
- If you see I've been manually managing something, DON'T automate it without asking

### Before Changing Configuration Files
These files require EXTRA caution. ALWAYS explain changes before making them:
- `eas.json`
- `app.json` / `app.config.js`
- `package.json` (dependencies)
- `.easignore`

---

## 🎯 My Coding Knowledge Level

### What You Need to Know About Me
- **I have ZERO coding experience**
- I need explanations in plain English, not technical jargon
- When giving me terminal commands, provide them one at a time
- Wait for my results before giving the next command
- NO comments inside command boxes - just the command I can copy/paste

### File Editing Rules
- For JSON files: Give me the ENTIRE new file to copy/paste
- Don't ask me to "find line 27 and change X" - I'll mess up the syntax
- Exception: If it's just changing 1-2 words, then line-by-line is okay

---

## 🚨 Red Flags - Stop and Ask First

If you're about to:
- Change `appVersionSource` 
- Modify build profiles in `eas.json`
- Run `expo prebuild`
- Switch from managed to native workflow
- Change version numbers
- Modify package.json dependencies (especially react-native versions)
- Add or remove native modules
- Change app identifiers (bundle ID / package name)

**STOP. Explain what you want to do and why, and wait for approval.**

---

## 📱 App-Specific Information

### App Details
- **Name**: Sober Dailies
- **Platform**: iOS and Android (React Native with Expo)
- **Current Version**: 1.9.0
- **Current Build Numbers**: iOS (96), Android (96)

### Bundle Identifiers (DO NOT CHANGE)
- iOS: `com.rork.soberdailies`
- Android: `com.rork.soberdailies`

### Key Features
- Home Screen
- Daily Reflections
- Inventory
- AI Sponsor
- Nightly Review
- Prayers
- Literature (including Big Book content)

### Testing
- iOS: TestFlight
- Android: Internal testing track

---

## 💡 Good Practices

### Communication Style
- Explain technical concepts in simple terms
- Use analogies when helpful
- Break complex tasks into small steps
- Confirm each step completed before moving to next

### When Something Goes Wrong
- Don't immediately suggest major architectural changes
- Check the simple stuff first (cache, dependencies, etc.)
- Explain what went wrong and why
- Provide options, don't just do things

### Version Control
- Every significant change should be committed
- Write clear commit messages explaining what changed
- Push to remote regularly

---

## 🔍 Context Checking

Before making suggestions, AI assistants should:
1. Check recent git commits to see patterns
2. Look at current file contents, not just assumptions
3. Consider my manual management approach
4. Ask clarifying questions if unsure
5. Verify assumptions against actual code

---

## ❌ Things to NEVER Do

- Don't assume I know technical terms
- Don't make configuration changes "silently" 
- Don't switch approaches mid-problem without explaining
- Don't suggest "best practices" that conflict with how I'm doing things
- Don't auto-apply solutions without explaining them first
- Don't ignore git history and commit messages

---

## ✅ Final Checklist Before Major Changes

Before any build, deployment, or configuration change, verify:
- [ ] Have I explained what I'm about to do?
- [ ] Have I checked git history for context?
- [ ] Will this respect manual settings (like version numbers)?
- [ ] Is `appVersionSource` still "local"?
- [ ] Am I staying in managed workflow?
- [ ] Have I waited for explicit approval?

---

**Last Updated**: November 4, 2025
**Project Owner**: Neal Wagner
**Primary AI Assistant**: Claude (with Cursor for daily coding)
