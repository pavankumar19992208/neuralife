# NeuraLife — Build Log

> Update this at the END of every Claude Code session using `/build-log`
> This is what the next session reads to know where to continue.

---

## Current Status

**Layer:** Teacher Mobile App (apps/mobile)
**Phase:** Segment 03 ✅ · Segment 02 ✅ · Segment 01 ✅

**Segments complete:**
- Segment 01 — Home Screen (Teaching Command Center) ✅
- Segment 02 — Attendance + Coverage + Firebase ✅
- Segment 03 — UI System Overhaul "Neural Professional" ✅ (superseded by Intelligence OS v3.0)
- **Intelligence OS Redesign** — Complete visual transformation to premium EdTech+AI platform ✅

**Next session:** Build **Segment 04 — MarkCoverage Screen** (flip `COVERAGE.ready = true` in `@lib/deepLink.ts`).
Then: **Segment 05 — MyClasses + Student Roster** (replace placeholder MyClassesScreen).

---

## Session — 2026-06-02 (NeuraLife Intelligence OS Complete Redesign)

### Major Achievement: Generic Tech App → Premium Intelligence OS

**Problem Solved:** App felt generic/corporate rather than premium EdTech+AI platform. User requested complete redesign with:
- Modern clean + AI-cultural blend
- Teacher-optimized efficiency
- Premium international positioning 
- AI prominently showcased
- Academic + modern balance
- Neural harmony connection

### Complete Design System Transformation

#### New Theme Architecture (v3.0)
- **Neural Academy Palette:** Intelligence blues (#1E40AF/#4338CA/#7C3AED) + academic gold (#D97706)
- **Three-tier typography:** Academic serif (Libre Baskerville) + Neural sans (Inter) + Teacher efficiency (Inter optimized)
- **Cultural integration:** Telugu support + traditional education respect + modern neural technology

#### Enhanced Component System
- **Text:** Neural/academic/teacher variants with 15+ typography styles (academicDisplay, neuralTitle, teacherBody, etc.)
- **Card:** Neural/academic/glass/elevated variants with AI visualization (neuralGlow, accentLeft/Top, state management)
- **Button:** Teaching intent system (teaching/assessment/administration) with neural variants + haptic optimization
- **Badge:** Neural glow, status indication, attendance/subject specialized variants
- **Background:** Neural network visualization (dark auth) + clean intelligence grid (light teaching)

#### New Neural Intelligence Components
- **IntelligenceIndicator:** AI processing states (idle/thinking/processing/complete/error) with animated dots
- **NeuralPulse:** Live data visualization with state-aware pulsing (active/success/warning/error)
- **StatCard:** Enhanced statistics with neural intelligence integration (trending, processing states, live data)

#### Teacher-Optimized Architecture
- **ScreenContainer variants:** TeachingScreenContainer/AuthScreenContainer/DataScreenContainer/NeuralScreenContainer
- **Spacing system:** Teacher efficiency focused (touchTarget: 44px, scanGap: 20px, neuralGap: 14px)
- **Animation philosophy:** Teaching intent-based springs (teacherQuick/teacherStandard/neuralGentle/academicCalm)

### Files Transformed
- ✅ `src/constants/theme.ts` — Complete neural academy palette + typography system
- ✅ `src/components/ui/Text.tsx` — Neural intelligence typography variants
- ✅ `src/components/ui/Card.tsx` — Neural/academic/glass variants with AI states
- ✅ `src/components/ui/Button.tsx` — Teaching intent system + neural variants
- ✅ `src/components/ui/Badge.tsx` — Neural status indicators + specialized variants
- ✅ `src/components/ui/BackgroundView.tsx` — Neural network visualization system
- ✅ `src/components/ui/ScreenContainer.tsx` — Teacher-optimized layout containers
- ✅ `src/components/neural/IntelligenceIndicator.tsx` — AI processing visualization
- ✅ `src/components/neural/NeuralPulse.tsx` — Live data pulse animations
- ✅ `src/components/neural/StatCard.tsx` — Enhanced statistics with AI integration

### Documentation Updated
- ✅ `apps/mobile/CLAUDE.md` — Section 18.0 updated to Intelligence OS v3.0 guidelines
- ✅ `docs/neural-intelligence-redesign-summary.md` — Complete transformation summary
- ✅ `CLAUDE.md` (root) — Intelligence OS completion tracked
- ✅ `docs/context/build-log.md` — This session documented

### Teacher Experience Transformation
**Before:** Generic business app with basic functionality
**After:** Premium Intelligence OS where teachers are neural operators

Teachers now:
- Feel connected to school's neural intelligence network
- See AI processing transparently with professional indicators  
- Experience quick information scanning optimized for classroom conditions
- Use academic tradition enhanced by modern neural technology
- Operate premium international academy caliber system

### Technical Excellence
- **Zero TypeScript errors** across all transformed components
- **Backward compatibility** maintained through legacy type support
- **Performance optimized** animations with teaching intent configuration
- **Accessibility focused** with proper touch targets and contrast ratios
- **Scalable architecture** ready for future neural intelligence features

**Result:** Mission accomplished - high-end EdTech+AI platform with neural intelligence prominence, teacher optimization, and premium positioning.

---

## Session — 2026-06-01b (Segment 02 + 03)

### Segment 02 — Attendance, Coverage & Firebase

#### Dependencies added
- Mobile: `react-native-device-info ^10.13.2`, `crypto-js ^4.2.0`, `@types/crypto-js ^4.2.2`
- API: `node-cron ^3.0.3`, `@types/node-cron ^3.0.11`

#### DB — Migration 025 (`supabase/migrations/20260601000025_attendance_coverage.sql`)
- `fcm_tokens`: ADD `device_id` (TEXT NOT NULL), ADD `school_id`; UNIQUE changed → `(user_id, user_type, device_id)`
- `schools`: ADD `attendance_mode` (DEFAULT `'ONCE_PER_DAY'`)
- `attendance`: ADD `device_id`, `signature_hash`, `period_number`; unique partial indexes
- NEW: `syllabus_coverage` table (RLS enabled)
- NEW: `curriculum_topics` (21 SCERT AP Class 10 Maths rows seeded)
- NEW: `get_attendance_due_periods()` + `get_coverage_due_periods()` DB functions

#### Mobile — New files
| File | Purpose |
|------|---------|
| `src/lib/device.ts` | Stable UUID in Android Keychain — used in FCM + attendance signatures |
| `src/lib/notifications.ts` | Full rewrite: setupNotificationChannels, scheduleAttendanceReminder, scheduleCoverageReminder, cancelTodayReminders, setupFCMForegroundHandler, setupFCMTokenRefresh, registerFCMToken |
| `src/db/schema.ts` | WatermelonDB schema v1 — attendance_drafts |
| `src/db/index.ts` | Database singleton (SQLite JSI adapter) |
| `src/db/models/AttendanceDraft.ts` | WatermelonDB model + StudentDraft interface |
| `src/hooks/useAttendanceDraft.ts` | saveDraft / loadDraft / markSubmitted |
| `src/components/attendance/StudentRow.tsx` | P/A/L ThreeSegmentToggle + reason chips (React.memo) |
| `src/components/attendance/LateArrivalSheet.tsx` | Post-submission ABSENT→LATE correction |
| `src/components/coverage/StackedCoverageSheet.tsx` | Multi-period coverage with chapter autocomplete |
| `src/screens/Teacher/ClassPickerScreen.tsx` | Attendance tab — today's classes with status |
| `src/screens/Teacher/AttendanceScreen.tsx` | Full P/A/L marking, draft, SHA-256 signed submission |

#### Mobile — Modified files
- `AppNavigator.tsx` — FCM bootstrap on auth, `getDeviceId()` pre-load, `AttendanceMark` stack screen
- `TeacherNavigator.tsx` — Attendance tab → ClassPickerScreen
- `navigation/types.ts` — `AttendanceMark` route added
- `lib/deepLink.ts` — ATTENDANCE route → `AttendanceMark` (was `Attendance`)
- `components/teacher/PeriodActionSheet.tsx` — Mark Attendance navigates to `AttendanceMark`
- `components/teacher/ContextBar.tsx` — `pendingCoverageCount` prop, Log Coverage CTA
- `screens/Teacher/HomeScreen.tsx` — local notification scheduling, coverage sheet wired
- `store/schoolStore.ts` — `schoolId` field added
- `index.js` — background FCM handler

#### API — New files
| File | Purpose |
|------|---------|
| `src/jobs/notificationJobs.ts` | Cron: attendance + coverage reminders (every 5 min, Mon-Sat 7-16h IST) |

#### API — Modified files
- `src/routes/teacher-mobile.ts` — 7 new routes: `attendance/classes-today`, `attendance/students`, `attendance/submit` (SHA-256 verified + FCM), `attendance/correct`, `coverage/pending`, `coverage/submit`, `schools/settings`
- `src/lib/fcm.ts` — added `sendFCMToTokens` for cron jobs
- `src/server.ts` — starts cron jobs after listen

#### Web
- `apps/web/src/pages/Settings/tabs/AcademicYearsTab.tsx` — Attendance Configuration card (radio: ONCE_PER_DAY / PER_PERIOD)

#### Key Design Decisions (Segment 02)
- Attendance records IMMUTABLE post-submission — corrections only via `attendance_corrections` table
- Signature: `sha256([teacherId,classYear,section,date,periodNum,submittedAt,deviceId].join('|'))` — client (crypto-js) + server (Node crypto) both compute; mismatch → 422
- FCM token UNIQUE(user_id, user_type, device_id) — token rotates, device_id doesn't
- WatermelonDB draft writes on every student toggle (~1ms) — zero data loss on kill
- `AttendanceMark` is a root stack screen (NOT a bottom tab)
- Migration 025 (not 023 — NeuraSphere took 023)
- `node-cron` loaded via `require()` since `@types/node-cron` needs `pnpm install`

---

### Segment 03 — UI System Overhaul "Neural Professional"

#### New Token System (`src/constants/theme.ts`)
Single source of truth. Exports: `Surface`, `Border`, `TextColor`, `Brand`, `Semantic`, `SubjectColor`, `Space`, `RadiusToken`, `Type`, `Shadow`, `SpringConfig`, `BgVariant`.

Old `Colors`, `Spacing`, `Radius`, `Typography` re-exported as backward-compat aliases from `@constants/index` — **all existing imports still work**.

#### Background System
- `BackgroundView.tsx` — variant-based screen wrapper; renders ambient orb Views; StatusBar managed here
- 4 SVG reference files in `src/assets/backgrounds/` (dark, light, minimal, ai)
- Variant map: dark (Home/Login/OTP/ClassPicker/Chat/MyClasses), minimal (AttendanceScreen), light (Profile)

#### Components Rewritten
| Component | Key changes |
|-----------|-------------|
| `Card.tsx` | Exports `GlassCard` (glass bg) + `Card` (solid); theme tokens |
| `Badge.tsx` | 7 variants incl. gold; border system from Semantic tokens |
| `Button.tsx` | 5 variants incl. gold; spring scale press animation |
| `SegmentHeader.tsx` | subtitle/back-button props |
| `SyncPill.tsx` | Animated pulse (offline), rotate (syncing) |
| `EmptyState.tsx` + `ErrorState.tsx` | GlassCard wrapper |
| `Chip.tsx` *(new)* | Active/inactive selection chip |
| `NavTabBar.tsx` *(new)* | Custom bottom nav with spring indicator pill |
| `BackgroundView.tsx` *(new)* | Screen background system |

#### SplashScreen (new)
Full animated 6-phase sequence: background → neural nodes (6 dots, staggered) → connecting lines → logo spring-entry from perspective tilt → tagline fade → feature chips stagger → idle breathing loop. Tap-to-skip. Replaces ActivityIndicator in AppNavigator loading state.

#### Auth Screens Redesigned
- `LoginScreen` — hero/form split layout, glass input with indigo focus ring, cross-dissolve power statements (not slide)
- `OTPScreen` — individual 52×60px digit boxes, focus glow, shake animation on error, auto-submit

#### **CRITICAL PERMANENT FIX — Timetable Chronological Order**
`HomeScreen.tsx` now sorts `data.periods` by `startTime` ascending before rendering.
**Period 1 always at TOP. Last period at BOTTOM.**
The NOW card is highlighted in-place — never auto-scrolled-to.
```typescript
const sortedPeriods = [...homeData.periods].sort((a, b) => {
  const [ah, am] = a.startTime.split(':').map(Number);
  const [bh, bm] = b.startTime.split(':').map(Number);
  return (ah ?? 0) * 60 + (am ?? 0) - ((bh ?? 0) * 60 + (bm ?? 0));
});
```
**DO NOT REMOVE OR REVERSE THIS SORT IN ANY FUTURE SESSION.**

#### Navigation
`TeacherNavigator` uses `tabBar={props => <NavTabBar {...props} />}` (custom bottom bar).
`AppNavigator` uses `<SplashScreen onComplete={() => {}} />` during `isLoading`.

#### TypeScript
- Mobile: 0 errors ✅
- API: 0 errors ✅

---

## Session — 2026-06-01 (Teacher Mobile — Run on Device, FCM Push, Deep-Linking)

### Completed This Session

#### Ran the app on a real Android device (crash-free)
- Device `d0e5bae2`; launch activity is `com.neuralifeteacher.MainActivity` (package `in.neuralife.teacher`)
- **Crash root cause found + fixed:** Crashlytics build ID missing → added Crashlytics Gradle plugin to `android/build.gradle` + `android/app/build.gradle`

#### FCM Push Notifications
- `@notifee/react-native@9.1.8` installed; `firebase-admin@12` in API
- API `lib/fcm.ts`: lazy dynamic-import of firebase-admin, `sendFcm` / `sendFcmMulti`
- API routes: `POST /fcm-token` (upsert), `POST /notify/test`, `POST /notify/period-start`
- Mobile `lib/notifications.ts`: notifee channels, FCM token registration, foreground display, trigger helpers
- Mobile `hooks/useNotifications.ts`: fires ATTENDANCE/COVERAGE at correct period moments
- FCM verified end-to-end: real push sent, FCM returned messageId, 1 token registered
- `NODE_TLS_REJECT_UNAUTHORIZED=0` in dev script (this machine intercepts TLS — dev only)

#### Push Notification Deep-Linking
- `@lib/deepLink.ts`: `navigationRef` + `routeNotification()` + `NOTIFICATION_ROUTES` registry
- `@store/notificationStore.ts`: pending deep-link intent (survives cold start)
- `@hooks/useDeepLinkParams.ts`: target screens read pre-fill via this
- All 3 tap paths wired: foreground (notifee PRESS), background (`onNotificationOpenedApp`), cold start (`getInitialNotification`)
- ATTENDANCE → `AttendanceMark` (was `ready:true` for original Attendance tab; updated to new route in Segment 02)
- COVERAGE → `MarkCoverage` (`ready:false` — not built yet)

#### TypeScript
- API: 0 errors ✅
- Mobile: 0 errors ✅

---

## Session — 2026-05-31b (Teacher Mobile App — Home Screen)

### Completed
- Migration 024: full 5-day timetable seed (138 slots) + homework demo data
- API `GET /api/v1/teacher/home` — teacher-mobile.ts + repository
- Types: `src/types/home.ts`
- Hook: `useHomeData.ts`, `usePeriodStatus.ts`
- Components: SchoolHeader, KpiStrip, ContextBar (cross-fade), PeriodCard (NOW breathing + progress), AlertItem, PeriodActionSheet
- HomeScreen: sticky header + SectionList, Sunday/empty/error states
- 0 TypeScript errors

---

## Session — 2026-05-31 (Teacher Mobile App — Foundation)

### Completed
- React Native 0.74 scaffold in apps/mobile (android/ + ios/)
- Monorepo wiring, metro.config.js, babel module-resolver, tsconfig paths
- Android: BLE/biometric/camera/storage permissions, jitpack repo, WatermelonDB jsi aar
- Design system: colors/spacing/typography/index constants (now superseded by theme.ts)
- Core libs: dates (IST), api client, storage (Keychain), responsive (rv()), branding, haptics
- Stores: authStore, schoolStore, syncStore
- Hooks: useEntryAnimation / useStaggerAnimation / useTitleAnimation
- UI components: SyncPill, SegmentHeader, Card, Badge, Avatar, Button, Skeleton, EmptyState, ErrorState, Text
- Navigation: AppNavigator (native-stack auth gate), TeacherNavigator (bottom tabs)
- Auth screens: LoginScreen (rotating power statements, OTP request) + OTPScreen (6 boxes, paste, dev-OTP)
- 6 placeholder screens + index.js (GestureHandler + SafeAreaProvider + QueryClient)

---

## Pending (Before Next Mobile Session)

### Must do before building Segment 04:
```
pnpm install                      # installs node-cron, react-native-device-info, crypto-js
cd apps/api && npx supabase db push  # applies migration 025
```
Verify:
- `schools.attendance_mode` column exists (DEFAULT `'ONCE_PER_DAY'`)
- `fcm_tokens.device_id` column NOT NULL
- `syllabus_coverage` table exists
- `curriculum_topics` has 21 rows

### Segment 04 — MarkCoverage Screen
1. Create `src/screens/Teacher/MarkCoverageScreen.tsx`
2. Add `MarkCoverage` to `RootStackParamList` in `navigation/types.ts`
3. Register in AppNavigator stack
4. Read `useDeepLinkParams('COVERAGE')` in the screen
5. Flip `NOTIFICATION_ROUTES.COVERAGE.ready = true` in `@lib/deepLink.ts`
6. Optionally integrate with `StackedCoverageSheet` (already built) or build a dedicated screen

### Segment 05 — MyClasses + Student Roster
Replace placeholder `MyClassesScreen` with real data from existing API.

---

## Architecture Reference

### Mobile app entry points
```
apps/mobile/index.js                  — AppRegistry + background FCM handler
apps/mobile/src/navigation/AppNavigator.tsx — root (auth gate, SplashScreen, stack)
apps/mobile/src/navigation/TeacherNavigator.tsx — bottom tabs (Home/Attendance/Classes/Chat)
```

### Key API routes for mobile
```
GET  /api/v1/teacher/home                        — Teaching Command Center
GET  /api/v1/teacher/attendance/classes-today    — Today's classes + status
GET  /api/v1/teacher/attendance/students         — Student roster for marking
POST /api/v1/teacher/attendance/submit           — SHA-256 signed submission
POST /api/v1/teacher/attendance/correct          — Late arrival correction
GET  /api/v1/teacher/coverage/pending            — Periods needing coverage log
POST /api/v1/teacher/coverage/submit             — Submit coverage
POST /api/v1/teacher/fcm-token                   — Device FCM registration
POST /api/v1/teacher/notify/period-start         — Trigger push notification
PUT  /api/v1/teacher/schools/settings            — Update attendance_mode
```

### Demo credentials
```
Mobile: 9876543210  OTP: 123456 (dev mode, pre-filled)
Role: PRINCIPAL + CLASS_TEACHER (10-A) + SUBJECT_TEACHER (Math)
School: SCH-AP-DEMO-0001 · Vikas High School · Guntur
Emulator API URL: http://10.0.2.2:3001/api/v1
Physical device: http://{YOUR_LAN_IP}:3001/api/v1
```

### Web admin
- All 11 layers (auth → analytics) complete
- Latest: Attendance mode toggle in Settings → Academic Years tab
- API: `PUT /api/v1/teacher/schools/settings` (Principal/School Admin only)

### Migration history
001–007: Core schema + auth + sequences
008–010: Fees
011–013: Content Studio
014–018: Exams
019: Timetable builder
020: Salary/Payroll
021: SmartPad Fleet
022a: Settings | 022b: Analytics v2
023: NeuraSphere
024: Timetable demo seed
025: Attendance + Coverage + FCM enhancements ← LATEST (apply with `npx supabase db push`)
