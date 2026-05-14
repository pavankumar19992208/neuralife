# NeuraLife Mobile — apps/mobile Context

> Adds mobile-specific rules on top of root CLAUDE.md.

---

## This Package

**Purpose:** One React Native app, three login modes, every device.
**Targets:** Android phone, Android tablet, iOS iPhone, iOS iPad — all in one APK/IPA.
**Build order:** Web first → Mobile (this package) → NeuraOS/SmartPad

---

## Device Matrix — Design for All

Every screen must render correctly on all of these:

| Device category         | Screen width | Breakpoint label |
| ----------------------- | ------------ | ---------------- |
| Android phone           | 360–414 dp   | `phone`          |
| iPhone                  | 375–430 pt   | `phone`          |
| Android tablet (7–8")   | 600–800 dp   | `tablet-sm`      |
| Android tablet (10–12") | 800–1024 dp  | `tablet-lg`      |
| iPad (standard)         | 768–820 pt   | `tablet-sm`      |
| iPad Pro                | 1024–1366 pt | `tablet-lg`      |

**The rule:** Design for phone first. Tablet layout is the upgraded version — more columns, wider panels, split views.

---

## Responsive Layout System

```typescript
// lib/responsive.ts — import from here always
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

// Responsive value helper — pick based on device size
export function rv<T>(phone: T, tablet?: T, tabletLg?: T): T {
  if (screen.isTabletLg && tabletLg !== undefined) return tabletLg;
  if (screen.isTablet && tablet !== undefined) return tablet;
  return phone;
}

// Usage:
const columns = rv(1, 2, 3); // 1 col phone, 2 tablet, 3 large tablet
const padding = rv(16, 24, 32); // responsive padding
const fontSize = rv(14, 15, 16); // responsive text

// Listen for rotation
import { useDimensions } from "@react-native-community/hooks";
// Re-layout automatically on device rotation
```

---

## Tablet-Specific Layouts

```typescript
// components/layout/AdaptiveLayout.tsx
import { screen, rv } from '@/lib/responsive'

// Phone: single column stack
// Tablet: master-detail split (sidebar + content)

export function TeacherLayout({ children }: { children: React.ReactNode }) {
  if (screen.isTablet) {
    return (
      <View style={styles.tabletContainer}>
        <View style={styles.sidebar}>      {/* fixed sidebar on tablet */}
          <TeacherSidebar />
        </View>
        <View style={styles.content}>
          {children}
        </View>
      </View>
    )
  }

  // Phone: bottom tab navigation
  return <>{children}</>
}

const styles = StyleSheet.create({
  tabletContainer: { flex: 1, flexDirection: 'row' },
  sidebar:         { width: 280, borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  content:         { flex: 1 },
})
```

---

## Navigation Architecture

```
One app → three navigators based on JWT role

LoginGateNavigator (reads JWT role on launch)
├── role = TEACHER / PRINCIPAL → TeacherNavigator
├── role = PARENT              → ParentNavigator
└── role = STUDENT             → StudentNavigator

TeacherNavigator:
  Phone:  Bottom tabs (Home | Schedule | Classes | Doubts | Profile)
  Tablet: Sidebar navigation (persistent, visible at all times)

ParentNavigator:
  Phone:  Bottom tabs (Home | My Child | Connect | Profile)
  Tablet: Sidebar navigation

StudentNavigator:
  Phone:  Bottom tabs (Home | Learn | Achievements)
  Tablet: Bottom tabs (same — student content is focused)
```

---

## School Branding System

**Every UI element carries school branding. NeuraLife is the base layer.**

```typescript
// store/brandingStore.ts — loaded at login from school config
interface SchoolBranding {
  school_id: string;
  school_name: string;
  school_logo_url: string; // stored in Supabase Storage
  school_short_name: string; // 'VHS' for Vikas High School
  brand_color: string; // HEX — school's primary colour
  brand_color_light: string; // tint version of brand_color
  footer_tagline: string; // optional — e.g. 'Excellence in Education Since 2001'
}

// How branding applies:
// - App header: school logo + school name (NOT NeuraLife branding on home screen)
// - All reports and PDFs: school letterhead
// - Notifications: "From Vikas High School" (not "From NeuraLife")
// - Login screen: school logo prominent, NeuraLife logo small at bottom
// - Dashboard header background: school brand_color
// - 'Powered by NeuraLife' appears only in footer/settings

// NeuraLife brand: always present but never dominant.
// School brand: prominent on every screen.
```

```typescript
// lib/branding.ts
import { useBrandingStore } from '@/store/brandingStore'

export function useBranding() {
  const { school_name, school_logo_url, brand_color, brand_color_light } =
    useBrandingStore()

  return {
    school_name,
    school_logo_url,
    headerBg:    brand_color ?? '#1E40AF',         // school colour or NeuraLife blue
    headerTint:  brand_color_light ?? '#DBEAFE',
    headerText:  '#FFFFFF',
    // NeuraLife palette always available as fallback
    primary:     '#1E40AF',
    secondary:   '#0D9488',
    accent:      '#F59E0B',
  }
}

// Usage:
const { headerBg, school_name, school_logo_url } = useBranding()
<View style={[styles.header, { backgroundColor: headerBg }]}>
  <Image source={{ uri: school_logo_url }} style={styles.logo} />
  <Text style={styles.schoolName}>{school_name}</Text>
</View>
```

---

## Platform-Specific Behaviour

```typescript
// iOS vs Android differences — handled consistently
import { Platform } from 'react-native'

// Status bar
import { StatusBar } from 'expo-status-bar'
<StatusBar style="light" backgroundColor={headerBg} />

// Safe areas (notch, home indicator, dynamic island)
import { SafeAreaView } from 'react-native-safe-area-context'
// ALWAYS wrap root screens with SafeAreaView — never with padding only

// Haptic feedback
import * as Haptics from 'expo-haptics'
// iOS: use haptics for button press, success, error
// Android: haptics work on most devices — always include

// Font scaling — respect user accessibility settings
// NEVER hardcode fontSize without allowing scale
// Use Text component from @/components/ui/Text that handles this

// Back navigation
// Android: physical back button must work on all screens
// iOS: swipe back gesture must work on all screens
```

---

## Offline-First Pattern (mandatory for all data screens)

```typescript
// hooks/useAttendance.ts — the pattern for EVERY data hook
import { useQuery } from "@tanstack/react-query";
import { database } from "@/db/schema";
import { Q } from "@nozbe/watermelondb";
import { api } from "@/lib/api";
import { useNetInfo } from "@react-native-community/netinfo";

export function useClassAttendance(classId: string, date: string) {
  const { isConnected } = useNetInfo();

  return useQuery({
    queryKey: ["attendance", classId, date],
    queryFn: async () => {
      // 1. Always read from WatermelonDB first (instant, offline)
      const local = await database.collections
        .get("attendance")
        .query(Q.where("class_id", classId), Q.where("date", date))
        .fetch();

      // 2. If online, sync with server in background
      if (isConnected) {
        void api
          .get(`/attendance/${classId}/${date}`)
          .then((fresh) => syncAttendanceToLocal(fresh));
      }

      return local; // return local data immediately — no waiting
    },
    staleTime: Infinity, // WatermelonDB is the source of truth
  });
}
```

---

## Attendance Digital Signature (critical — offline)

```typescript
// Attendance works 100% offline. School day cannot stop for connectivity.
import { useAttendanceSubmit } from "@/hooks/useAttendanceSubmit";

async function submitAttendance(records: AttendanceRecord[]) {
  // 1. Generate signature (offline — no server needed)
  const signature = await createSignature({
    teacher_id,
    class_id,
    date,
    period,
    device_id,
    timestamp: Date.now(),
  });

  // 2. Write to WatermelonDB immediately (optimistic)
  await database.write(async () => {
    for (const record of records) {
      await database.collections.get("attendance").create((row) => {
        row.neuraId = record.neura_id;
        row.status = record.status;
        row.date = date;
        row.signature = signature;
        row.syncStatus = "PENDING"; // syncs when online
      });
    }
  });

  // 3. Show success to teacher immediately — do not wait for server
  toast.success("Attendance saved");

  // 4. Background sync — may fail, will retry automatically
  void syncQueue.push({ type: "ATTENDANCE", data: records, signature });
}
```

---

## Typography — Phone vs Tablet

```typescript
// components/ui/Text.tsx — use this instead of React Native Text
import { Text as RNText, TextStyle } from 'react-native'
import { rv } from '@/lib/responsive'

type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label'

const variantStyles: Record<TextVariant, TextStyle> = {
  h1:      { fontSize: rv(24, 28, 32), fontWeight: '700', letterSpacing: -0.5 },
  h2:      { fontSize: rv(20, 22, 24), fontWeight: '600', letterSpacing: -0.3 },
  h3:      { fontSize: rv(16, 18, 20), fontWeight: '600' },
  body:    { fontSize: rv(14, 15, 16), lineHeight: rv(22, 24, 26) },
  caption: { fontSize: rv(12, 13, 14), color: '#64748B' },
  label:   { fontSize: rv(12, 12, 13), fontWeight: '500', letterSpacing: 0.3 },
}

export function Text({ variant = 'body', telugu = false, style, children, ...props }) {
  return (
    <RNText
      style={[
        variantStyles[variant],
        telugu ? { fontFamily: 'NotoSansTelugu' } : { fontFamily: 'Inter' },
        style
      ]}
      allowFontScaling={true}   // ALWAYS allow — respects accessibility settings
      {...props}
    >
      {children}
    </RNText>
  )
}
```

---

## Animation — Reanimated 3

```typescript
// Use Reanimated 3 for all animations. No Animated API.
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutDown,
  withSpring, withTiming, useAnimatedStyle, useSharedValue,
  FadeInDown, ZoomIn, LinearTransition
} from 'react-native-reanimated'

// Screen entry
<Animated.View entering={FadeInDown.duration(300).springify()}>
  <ScreenContent />
</Animated.View>

// List items — staggered entry
students.map((student, index) => (
  <Animated.View
    key={student.neura_id}
    entering={FadeInDown.delay(index * 40).duration(300)}
  >
    <StudentRow student={student} />
  </Animated.View>
))

// Attendance toggle (Present → Absent → Late) — haptic + visual
const toggleAttendance = async (neuraId: string) => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  cycleStatus(neuraId)  // update local state
}

// Badge earned — celebration
<Animated.View entering={ZoomIn.springify().damping(12)}>
  <BadgeCard badge={newBadge} />
</Animated.View>
```

---

## Touch Targets (accessibility)

```typescript
// Every pressable element: minimum 44×44 dp (Apple HIG + Material)
const styles = StyleSheet.create({
  touchable: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  }
})

// Use TouchableOpacity, not Pressable for consistency
// hitSlop for small elements:
<TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
  <SmallIcon />
</TouchableOpacity>
```

---

## Build Targets

```
v1: Android phone + Android tablet (APK sideload for demo)
v2: Android Play Store + iOS App Store
    iPad and iPhone supported from v2 launch

Testing priority:
  1. Android phone 360dp (smallest supported)
  2. Android tablet 800dp
  3. iPhone 375pt
  4. iPad 768pt

Always test landscape AND portrait on tablet screens.
The attendance marking screen is frequently used in landscape on tablets.
```
