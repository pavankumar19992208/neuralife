/**
 * Notification deep-linking — the single place that turns a push-notification
 * payload into "open the right screen with the right data selected".
 *
 * ───────────────────────────────────────────────────────────────────────────
 * HOW IT WORKS (read before adding any new push notification)
 * ───────────────────────────────────────────────────────────────────────────
 * 1. The API puts routing data on the FCM `data` payload (all values strings):
 *      { type, screen, classYear, section, subject, periodNumber, date, … }
 * 2. When the notification is tapped — in foreground, background, OR on a cold
 *    start — `routeNotification(data)` is called (see @lib/notifications).
 * 3. routeNotification looks the `type` up in NOTIFICATION_ROUTES, builds
 *    params, and:
 *      • if the target screen is registered + ready → navigates immediately
 *      • otherwise → stores the intent in useNotificationStore so it is NOT lost
 * 4. Every deep-link target screen reads its selection from `route.params`
 *    first, then falls back to `useNotificationStore.consume()` on mount.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ADDING A NEW PUSH NOTIFICATION → DEEP LINK (the contract)
 * ───────────────────────────────────────────────────────────────────────────
 * A. API: include `screen` + the params the target needs on the FCM `data`.
 * B. Here: ensure a NOTIFICATION_ROUTES entry exists for the `type`.
 * C. When the target screen is built:
 *      - register its route name in the navigator,
 *      - flip `ready: true` in its NOTIFICATION_ROUTES entry,
 *      - have the screen read `route.params` ?? useNotificationStore.consume().
 *    Nothing else changes — pending taps captured before the screen existed
 *    flush automatically the next time it routes.
 */
import {createNavigationContainerRef, CommonActions} from '@react-navigation/native';
import {useNotificationStore, type DeepLinkIntent} from '@store/notificationStore';
import {showToast} from '@lib/toast';

// Root navigation ref — lets us navigate from outside React (notification taps).
export const navigationRef = createNavigationContainerRef();

// ─── Route registry ─────────────────────────────────────────────────────────
// `tab`    — the bottom-tab name inside TeacherApp, if the target is a tab.
// `screen` — the route name to navigate to.
// `ready`  — true once the screen exists in the navigator AND reads params.
//
// 👉 When you build a target screen, flip `ready: true` and register its name.

interface RouteDef {
  /** Bottom tab inside TeacherApp the screen lives under (if any). */
  tab?: string;
  /** Route name to navigate to. */
  screen: string;
  /** Is the screen built + reading params? If false, tap is stored, not lost. */
  ready: boolean;
  /** Friendly label for the "coming soon" toast while not ready. */
  label: string;
}

export const NOTIFICATION_ROUTES: Record<string, RouteDef> = {
  // Period started, attendance not marked → push to AttendanceMark stack screen.
  // ready:true — AttendanceMark is registered in AppNavigator and reads params.
  ATTENDANCE: {screen: 'AttendanceMark', ready: true, label: 'Mark Attendance'},

  // ~5 min before period end, coverage not marked → open Mark Coverage pre-selected.
  COVERAGE:   {tab: 'MyClasses', screen: 'MarkCoverage', ready: false, label: 'Mark Coverage'},

  // Pipeline test → just open Home.
  TEST:       {tab: 'Home', screen: 'Home', ready: true, label: 'Home'},
};

// ─── Param extraction ────────────────────────────────────────────────────────
// All FCM data values are strings. Keep them as strings in params and let the
// target screen parse (e.g. Number(params.classYear)). This avoids type drift.

function extractParams(data: Record<string, string>): Record<string, string> {
  const keys = ['classYear', 'section', 'subject', 'periodNumber', 'date', 'startTime', 'endTime'];
  const params: Record<string, string> = {};
  for (const k of keys) {
    if (data[k] != null) params[k] = String(data[k]);
  }
  return params;
}

// ─── The router ──────────────────────────────────────────────────────────────

/**
 * Turn a notification data payload into navigation. Safe to call any time —
 * before nav mounts, before the screen exists. Never throws.
 */
export function routeNotification(data: Record<string, string> | undefined): void {
  if (!data) return;
  const type = data.type ?? '';
  const route = NOTIFICATION_ROUTES[type];

  // Unknown type — nothing to route. Log for visibility.
  if (!route) {
    console.warn('[deepLink] no route registered for notification type:', type);
    return;
  }

  const params = extractParams(data);
  const intent: DeepLinkIntent = {type, screen: route.screen, params, ts: Date.now()};

  // Always capture the intent so it survives cold start / unbuilt screens.
  useNotificationStore.getState().setPending(intent);

  // If the screen isn't built yet, tell the user and keep the pending intent.
  if (!route.ready) {
    showToast(`${route.label} opens here once that screen is built`, 'short');
    return;
  }

  navigateToIntent(intent, route);
}

/** Perform the actual navigation for a ready route. */
function navigateToIntent(intent: DeepLinkIntent, route: RouteDef): void {
  if (!navigationRef.isReady()) {
    // Navigation not mounted yet (cold start) — leave it pending; consumed onReady.
    return;
  }
  try {
    if (route.tab) {
      // Nested: TeacherApp stack → bottom tab → params on the tab screen.
      navigationRef.dispatch(
        CommonActions.navigate({
          name: 'TeacherApp',
          params: {screen: route.tab, params: intent.params},
        }),
      );
    } else {
      navigationRef.dispatch(CommonActions.navigate({name: route.screen, params: intent.params}));
    }
    // Navigated successfully — clear so the screen doesn't double-consume.
    useNotificationStore.getState().clear();
  } catch (err) {
    console.warn('[deepLink] navigation failed, keeping pending intent:', err);
  }
}

/**
 * Flush any pending deep-link once navigation is ready (call from
 * NavigationContainer onReady and after login). No-op if nothing pending.
 */
export function consumePendingDeepLink(): void {
  const pending = useNotificationStore.getState().pending;
  if (!pending) return;
  const route = NOTIFICATION_ROUTES[pending.type];
  if (route?.ready) {
    navigateToIntent(pending, route);
  }
}
