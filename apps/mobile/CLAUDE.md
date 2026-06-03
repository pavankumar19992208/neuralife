# NeuraLife — Teacher Mobile App

## Claude Code Instructions · apps/mobile

_Read this completely before writing any code for the mobile app._
_This is the single source of truth for all mobile development decisions._

---

## How to Use This File

Before every mobile task, Claude must:

1. Read this file completely
2. Read the relevant command file (see Section 18 — Command Files)
3. Never deviate from the patterns described here
4. check depenedent api and screens from other repos like ml, web and their api's , if they would be impacted with this change check them also, should work properly

---

## 1. App Identity

```
App name:          NeuraLife Teacher
Package (Android): in.neuralife.teacher
Bundle ID (iOS):   in.neuralife.teacher
Version:           0.1.0 (build 1)
Platform:          Android 7.0+ (API 24+) primary · iOS 14+ (v2)
APK/IPA:           One app, three login modes (Teacher / Parent / Student)
Orientation:       Portrait locked · Landscape: tablets + PTM mode only
Theme:             Dark mode default · Light mode toggle in Profile
Language:          English default · Telugu toggle
```

---

## 2. Tech Stack (LOCKED — never suggest alternatives)

```yaml
Framework:           React Native 0.74.x
Language:            TypeScript 5.x (strict mode always on)
Navigation:          @react-navigation/native 6.x
                     @react-navigation/bottom-tabs 6.x
                     @react-navigation/stack 6.x
State:               zustand 4.x
Offline DB:          @nozbe/watermelondb 0.27.x
Server State:        @tanstack/react-query 5.x
Animations:          react-native-reanimated 3.x
Gestures:            react-native-gesture-handler 2.x
Safe Areas:          react-native-safe-area-context 4.x
Screens:             react-native-screens 3.x
Charts:              react-native-gifted-charts 1.4.x  (svg-based; victory-native 40 needs Skia+RN0.78 — incompatible with 0.74)
Push:                @react-native-firebase/messaging 20.x
Crash Reporting:     @react-native-firebase/crashlytics 20.x
Auth Storage:        react-native-keychain 8.x
Biometric:           react-native-biometrics 3.x
BLE:                 react-native-ble-plx 3.x
Images:              react-native-fast-image 8.x
Icons:               react-native-vector-icons 10.x
PDF:                 react-native-pdf 6.x
Audio:               react-native-audio-recorder-player 3.x
Haptics:             react-native-haptic-feedback 2.x
Gradients:           react-native-linear-gradient 2.x
Image Picker:        react-native-image-picker 7.x
NetInfo:             @react-native-community/netinfo 11.x
Hooks:               @react-native-community/hooks 3.x
Date Utilities:      date-fns 3.x
UUID:                uuid 9.x
i18n:                react-i18next 14.x + i18next 23.x
Env Variables:       react-native-dotenv 3.x
```

---

## 3. File Architecture (strict — never deviate)

```
apps/mobile/
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.tsx          ← root (auth → role → navigator)
│   │   ├── TeacherNavigator.tsx      ← phone: bottom tabs, tablet: sidebar
│   │   ├── ParentNavigator.tsx       ← phone: bottom tabs, tablet: sidebar
│   │   ├── StudentNavigator.tsx      ← bottom tabs (phone + tablet same)
│   │   └── types.ts
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── OTPScreen.tsx
│   │   ├── Teacher/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── AttendanceScreen.tsx
│   │   │   ├── MyClassesScreen.tsx
│   │   │   ├── ChatScreen.tsx
│   │   │   └── ProfileScreen.tsx
│   │   ├── ClassTeacher/
│   │   │   └── MyClassScreen.tsx
│   │   ├── Parent/
│   │   │   ├── ParentHomeScreen.tsx
│   │   │   ├── MyChildScreen.tsx
│   │   │   ├── ConnectScreen.tsx
│   │   │   └── ParentProfileScreen.tsx
│   │   └── Student/
│   │       ├── StudentHomeScreen.tsx
│   │       ├── LearnScreen.tsx
│   │       └── AchievementsScreen.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Text.tsx              ← ALWAYS use this, not RN Text
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── SyncPill.tsx
│   │   │   ├── SegmentHeader.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── LoadingButton.tsx
│   │   │   └── Divider.tsx
│   │   ├── teacher/
│   │   │   ├── PeriodCard.tsx
│   │   │   ├── StudentRow.tsx
│   │   │   ├── AttendanceToggle.tsx
│   │   │   ├── ContextCard.tsx
│   │   │   └── PriorityActionCard.tsx
│   │   └── layout/
│   │       ├── ScreenWrapper.tsx
│   │       ├── AdaptiveLayout.tsx    ← phone stack vs tablet split
│   │       └── KeyboardView.tsx
│   ├── hooks/
│   │   ├── useEntryAnimation.ts
│   │   ├── useAuth.ts
│   │   ├── useSyncStatus.ts
│   │   ├── useSchool.ts
│   │   ├── useHaptic.ts
│   │   ├── useOfflineQuery.ts
│   │   ├── usePeriodStatus.ts
│   │   └── useAttendanceMode.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── schoolStore.ts            ← includes branding fields
│   │   └── syncStore.ts
│   ├── db/
│   │   ├── schema.ts
│   │   ├── index.ts
│   │   └── models/
│   ├── services/
│   │   ├── api.ts
│   │   ├── attendance.service.ts
│   │   ├── classes.service.ts
│   │   ├── chat.service.ts
│   │   ├── leave.service.ts
│   │   ├── ble.service.ts
│   │   └── notifications.service.ts
│   ├── lib/
│   │   ├── responsive.ts             ← rv() helper + screen breakpoints
│   │   ├── branding.ts               ← useBranding() hook
│   │   ├── dates.ts
│   │   ├── storage.ts
│   │   └── haptics.ts
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── index.ts
│   └── types/
│       ├── api.ts
│       ├── teacher.ts
│       └── navigation.ts
├── android/
├── ios/
├── CLAUDE.md
├── metro.config.js
├── babel.config.js
├── tsconfig.json
├── package.json
├── .env.development
├── .env.production
└── .env.d.ts
```

---

## 4. Responsive Design System

### Device Matrix

| Category              | Width        | Breakpoint  |
| --------------------- | ------------ | ----------- |
| Android phone         | 360–414 dp   | `phone`     |
| iPhone                | 375–430 pt   | `phone`     |
| Android tablet 7–8"   | 600–800 dp   | `tablet-sm` |
| Android tablet 10–12" | 800–1024 dp  | `tablet-lg` |
| iPad standard         | 768–820 pt   | `tablet-sm` |
| iPad Pro              | 1024–1366 pt | `tablet-lg` |

**Rule:** Design for phone first. Tablet is the upgraded version — more columns, wider panels, split views.

### lib/responsive.ts (create this file)

```typescript
import { Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

export const screen = {
  width,
  height,
  isPhone: width < 600,
  isTabletSm: width >= 600 && width < 900,
  isTabletLg: width >= 900,
  isTablet: width >= 600,
  isLandscape: width > height,
  isIOS: Platform.OS === "ios",
  isAndroid: Platform.OS === "android",
};

// Responsive value — picks phone value by default, upgrades for tablet
// phone required, tablet + tabletLg optional
export function rv<T>(phone: T, tablet?: T, tabletLg?: T): T {
  if (screen.isTabletLg && tabletLg !== undefined) return tabletLg;
  if (screen.isTablet && tablet !== undefined) return tablet;
  return phone;
}
```

### How to Use rv()

```typescript
// Import ALWAYS from lib/responsive:
import { rv, screen } from "@lib/responsive";

// Columns in a grid:
const columns = rv(1, 2, 3);

// Padding:
const padding = rv(Spacing.lg, Spacing.xxl, Spacing.xxxl);

// Font size:
const fontSize = rv(14, 15, 16);

// Conditional layout:
if (screen.isTablet) {
  // sidebar layout
} else {
  // bottom tabs
}
```

### Landscape Testing Rule

ALWAYS test landscape AND portrait on tablet screens.
The attendance marking screen is frequently used in landscape on tablets
(teacher props tablet on a desk and marks while standing).
Ensure no content is cut off in landscape orientation.

---

## 5. Navigation Architecture

```
AppNavigator (root — reads JWT role on launch)
├── role = TEACHER | PRINCIPAL  → TeacherNavigator
├── role = PARENT               → ParentNavigator
└── role = STUDENT              → StudentNavigator

TeacherNavigator:
  Phone  → Bottom tabs: [Home] [Attendance] [My Classes] [Chat] [Profile]
           + My Class tab if CLASS_TEACHER role
  Tablet → Persistent sidebar (always visible, 280dp)
           Same items as bottom tabs, just repositioned

ParentNavigator:
  Phone  → Bottom tabs: [Home] [My Child] [Connect] [Profile]
  Tablet → Persistent sidebar

StudentNavigator:
  Phone  → Bottom tabs: [Home] [Learn] [NeuraSphere] [Achievements]
           (age-gated per class band)
  Tablet → Same as phone (student content is focused, not wide)

Tablet sidebar implementation:
  import {screen} from '@lib/responsive';
  if (screen.isTablet) {
    // Use DrawerNavigator (persistent) instead of BottomTabNavigator
  }
```

---

## 6. School Branding System

**School brand is PROMINENT. NeuraLife is the base layer.**
**"Powered by NeuraLife" appears only in footer and Settings.**

### schoolStore.ts — Branding Fields

```typescript
interface SchoolState {
  schoolId: string;
  schoolName: string;
  schoolShortName: string; // 'VHS' — used in compact spaces
  schoolLogoUrl: string | null;
  brandColor: string; // HEX — headers, primary CTAs
  brandColorLight: string; // tint — backgrounds, highlights
  footerTagline: string; // 'Excellence Since 2001' — optional
  attendanceMode: "ONCE_PER_DAY" | "PER_PERIOD";
  currentAcademicYear: string;
  workingDays: number[];
}
```

### lib/branding.ts

```typescript
import { useSchoolStore } from "@store/schoolStore";

export function useBranding() {
  const s = useSchoolStore();
  return {
    schoolName: s.schoolName,
    schoolShortName: s.schoolShortName,
    logoUrl: s.schoolLogoUrl,
    headerBg: s.brandColor,
    headerTint: s.brandColorLight,
    headerText: "#FFFFFF",
    accentColor: s.brandColor,
  };
}
```

### Branding Rules

```
App header:        school logo + school name (NOT NeuraLife logo)
Reports/PDFs:      school letterhead
Push notifications: "From {schoolName}" — not "From NeuraLife"
Login screen:      school logo prominent, NeuraLife logo small at bottom
Dashboard header:  school brandColor as background
Footer/Settings:   "Powered by NeuraLife" — only here
```

---

## 7. Design System (LOCKED — use exact values)

### Colours (Dark Mode — Default)

```typescript
// Import: import {Colors} from '@constants/index'

Background:     #0f172a  (Slate 900)
Surface:        #1e293b  (Slate 800)
SurfaceHigh:    #334155  (Slate 700)
Border:         rgba(255,255,255,0.08)
TextPrimary:    #f1f5f9  (Slate 100)
TextSecondary:  #94a3b8  (Slate 400)
TextMuted:      #475569  (Slate 600)

Brand:
  Accent:       #6366f1  (Indigo 500) — NeuraLife brand base
  SchoolAccent: useBranding().accentColor — primary CTAs and highlights

Status:
  Success:  #10b981  Warning: #f59e0b  Danger: #ef4444  Info: #3b82f6

Subjects:
  Math: #3b82f6  English: #f59e0b  Science: #10b981
  Telugu: #ef4444  Social: #8b5cf6  Biology: #84cc16
  Hindi: #ec4899  Physics: #0ea5e9  Chemistry: #f97316

Attendance:
  Present: #10b981  Late: #f59e0b  Absent: #ef4444
```

### Spacing

```typescript
// Import: import {Spacing, Radius} from '@constants/index'
xs:4  sm:8  md:12  lg:16  xl:20  xxl:24  xxxl:32  huge:48  massive:64
Radius: sm:8  md:12  lg:16  xl:24  full:999
```

---

## 8. Custom Text Component (MANDATORY)

**NEVER use React Native's Text directly.**
**ALWAYS use the custom Text component from @components/ui/Text**

```typescript
// components/ui/Text.tsx
import React from 'react';
import {Text as RNText, TextStyle, TextProps} from 'react-native';
import {rv} from '@lib/responsive';
import {Colors} from '@constants/index';

type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'label' | 'mono' | 'power';

const variantStyles: Record<TextVariant, TextStyle> = {
  h1:       {fontSize: rv(24, 28, 32), fontWeight: '700', letterSpacing: -0.5},
  h2:       {fontSize: rv(20, 22, 24), fontWeight: '600', letterSpacing: -0.3},
  h3:       {fontSize: rv(16, 18, 20), fontWeight: '600'},
  body:     {fontSize: rv(14, 15, 16), lineHeight: rv(22, 24, 26)},
  bodySmall:{fontSize: rv(12, 13, 14), lineHeight: rv(18, 20, 21)},
  caption:  {fontSize: rv(11, 12, 13), color: Colors.textMuted},
  label:    {fontSize: rv(12, 12, 13), fontWeight: '600', letterSpacing: 0.3},
  mono:     {fontSize: rv(12, 13, 14), fontFamily: 'monospace'},
  power:    {fontSize: rv(14, 15, 16), fontWeight: '300', letterSpacing: 0.3},
};

interface CustomTextProps extends TextProps {
  variant?: TextVariant;
  telugu?: boolean;
  color?: string;
}

export function Text({variant = 'body', telugu = false, color, style, children, ...props}: CustomTextProps) {
  return (
    <RNText
      allowFontScaling={true}    // ALWAYS true — respects user accessibility
      style={[
        variantStyles[variant],
        {color: color ?? Colors.textPrimary},
        telugu ? {fontFamily: 'NotoSansTelugu'} : undefined,
        style,
      ]}
      {...props}>
      {children}
    </RNText>
  );
}
```

**Telugu font setup:**

- Download NotoSansTelugu from fonts.google.com
- Place in android/app/src/main/assets/fonts/
- Place in ios/NeuraLifeTeacher/fonts/
- Run: npx react-native-asset (links fonts automatically)

---

## 9. Cross-Platform Rules (iOS + Android)

```
SAFE AREA:
  import {SafeAreaView} from 'react-native-safe-area-context';
  ALL screens: <SafeAreaView style={{flex:1, backgroundColor: Colors.bg}}>
  NEVER use built-in SafeAreaView from react-native

STATUS BAR:
  import {StatusBar} from 'react-native';
  Every screen: barStyle="light-content" backgroundColor={Colors.bg}
  Set once in AppNavigator (not per screen)

SHADOWS:
  import {Platform} from 'react-native';
  iOS: shadowColor, shadowOffset, shadowOpacity, shadowRadius
  Android: elevation
  Set BOTH always — use Shadow constant from @constants

TOUCHABLES:
  Use TouchableOpacity (not Pressable, not TouchableHighlight)
  activeOpacity: 0.7 always
  hitSlop: {top:8, bottom:8, left:8, right:8} for small icons

KEYBOARD:
  Use custom KeyboardView from @components/layout/KeyboardView
  behavior: Platform.OS === 'ios' ? 'padding' : 'height'

FONTS:
  Do NOT specify fontFamily for English text — system font (SF on iOS, Roboto on Android)
  For Telugu: fontFamily: 'NotoSansTelugu' via the Text component
  For numbers/IDs: fontFamily: 'monospace' via Text variant="mono"

MINIMUM TOUCH TARGET:
  minHeight: 44, minWidth: 44 on ALL pressable elements
  This is non-negotiable — accessibility requirement
  allowFontScaling: true on ALL Text elements (via custom Text component)

BACK NAVIGATION:
  Android: hardware back button handled by React Navigation automatically
  iOS: swipe-from-left gesture handled automatically
  Never add explicit back buttons on first-tab screens
```

---

## 10. Architecture Rules (non-negotiable)

```
API CALLS:
  NEVER call API directly in components
  ALWAYS use services: import {attendanceService} from '@services/attendance.service'
  Services use api.ts client
  Hooks wrap services via TanStack Query

WATERMELONDB:
  ALWAYS read from DB first (instant, offline)
  THEN fetch network → update DB → component re-renders
  Use useOfflineQuery hook — it handles this automatically
  Direct DB manipulation: only in services

ZUSTAND STORES:
  authStore:   JWT, teacherId, schoolId, roles
  schoolStore: branding, attendance mode, academic year
  syncStore:   connection status, pending count
  No business logic in stores

TANSTACK QUERY conventions:
  queryKey: ['entity', 'action', {filters}]
  Examples:
    ['attendance', 'today', {classId}]
    ['students', 'list', {classYear, section}]
  staleTime: 2 * 60 * 1000 for most queries
  staleTime: 0 for real-time data (doubts, chat)

TYPES:
  All API response types: src/types/api.ts
  All navigation types:  src/types/navigation.ts
  All domain types:      src/types/teacher.ts
  NEVER use 'any' — use 'unknown' and narrow

ERROR HANDLING:
  Services: throw ApiError
  Hooks: return {data, isLoading, error, refetch}
  Screens: show ErrorState component when error is truthy
```

---

## 11. Offline-First Rule (mandatory for every screen)

```
EVERY screen that shows data MUST work offline.

Load order:
  1. WatermelonDB → render immediately (0ms, no spinner)
  2. Network fetch (background) → update DB → re-render silently
  3. SyncPill shows amber when offline or records pending

NEVER:
  Block UI waiting for network
  Show blank screen before showing cached data
  Lose data entered offline

Pattern: See .claude/commands/mobile-offline.md
```

---

## 12. Screen Template (mandatory)

Every screen must follow this exact structure:

```typescript
import React from 'react';
import {SafeAreaView, ScrollView, StyleSheet, RefreshControl} from 'react-native';
import {StatusBar} from 'react-native';
import {Text} from '@components/ui/Text';
import {SegmentHeader} from '@components/ui/SegmentHeader';
import {SyncPill} from '@components/ui/SyncPill';
import {CardSkeleton} from '@components/ui/Skeleton';
import {EmptyState} from '@components/ui/EmptyState';
import {ErrorState} from '@components/ui/ErrorState';
import {Colors, Spacing} from '@constants/index';
import {rv} from '@lib/responsive';
import {useBranding} from '@lib/branding';

export function ExampleScreen() {
  const {accentColor} = useBranding();
  const {data, isLoading, error, refetch} = useExampleData();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <SyncPill />
        <SegmentHeader title="Title" caption="Power caption." />
        <CardSkeleton /><CardSkeleton /><CardSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <ErrorState message={error.message} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!data || data.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <SyncPill />
        <SegmentHeader title="Title" caption="Power caption." />
        <EmptyState icon="📭" title="Nothing here yet" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <SyncPill />
      <SegmentHeader title="Title" caption="Power caption." />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }>
        {/* content */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg},
  content:   {padding: rv(Spacing.lg, Spacing.xl), paddingBottom: Spacing.huge},
});
```

---

## 13. Animation Rules

```
LIBRARY: react-native-reanimated 3.x ONLY
Never use Animated from react-native

HOOKS (import from @hooks/useEntryAnimation):
  useEntryAnimation(options?)   — fade + slide up + scale
  useStaggerAnimation(index)    — list items, 50ms per item
  useTitleAnimation(delay?)     — title slides up
  useFadeIn(delay?, duration?)  — opacity only
  usePulse()                    — repeat scale (live dots)
  useSlideInRight()             — panels sliding in
  useScaleIn(delay?)            — scale from 0.8 → 1.0

SPRING CONFIGS:
  Snappy: {damping: 20, stiffness: 300}  — buttons, toggles
  Smooth: {damping: 22, stiffness: 200}  — cards entering
  Gentle: {damping: 30, stiffness: 150}  — modals, sheets

For animation patterns: Read .claude/commands/mobile-animation.md
```

---

## 14. Haptic Feedback Rules

```
ALWAYS use useHaptic() hook from @hooks/useHaptic:

Attendance toggle:    haptic.light()
Primary button:       haptic.medium()
Long press:           haptic.heavy()
Submit success:       haptic.success()
Validation error:     haptic.error()
Pull-to-refresh:      haptic.success() (on release)
BLE device found:     haptic.light()
BLE sync complete:    haptic.success()
```

---

## 15. IST Date Rule (critical)

```typescript
// NEVER: new Date()
// ALWAYS: import from @lib/dates

import { todayIST, formatDate, timeAgo, currentMonthYear } from "@lib/dates";

// For API calls:
{
  date: todayIST().toISOString();
} // NOT new Date()

// For display:
timeAgo(lastSyncAt); // "3h ago"
formatDate(examDate); // "May 20, 2026" or "Today"
currentMonthYear(); // "2026-05"
```

---

## 15.5 Push Notification Deep-Linking (MANDATORY for every push)

**Every push notification MUST open the relevant screen with the relevant data
already selected when tapped.** A "Mark Attendance" push opens the Attendance
screen with that class/section/subject pre-selected; a "Mark Coverage" push
opens Mark Coverage pre-selected; and so on for every future notification type.
This is non-negotiable — a notification that opens a blank app is a bug.

The plumbing already exists. You do NOT rebuild it — you plug into it.

### The 3 pieces

```
@lib/deepLink.ts          — navigationRef + routeNotification() + NOTIFICATION_ROUTES registry
@store/notificationStore  — holds the pending deep-link (survives cold start / unbuilt screens)
@hooks/useDeepLinkParams  — target screens call this to get their pre-fill selection
```

Taps are already handled in `@lib/notifications.ts` for all three cases:
foreground (notifee `onForegroundEvent`), background (`onNotificationOpenedApp`),
and cold start (`getInitialNotification`). All call `routeNotification(data)`.

### Adding a NEW push notification (follow exactly)

1. **API** — put routing data on the FCM `data` payload. **All values must be
   strings.** Always include `type` and `screen`, plus whatever the target needs:
   ```ts
   data: {
     channelId, type: 'ATTENDANCE', screen: 'Attendance',
     classYear: String(classYear), section, subject,
     periodNumber: String(periodNumber), date: todayIST().date,
   }
   ```
   (See `apps/api/src/routes/teacher-mobile.ts` → `/notify/period-start`.)

2. **deepLink.ts** — add a `NOTIFICATION_ROUTES[type]` entry:
   ```ts
   MY_TYPE: { tab: 'SomeTab', screen: 'MyScreen', ready: false, label: 'My Screen' },
   ```
   Keep `ready: false` until the screen exists. While false, a tap is **stored,
   not lost**, and the user sees a "opens here once that screen is built" toast.

3. **Target screen** — when you build it:
   - register its route name in the navigator,
   - flip its entry to `ready: true` in `NOTIFICATION_ROUTES`,
   - read its pre-fill at the top of the component:
     ```ts
     const prefill = useDeepLinkParams('MY_TYPE'); // {classYear, section, subject, …}
     ```
     Use `prefill` to pre-select the class/section/subject/etc.

   Pending taps captured before the screen existed flush automatically.

4. **Local fallback** — if the notification can also be shown locally (offline,
   via notifee `displayNotification`), attach the **same** `data` shape so taps
   route identically online or offline. (See `periodDeepLinkData()` in
   `@lib/notifications.ts`.)

### Rules

- FCM `data` values are **always strings** — parse in the screen (`Number(x)`).
- Never navigate directly from notification code — always go through
  `routeNotification()` so cold-start + pending logic is honoured.
- A target screen reads `route.params` first, then the pending store — that's
  exactly what `useDeepLinkParams` does. Don't reinvent it.
- Currently ready: `ATTENDANCE` → Attendance tab. Not yet built: `COVERAGE` →
  `MarkCoverage` (entry exists, `ready:false`).

Full reference + step-by-step: `.claude/commands/mobile-push-notifications.md`.

---

## 16. Performance Rules

```
FLATLIST (required for > 20 items):
  keyExtractor: (item) => item.id
  getItemLayout: when item height is fixed
  removeClippedSubviews: true (Android)
  maxToRenderPerBatch: 10
  windowSize: 10
  initialNumToRender: 8

IMAGES: Always FastImage (not RN Image)
MEMOIZATION: React.memo for list items, useMemo for filtered lists
AVOID IN RENDER: inline arrow functions, object creation, new Date()
```

---

## 17. Build Commands

```bash
# Metro server (keep running):
cd apps/mobile && npx react-native start

# Run on Android:
cd apps/mobile && npx react-native run-android

# Run on specific device:
npx react-native run-android --deviceId {ID}
adb devices  ← get IDs

# TypeScript check:
cd apps/mobile && npx tsc --noEmit

# Build debug APK:
cd apps/mobile/android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Install APK:
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Clear Metro cache:
npx react-native start --reset-cache

# Clean Android:
cd android && ./gradlew clean

# List devices:
adb devices

# View logs:
adb logcat | findstr "ReactNative"
```

---

## 18. Command Files — Claude Reads These When Needed

**Before creating a new screen:**
→ Read `.claude/commands/new-screen.md`

**Before creating a UI or teacher component:**
→ Read `.claude/commands/mobile-component.md`

**Before writing any animation:**
→ Read `.claude/commands/mobile-animation.md`

**Before implementing offline features or WatermelonDB:**
→ Read `.claude/commands/mobile-offline.md`

**Before building the BLE SmartPad sync feature:**
→ Read `.claude/commands/mobile-ble.md`

**Before adding API routes for mobile endpoints:**
→ Read `.claude/commands/mobile-api-route.md`

**Before running verification / after completing a prompt:**
→ Read `.claude/commands/mobile-check.md`

**Before implementing responsive layouts (tablet support):**
→ Read `.claude/commands/mobile-responsive.md`

**Before adding/changing ANY push notification (or a screen a push opens):**
→ Read `.claude/commands/mobile-push-notifications.md`

---

## 18.0 Design System — "NeuraLife Intelligence OS" v3.0

### Core Philosophy
**"Teachers as Neural Operators of School Intelligence"**

- **Premium International Academy** aesthetic with neural intelligence cues
- **Teacher-optimized efficiency** for quick information scanning
- **AI-powered assistance** prominently featured but never intimidating  
- **Academic tradition** meets **modern neural networks**
- **Light-first interface** with neural visualization layers

### Neural Academy Palette — ALWAYS import from `src/constants/theme.ts`
```typescript
import { 
  Palette, Surface, Border, TextColor, Brand, Semantic, 
  Space, RadiusToken, Shadow, Type, SpringConfig 
} from '@constants/theme';
```

**Color Philosophy:**
- **Neural Intelligence Core:** `#1E40AF` (neuralBlue), `#4338CA` (neuralIndigo), `#7C3AED` (neuralViolet)
- **Academic Heritage:** `#D97706` (academicGold), `#DC2626` (scholarRed)
- **Premium International:** Clean whites with subtle neural hints
- **Teacher Efficiency:** High contrast, optimized for quick scanning

### Typography Hierarchy — Neural Intelligence + Academic Tradition
```typescript
// Academic Hierarchy (serif for traditional/important content)
Type.academicDisplay, Type.academicTitle, Type.academicSubtitle

// Neural Interface (sans for efficiency)  
Type.neuralDisplay, Type.neuralTitle, Type.neuralSubtitle

// Teacher Interface (optimized for scanning)
Type.teacherHeading, Type.teacherLabel, Type.teacherBody, Type.teacherCaption

// Data & Numbers (teacher efficiency)
Type.dataLarge, Type.dataMedium, Type.dataSmall

// Technical/ID Information
Type.technical, Type.technicalLarge
```

**Font System:**
- **Academic:** Libre Baskerville (serif) for traditional/important content
- **Interface:** Inter (sans) for efficiency and scanning  
- **Technical:** JetBrains Mono for IDs and technical data
- **Cultural:** Noto Sans Telugu for Telugu content

### Neural Background System — use ScreenContainer
```typescript
import { ScreenContainer, TeachingScreenContainer, AuthScreenContainer } from '@components/ui/ScreenContainer';

// Auth screens: Full neural network visualization
<AuthScreenContainer animated={true}>

// Teaching interface: Clean with subtle neural hints  
<TeachingScreenContainer>

// Data-heavy screens: Strong scrim for readability
<DataScreenContainer>
```

**Background Intelligence:**
- **Dark Mode:** Deep neural network with animated connections, brain glow
- **Light Mode:** Clean intelligence grid with subtle neural connection hints
- **Scrim Levels:** `soft` (teaching), `strong` (data), `none` (minimal)

### Neural Component System

**Core Components:**
```typescript
// Enhanced UI with neural intelligence
<Card variant="neural" neuralGlow={true} />
<NeuralCard glowing={true} />
<Button variant="neural" intent="teaching" />
<Badge variant="neural" glowing={true} />

// Text with intelligence context
<Text variant="neuralTitle" neural={true} />
<AcademicText variant="academicTitle" />
<DataText variant="dataLarge" />
<TeluguText variant="telugu" />
```

**Neural Intelligence Components:**
```typescript
// AI processing indicators
<IntelligenceIndicator state="processing" showLabel={true} />
<AIProcessingIndicator processing={true} />
<AnalysisIndicator analyzing={true} />

// Live data visualization
<NeuralPulse state="active" intensity="subtle" />
<LiveDataPulse active={true} />
<SyncStatusPulse syncing={true} />

// Enhanced statistics with AI
<StatCard neural={true} liveData={true} processing={false} />
<AttendanceStatCard presentCount={28} totalCount={30} />
<NeuralAnalysisCard analysisType="Performance" confidence={87} />
```

### Teacher-Optimized Animation System
```typescript
// Intent-based spring configurations
SpringConfig.teacherQuick    // Quick interactions (buttons, toggles)
SpringConfig.teacherStandard // Standard teaching interface
SpringConfig.neuralGentle    // Neural intelligence animations
SpringConfig.academicCalm    // Traditional academic content

// Teaching-specific animations  
useStaggerAnimation(index)   // List entry with teacher scanning optimization
useEntryAnimation()          // Screen entry optimized for teaching flow
```

**Animation Philosophy:**
- **Teaching interactions:** Quick, efficient, never distracting
- **Neural elements:** Smooth, sophisticated, intelligence-conveying
- **Academic content:** Calm, dignified, traditional feeling
- **NO overshoot/bounce** for legal actions (attendance, signatures)

### Neural Layout Patterns

**Screen Containers:**
```typescript
// Standard teaching interface
<TeachingScreenContainer padded={true}>
  {/* 16px padding, soft scrim, optimized for teaching */}
</TeachingScreenContainer>

// Data-heavy screens (attendance marking)  
<DataScreenContainer>
  {/* 12px padding, strong scrim, maximum data density */}
</DataScreenContainer>

// Neural intelligence features
<NeuralScreenContainer animated={true}>
  {/* Enhanced neural visualization */}
</NeuralScreenContainer>
```

**Spacing System:**
```typescript
Space.xs: 4    // Micro adjustments
Space.sm: 8    // Tight spacing  
Space.md: 12   // Standard gap between cards
Space.lg: 16   // Teaching interface padding
Space.xl: 20   // Standard screen margins
Space.xxl: 24  // Section separators

// Teacher-optimized
Space.touchTarget: 44  // Minimum accessibility touch target
Space.scanGap: 20      // Optimal information scanning gap
Space.neuralGap: 14    // Neural connection spacing
```

### Component Guidelines

**Always Use Neural-Enhanced Components:**
- `<Text>` instead of React Native Text (neural variants available)
- `<Card>` with neural/academic/glass variants
- `<Button>` with teaching intent and neural variants
- `<Badge>` with neural glow and status indication
- `<ScreenContainer>` for consistent background/layout

**Neural Intelligence Integration:**
- Show AI processing with `<IntelligenceIndicator>`
- Indicate live data with `<NeuralPulse>` 
- Enhanced stats with `<StatCard neural={true}>`
- Use neural variants for AI-powered features

**Teacher Efficiency Rules:**
- Optimize for **quick scanning** — clear information hierarchy
- **Minimal cognitive load** — neural cues should help, not distract
- **Touch targets minimum 44px** for classroom usage
- **High contrast** for various lighting conditions
- **Consistent patterns** — teachers learn once, use everywhere

### Timetable Rule — PERMANENT
**Period cards in HomeScreen always render CHRONOLOGICAL TOP-TO-BOTTOM.**
Period 1 at top. Last period at bottom. NOW card highlighted in-place.
Never use inverted FlatList. Never auto-scroll. The chronological sort is permanent.

### Neural Intelligence Philosophy
- **Helpful, not intimidating** — AI assistance feels natural
- **Transparent processing** — show when AI is thinking/analyzing  
- **Teacher control** — neural features augment, never replace teacher judgment
- **Cultural sensitivity** — modern intelligence respects traditional education values
- **Trust building** — premium design conveys reliability and professionalism

---

## 18.5 Segment Build History

### Segment 02 — Attendance + Coverage + Firebase ✅ (2026-06-01)

Key files:
```
src/lib/device.ts                 — stable device ID (Keychain-backed UUID)
src/lib/notifications.ts          — FCM + @notifee scheduled trigger notifications
src/db/schema.ts                  — WatermelonDB schema (attendance_drafts)
src/db/index.ts                   — Database singleton
src/db/models/AttendanceDraft.ts  — Draft model + StudentDraft type
src/hooks/useAttendanceDraft.ts   — Draft persistence (every toggle)
src/screens/Teacher/ClassPickerScreen.tsx
src/screens/Teacher/AttendanceScreen.tsx
src/components/attendance/StudentRow.tsx
src/components/attendance/LateArrivalSheet.tsx
src/components/coverage/StackedCoverageSheet.tsx
```

API:
```
GET|POST /teacher/attendance/*     — classes-today, students, submit, correct
GET|POST /teacher/coverage/*       — pending, submit
POST     /teacher/fcm-token        — device_id + school_id required
PUT      /teacher/schools/settings — attendance_mode
apps/api/src/jobs/notificationJobs.ts — cron (every 5 min, IST)
```

### RULES (add to rules section):
- NEVER UPDATE `attendance` table directly after submission. Corrections → `attendance_corrections`.
- Attendance signature: `sha256([teacherId,classYear,section,date,periodNum,submittedAt,deviceId].join('|'))`. Server verifies before INSERT.
- FCM token: ALWAYS include `device_id` in `/teacher/fcm-token`. `device_id` from `getDeviceIdSync()` (must call `getDeviceId()` at startup first via AppNavigator).
- WatermelonDB draft: write on every student status toggle, not batched. Never block UI on this write.
- All server FCM sends: use `sendFCMToTokens()` from `apps/api/src/lib/fcm.ts`.
- `AttendanceMark` is a root stack screen (NOT a bottom tab). Navigate via `navigation.navigate('AttendanceMark', params)`.
- Migration 025 (not 023 — NeuraSphere took 023).

---

## 19. Demo Credentials

```
Teacher login:   9876543210
OTP (dev mode):  123456  (printed to API console, not SMS)
Roles:           PRINCIPAL + CLASS_TEACHER (10-A) + SUBJECT_TEACHER (Math)
School:          SCH-AP-DEMO-0001 · Vikas High School · Guntur

API dev URL:     http://{YOUR_LOCAL_IP}:3001/api/v1
Emulator URL:    http://10.0.2.2:3001/api/v1
Find local IP:   ipconfig → IPv4 Address

Demo students:
  Arjun Reddy  NID-2025-AP-084291  Class 10-A  Active
  Arun Sharma  NID-2025-AP-084303  Class 10-B  AT_RISK

Demo SmartPads:
  PAD-0027  offline 11 days  CRITICAL
  PAD-0042  LOST status
```

---

## 20. Screen Sizes to Test

```
SMALL  (360dp): Samsung Galaxy A13, Redmi 9A — most common in AP/TS
STANDARD(393dp): Pixel 6a, OnePlus Nord — primary test
LARGE  (412dp): Samsung S22, Pixel 7
TABLET (600dp+): must not break — landscape + portrait both

Emulators:
  Pixel_4_Small_API33    — small screen stress test
  Pixel_6_Standard_API36 — primary test device
  Pixel_Tablet_API36     — tablet validation (landscape too)
```

---

_Version 2.0 | May 2026_
_Update this file when new modules, dependencies, or breaking patterns are introduced_
