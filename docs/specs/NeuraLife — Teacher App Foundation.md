# NeuraLife — Teacher App Foundation (Segment 0)

> Spec for the foundational scaffold of the Teacher Mobile App (`apps/mobile`).
> This is **Segment 0** — the platform every later Teacher App module builds on.
> Read alongside `apps/mobile/CLAUDE.md` (the binding implementation rules) and
> `NeuraLife___Teacher_Mobile_App.md` (the product spec).

**Status:** ✅ Built · **Date:** 2026-05-31 · **TypeScript:** 0 errors

---

## Purpose

Stand up a production-grade React Native 0.74 app inside the existing pnpm
monorepo, with the design system, state, navigation, auth flow, and a working
login → OTP → dashboard path. No feature modules yet — those are later segments,
each with its own spec doc.

---

## What Was Built

| Area            | Files                                                                         | Notes                                                                                  |
| --------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Native scaffold | `android/`, `ios/`, `app.json`                                                | RN 0.74.0, package `in.neuralife.teacher`, portrait-locked, minSdk 24 / target 34      |
| Monorepo wiring | `metro.config.js`, `babel.config.js`, `tsconfig.json`, `.env.*`, `turbo.json` | watchFolders → repo root; module-resolver aliases (`@components`, `@screens`, …)       |
| Design system   | `src/constants/theme.ts`, `src/constants/{colors,spacing,typography,index}.ts` | NeuraLife Intelligence OS v3.0: Neural Academy Palette, teacher-optimized typography, AI components |
| Core libs       | `src/lib/{dates,api,storage}.ts`                                              | IST dates; fetch client with correlation-id + 401 auto-logout; Keychain token store    |
| State           | `src/store/{auth,school,sync}Store.ts`                                        | Zustand; authStore decodes the real `apps/api` JWT                                     |
| Hooks           | `src/hooks/useEntryAnimation.ts`                                              | entry / stagger / title animations (Reanimated 3)                                      |
| UI kit          | `src/components/ui/*`                                                         | SyncPill, SegmentHeader, Card, Badge, Avatar, Button, Skeleton, EmptyState, ErrorState |
| Navigation      | `src/navigation/{AppNavigator,TeacherNavigator}.tsx`                          | native-stack auth gate; bottom tabs with conditional**My Class**                       |
| Auth screens    | `src/screens/Auth/{Login,OTP}Screen.tsx`                                      | rotating power statements, 6-box OTP w/ paste, dev-OTP prefill, resend countdown       |
| Placeholders    | `src/screens/Teacher/*`, `src/screens/ClassTeacher/MyClassScreen.tsx`         | Home, Attendance, MyClasses, MyClass, Chat, Profile                                    |
| Entry           | `index.js`                                                                    | GestureHandlerRootView + SafeAreaProvider + QueryClientProvider                        |

---

## Production / Security Decisions (binding)

1. **Tokens in Keychain, never AsyncStorage.** `react-native-keychain` with a
   dedicated service id (`in.neuralife.teacher`). Access token only is persisted;
   refresh token is held in memory this segment (see Follow-ups).
2. **No secrets in committed env.** `.env.development/.production` carry the API
   URL and a placeholder anon key; real keys stay out of git. `.env.example`
   drives `react-native-dotenv` `safe: true` (fail-fast on missing config).
3. **Correlation id on every request.** `lib/api.ts` attaches `x-correlation-id`
   (uuid v4 via `react-native-get-random-values`) — matches the API observability rule.
4. **401 ⇒ global logout.** Any 401 clears the session and routes back to Login.
5. **Role gate at login.** Only `PRINCIPAL | TEACHER | SCHOOL_ADMIN` may enter the
   Teacher App; `PARENT`/`STUDENT` are rejected with a clear message.
6. **Strict TypeScript, no `any`.** `atob`/`btoa` declared in `src/types/globals.d.ts`
   (Hermes provides them at runtime; RN types and the excluded DOM lib do not).
7. **Portrait lock + full Android permission set** (BLE, biometric, camera,
   storage, audio) declared up front so later modules need no manifest churn.
8. **Accessibility baseline** carried by the UI kit: 44px touch targets on Button,
   `allowFontScaling` via the design components, color + text never color-only.

---

## API Contract Reconciliation (important)

The product prompt assumed `POST /auth/send-otp` + `verify-otp` returning
`{token, teacher, school}`. The **real `apps/api` contract** is different and the
app was built to the real one (Spec Sync Rule):

```
POST /api/v1/auth/otp/request   { mobile: "+91XXXXXXXXXX" }
  → { message, expiresIn, devOtp? }        # devOtp present only when SMS disabled (dev)

POST /api/v1/auth/otp/verify    { mobile, otp }
  → { accessToken, refreshToken, role, expiresIn }
```

**JWT claims:** `sub`, `role` (single string: PRINCIPAL | TEACHER | SCHOOL_ADMIN),
`school_id`, `teacher_id?`, `neura_id?`, `linked_neura_ids?`, `exp`, `iat`, `jti`.

Consequences the app handles:

- `authStore` maps the single `role` → capability `roles[]`
  (`TEACHER → [SUBJECT_TEACHER]`, `PRINCIPAL → [PRINCIPAL]`, …).
- **`CLASS_TEACHER` is NOT in the JWT.** `isClassTeacher` defaults `false`; the
  "My Class" tab appears only after `setClassTeacher()` is called from a future
  teacher-profile fetch. → drives **Follow-up A**.
- No `mobile`/`school` object in the response — `mobile` is passed through from the
  OTP screen; school branding uses `schoolStore` defaults until a profile fetch.

No `apps/api`, `apps/web`, or `apps/ml` code was changed in this segment, so no
cross-repo impact. (Per `apps/api/CLAUDE.md`, any future API change must be checked
against web/ml consumers.)

---

## Running the App — Full Developer Guide

> This is the canonical "how to run" reference for the Teacher Mobile App.
> All commands are run from `apps/mobile/` unless stated otherwise.

---

### Prerequisites Checklist

**Windows (this machine):**

```
✅ Node.js 20+          node --version
✅ JDK 17               java --version   (Adoptium / Temurin 17 recommended)
✅ Android Studio       Installed with Android SDK 34
✅ Android SDK          $ANDROID_HOME set (usually C:\Users\<you>\AppData\Local\Android\Sdk)
✅ adb                  adb --version (in SDK platform-tools/)
✅ pnpm                 pnpm --version
```

**Android Studio SDK Manager — must-have:**

```
SDK Platforms:   Android 14 (API 34)  ✅
SDK Tools:       Android SDK Build-Tools 34.x
                 Android SDK Platform-Tools
                 Android Emulator
                 Intel x86 Emulator Accelerator (HAXM) or Windows Hypervisor
```

**Environment variables (set in Windows system env, restart terminal after):**

```
ANDROID_HOME=C:\Users\<you>\AppData\Local\Android\Sdk
Path += %ANDROID_HOME%\platform-tools
Path += %ANDROID_HOME%\emulator
```

---

### Step 0 — Push Supabase migration (first time only)

The timetable demo data (migration 024) must be in the DB before the Home Screen
shows any periods. Run this once from the repo root:

```bash
# From P:\neuraLife
npx supabase db push --include-all
```

Verify in Supabase Dashboard → Table Editor → `timetable_slots` — should have
138 rows for SCH-AP-DEMO-0001.

---

### Step 1 — API URL setup

The mobile app reads `API_URL` from `.env.development`. Pick the method that
matches how your API is reachable from the device/emulator:

| Method                | When to use                            | `API_URL` value                      |
| --------------------- | -------------------------------------- | ------------------------------------ |
| **Android Emulator**  | Default — emulator on same machine     | `http://10.0.2.2:3001/api/v1`        |
| **USB (adb reverse)** | Physical device via USB                | `http://localhost:3001/api/v1`       |
| **LAN / Wi-Fi**       | Physical device on same network        | `http://192.168.1.X:3001/api/v1`     |
| **ngrok**             | Any device, any network (current .env) | `https://xxxx.ngrok-free.app/api/v1` |

**For Android Emulator (fastest, no network needed):**

```bash
# Edit apps/mobile/.env.development
API_URL=http://10.0.2.2:3001/api/v1
```

**For physical device over USB:**

```bash
# Forward host port 3001 to device localhost:3001
adb reverse tcp:3001 tcp:3001

# Then set in .env.development:
API_URL=http://localhost:3001/api/v1
```

**ngrok (current default — works anywhere):**

```bash
# Start ngrok tunnel to your local API
ngrok http 3001

# Copy the https://xxxx.ngrok-free.app URL and set in .env.development
API_URL=https://xxxx.ngrok-free.app/api/v1
```

> Note: Free tier ngrok URL rotates each restart — update `.env.development` and
> restart Metro (`pnpm start:reset`) when it changes.

---

### Step 2 — Start the API server

```bash
# In a terminal at P:\neuraLife\apps\api
pnpm dev
# → API listening on :3001
# → Watch for "NeuraLife API running on port 3001"
```

---

### Step 3 — Start Metro bundler

Metro must stay running in its own terminal the entire session.

```bash
# From apps/mobile
cd "P:\neuraLife\apps\mobile"
pnpm start
```

**First time or after dependency changes — reset cache:**

```bash
pnpm start:reset
```

Metro is configured with `watchFolders: [monorepoRoot]` so it hot-reloads changes
in `packages/shared` and `apps/mobile/src` automatically.

---

### Step 4 — Run on Android

#### Option A — Android Emulator (AVD)

1. Open Android Studio → **Device Manager** → Start an existing AVD, or create:
   - Recommended: **Pixel 6 API 34** (x86_64 for speed)
   - Alternative small: **Pixel 4 API 33** (stress-test 360dp)
   - Tablet: **Pixel Tablet API 34** (validate responsive layouts)

2. Wait for emulator to fully boot (Home screen visible), then:

```bash
# From apps/mobile (Metro must already be running)
pnpm android
# alias for: npx react-native run-android
```

#### Option B — Physical Android Device

1. On the device: **Settings → Developer options → USB debugging → ON**
2. Connect via USB
3. Verify device is seen:

```bash
adb devices
# Should list: emulator-5554  device  OR  <serial>  device
```

4. Set up port forwarding (if using localhost API):

```bash
adb reverse tcp:3001 tcp:3001
```

5. Run:

```bash
pnpm android
```

#### Option C — Specific device when multiple are connected

```bash
# List device IDs
adb devices

# Run on a specific one
npx react-native run-android --deviceId <device-id>
```

---

### Demo Login

Once the app is on device:

```
Phone number:  9876543210   (Dr. S. Ramana Murthy — PRINCIPAL)
OTP:           auto-filled from API response (dev mode, SMS disabled)
               If not auto-filled: check API terminal for "devOtp: XXXXXX"

Alt teacher:   9876543211   (K. Suresh Kumar — TEACHER)
```

After login you should see the **Teaching Command Center** (Home Screen) with:

- Suresh's timetable for today's day of the week
- KPI strip (Periods / HW Due / Doubts / AT-RISK)
- Context Bar showing the correct state for current IST time
- Period cards with the NOW card highlighted (if during school hours)

---

### Build Commands

```bash
# TypeScript check (no compile, just type-check)
pnpm ts:check

# Debug APK (installs to device; also what `pnpm android` triggers)
pnpm build:apk
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Install APK manually to connected device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Release APK (requires keystore config in android/app/build.gradle)
pnpm android:release
# Output: android/app/build/outputs/apk/release/app-release.apk

# Clean Android build (fixes most Gradle/native errors)
cd android && ./gradlew clean && cd ..

# Clean + rebuild from scratch
cd android && ./gradlew clean && cd .. && pnpm android
```

---

### Logs

```bash
# Stream all React Native logs from connected device/emulator
adb logcat | grep -E "ReactNative|NeuraLife|EXCEPTION"

# Windows PowerShell version
adb logcat | Select-String "ReactNative|NeuraLife"

# Android Studio Logcat (easier)
# Open Android Studio → View → Tool Windows → Logcat
# Filter: package:in.neuralife.teacher
```

---

### Troubleshooting

| Problem                                       | Fix                                                                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Metro bundler not started`                   | Run `pnpm start` in a separate terminal                                                                                                |
| `Unable to load script — network error`       | Check API_URL in .env.development. For emulator use `10.0.2.2`, not `localhost`                                                        |
| `Could not connect to development server`     | Ensure Metro is running; try `pnpm start:reset`                                                                                        |
| `Gradle build failed — node not found`        | Android build needs Node.js on PATH. Restart Android Studio after installing Node                                                      |
| `error: duplicate attribute` in Manifest      | Run `cd android && ./gradlew clean`                                                                                                    |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE`          | Uninstall old APK from device:`adb uninstall in.neuralife.teacher`                                                                     |
| Module not found `@env`                       | Run `pnpm start:reset` (dotenv module cached)                                                                                          |
| Module not found `@components/...`            | Check `babel.config.js` alias entries; reset Metro cache                                                                               |
| `react-native-haptic-feedback` crash          | Device doesn't support haptics — handled by `enableVibrateFallback: true`                                                              |
| Red screen:`Cannot read property ... of null` | Usually stale auth state — clear app data on device (Settings → Apps → NeuraLife → Clear Data)                                         |
| `WatermelonDB` native build error             | Ensure jitpack repo in `android/build.gradle`; run `./gradlew clean`                                                                   |
| Timetable shows "No periods assigned yet"     | Push migration 024:`npx supabase db push --include-all` from repo root                                                                 |
| ngrok 403 / HTML response instead of JSON     | ngrok free-tier browser-warning — app adds `ngrok-skip-browser-warning: true` header. If still failing, check the ngrok URL is current |

---

### Hot Reload vs Full Reload

| Action                        | How                                                      |
| ----------------------------- | -------------------------------------------------------- |
| Fast Refresh (default)        | Just save a `.ts/.tsx` file — Metro pushes it live       |
| Full JS reload                | Shake device →**Reload**, or press `r` in Metro terminal |
| Hard reload + clear JS bundle | `pnpm start:reset` then re-run                           |
| Reload native code change     | Must re-run `pnpm android` (native rebuild)              |

---

### Daily Developer Workflow

```bash
# Terminal 1 — API
cd P:\neuraLife\apps\api && pnpm dev

# Terminal 2 — Metro
cd P:\neuraLife\apps\mobile && pnpm start

# Terminal 3 — Emulator already running, or device connected

# To run the app (first time or after native changes):
cd P:\neuraLife\apps\mobile && pnpm android

# After that, Fast Refresh handles code changes automatically.
```

---

### Kill Ports — Windows (cmd.exe / PowerShell)

Run these whenever you get `EADDRINUSE` or need to restart a service from scratch.

#### Find what's on a port

```cmd
netstat -ano | findstr ":3001"
netstat -ano | findstr ":8081"
netstat -ano | findstr ":5173"
```

Output format: `TCP  0.0.0.0:3001  ...  LISTENING  <PID>`  — copy the PID from the last column.

#### Kill by PID (cmd.exe)

```cmd
taskkill /F /PID <PID>
```

#### Kill by port — one-liner (PowerShell)

```powershell
# API (3001)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001 -State Listen).OwningProcess -Force

# Metro (8081)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8081 -State Listen).OwningProcess -Force

# Web console (5173)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173 -State Listen).OwningProcess -Force
```

#### Kill all three at once (PowerShell)

```powershell
@(3001, 8081, 5173) | ForEach-Object {
    $conn = Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue
    if ($conn) { Stop-Process -Id $conn.OwningProcess -Force; Write-Host "Killed port $_" }
    else        { Write-Host "Port $_ already free" }
}
```

#### Kill Gradle daemons + clean (when Gradle build hangs or corrupts)

```cmd
cd P:\neuraLife\apps\mobile\android
gradlew --stop
gradlew clean
```

If `gradlew clean` also fails (file-lock error):

```powershell
# Kill all java.exe processes (Gradle daemons)
Stop-Process -Name java -Force -ErrorAction SilentlyContinue

# Delete the Gradle cache (it rebuilds automatically next run)
Remove-Item -Recurse -Force "P:\neuraLife\apps\mobile\android\.gradle"

# Then clean + rebuild
cd P:\neuraLife\apps\mobile\android
gradlew clean
```

> **Note:** `pnpm android` and `react-native run-android` must be run in
> **cmd.exe or PowerShell**, not Git Bash — Git Bash cannot invoke `.bat` files.

---

## Known Issues & Follow-ups

| #   | Item                                                                      | Impact                                                                                                                                         | Plan                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Teacher profile fetch (`isClassTeacher`, `classSection`, school branding) | "My Class" tab + branding rely on it                                                                                                           | Build `GET /teacher/me` (or reuse teachers route) in the Home segment; call `setClassTeacher()` + `schoolStore.setSchoolData()` after login                                                                   |
| B   | pnpm + native build hoisting                                              | `gradlew` resolves `@react-native-community/cli-platform-android` via `../node_modules`; pnpm's isolated linker leaves it in the virtual store | Apply hoisting for the native build (workspace-root `node-linker=hoisted`, or a mobile-scoped install) before the first device build. Metro JS bundling already covered by `metro.config.js` nodeModulesPaths |
| C   | `victory-native@40` peer mismatch                                         | pulls `@shopify/react-native-skia@2.6.4` (wants RN ≥0.78 / React ≥19)                                                                          | Pin a charts stack compatible with RN 0.74 (e.g. older victory-native + skia, or react-native-svg-charts) when the My Performance module lands                                                                |
| D   | Refresh-token rotation / biometric unlock                                 | 30-day refresh + biometric login not wired                                                                                                     | Implement in an Auth-hardening segment (store refresh token in Keychain,`/auth/refresh`, `react-native-biometrics`)                                                                                           |
| E   | On-device verification not run                                            | No emulator/device attached in build env                                                                                                       | Run `npx react-native run-android` on a device/emulator to capture the live login → OTP → dashboard screens                                                                                                   |
| F   | `_rn_temp/` leftover at repo root                                         | Cosmetic; outside `apps/*` workspace glob                                                                                                      | Delete manually (`rmdir /s _rn_temp`) — sandbox blocked automated `rm`                                                                                                                                        |

---

## Verification

- `cd apps/mobile && npx tsc --noEmit` → **0 errors**.
- `pnpm typecheck` now includes mobile (added `typecheck` script).
- On-device run pending a connected device (Follow-up E).

---

## Pending Cross-Cutting Specs (tracked, not yet built)

These five were called out at kickoff; none exist yet and each will be specced
in the segment that introduces it:

1. **Parent PIN setup (first login)** — Parent & Student App (after OTP, set 4-digit PIN; biometric after).
2. **Student forgot PIN → Teacher reset** — Teacher App My Class (currently spec says principal-only reset); add "Forgot PIN? Contact your class teacher" on the PIN screen.
3. **Homework completion celebration** — Parent App FCM + "Tell him you're proud" push to student.
4. **NeuraPath class-teacher note** — Teacher App My Class → Student → NeuraPath Note (Module 4 addition).
5. **Parent NeuraSphere 7–8 toggle** — Parent App Profile → Parental Controls; persists server-side.

---

_Segment 0 of the Teacher Mobile App. Next: Home / Teaching Command Center (Module 1)._
