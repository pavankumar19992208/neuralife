/**
 * Push notification setup for NeuraLife Teacher App.
 *
 * TWO-LAYER notification system:
 *   Layer 1 (LOCAL):  @notifee scheduled triggers at period start/end
 *   Layer 2 (SERVER): node-cron on API fires regardless of app state
 *
 * FCM token registration links: teacher → device → FCM token.
 * device_id (from @lib/device) is included in every token registration
 * and attendance signature for audit traceability.
 */
import messaging from '@react-native-firebase/messaging';
import {api} from '@lib/api';
import {getDeviceId} from '@lib/device';
import {routeNotification} from '@lib/deepLink';

export const CHANNEL_ATTENDANCE = 'attendance';
export const CHANNEL_COVERAGE   = 'coverage';
export const CHANNEL_GENERAL    = 'general';

// ─── Soft notifee accessor ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryGetNotifee(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@notifee/react-native').default;
  } catch {
    return null;
  }
}

// ─── Channel setup (idempotent — call once at app start) ─────────────────────

export async function setupNotificationChannels(): Promise<void> {
  const notifee = tryGetNotifee();
  if (!notifee) return;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {AndroidImportance, AndroidVisibility} = require('@notifee/react-native');
  await Promise.all([
    notifee.createChannel({
      id: CHANNEL_ATTENDANCE,
      name: 'Attendance Reminders',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      vibration: true,
      description: 'Reminders to mark class attendance on time',
    }),
    notifee.createChannel({
      id: CHANNEL_COVERAGE,
      name: 'Coverage Reminders',
      importance: AndroidImportance.DEFAULT,
      description: 'Reminders to log what was covered in class',
    }),
    notifee.createChannel({
      id: CHANNEL_GENERAL,
      name: 'General',
      importance: AndroidImportance.DEFAULT,
    }),
  ]);
}

// ─── FCM token registration ───────────────────────────────────────────────────

/**
 * Registers this device's FCM token with the NeuraLife server.
 * Call on every login and on token refresh.
 * Links teacher profile ↔ device ↔ FCM token for targeted push.
 */
export async function registerFCMToken(schoolId: string): Promise<void> {
  try {
    const [token, deviceId] = await Promise.all([
      messaging().getToken(),
      getDeviceId(),
    ]);

    if (!token) {
      console.warn('[FCM] Could not obtain FCM token');
      return;
    }

    let deviceModel = 'Android';
    let appVersion = '0.1.0';
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const DeviceInfo = require('react-native-device-info').default;
      [deviceModel, appVersion] = await Promise.all([
        DeviceInfo.getModel(),
        Promise.resolve(DeviceInfo.getVersion()),
      ]);
    } catch {
      // react-native-device-info not yet linked — non-fatal
    }

    await api.post('/teacher/fcm-token', {
      fcm_token: token,
      device_id: deviceId,
      school_id: schoolId,
      device_model: deviceModel,
      device_platform: 'ANDROID',
      app_version: appVersion,
    });
    console.log('[FCM] Token registered for device', deviceId.slice(0, 8));
  } catch (err) {
    console.warn('[FCM] Token registration failed:', err);
  }
}

/** Registers on token refresh. Returns unsubscribe fn. */
export function setupFCMTokenRefresh(schoolId: string): () => void {
  return messaging().onTokenRefresh(async newToken => {
    const deviceId = await getDeviceId();
    await api.post('/teacher/fcm-token', {
      fcm_token: newToken,
      device_id: deviceId,
      school_id: schoolId,
      device_platform: 'ANDROID',
    }).catch(() => {});
  });
}

// ─── FCM foreground handler ───────────────────────────────────────────────────

/** Show FCM messages when app is open. Returns unsubscribe fn. */
export function setupFCMForegroundHandler(): () => void {
  return messaging().onMessage(async remoteMessage => {
    const notifee = tryGetNotifee();
    const {title, body} = remoteMessage.notification ?? {};
    if (!title || !notifee) return;
    const data = (remoteMessage.data ?? {}) as Record<string, string>;
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId: data.channelId ?? CHANNEL_GENERAL,
        pressAction: {id: 'default'},
      },
    }).catch(() => {});
  });
}

// ─── Scheduled local notifications ───────────────────────────────────────────

/** Schedule an attendance reminder at period start time. */
export async function scheduleAttendanceReminder(params: {
  periodId: string;
  subject: string;
  classYear: number;
  section: string;
  startTimeISO: string;
}): Promise<void> {
  const notifee = tryGetNotifee();
  if (!notifee) return;

  const startMs = new Date(params.startTimeISO).getTime();
  if (startMs < Date.now()) return; // already passed

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {TriggerType} = require('@notifee/react-native');
    await notifee.createTriggerNotification(
      {
        id: `attendance-${params.periodId}`,
        title: '📚 Mark Attendance',
        body: `${params.subject} · Class ${params.classYear}-${params.section}`,
        android: {
          channelId: CHANNEL_ATTENDANCE,
          pressAction: {id: 'default', launchActivity: 'default'},
          actions: [{
            title: 'Mark Now',
            pressAction: {id: 'mark-attendance-' + params.periodId},
          }],
        },
        data: {
          type: 'ATTENDANCE',
          screen: 'AttendanceMark',
          periodId: params.periodId,
          classYear: String(params.classYear),
          section: params.section,
          subject: params.subject,
        },
      },
      {type: TriggerType.TIMESTAMP, timestamp: startMs, alarmManager: {allowWhileIdle: true}},
    );
  } catch {
    // non-fatal
  }
}

/** Schedule a coverage reminder 5 min before period end. */
export async function scheduleCoverageReminder(params: {
  periodId: string;
  subject: string;
  classYear: number;
  section: string;
  endTimeISO: string;
}): Promise<void> {
  const notifee = tryGetNotifee();
  if (!notifee) return;

  const reminderMs = new Date(params.endTimeISO).getTime() - 5 * 60 * 1000;
  if (reminderMs < Date.now()) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {TriggerType} = require('@notifee/react-native');
    await notifee.createTriggerNotification(
      {
        id: `coverage-${params.periodId}`,
        title: '📋 Log Coverage',
        body: `What did you cover in ${params.subject} · Class ${params.classYear}-${params.section}?`,
        android: {
          channelId: CHANNEL_COVERAGE,
          pressAction: {id: 'default', launchActivity: 'default'},
          actions: [{
            title: 'Log Now',
            pressAction: {id: 'mark-coverage-' + params.periodId},
          }],
        },
        data: {
          type: 'COVERAGE',
          screen: 'MarkCoverage',
          periodId: params.periodId,
          classYear: String(params.classYear),
          section: params.section,
          subject: params.subject,
        },
      },
      {type: TriggerType.TIMESTAMP, timestamp: reminderMs, alarmManager: {allowWhileIdle: true}},
    );
  } catch {
    // non-fatal
  }
}

/** Cancel all today's attendance/coverage reminders before re-scheduling. */
export async function cancelTodayReminders(): Promise<void> {
  const notifee = tryGetNotifee();
  if (!notifee) return;
  try {
    const scheduled = await notifee.getTriggerNotifications();
    const relevant = scheduled.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (n: any) =>
        n.notification?.data?.type === 'ATTENDANCE' ||
        n.notification?.data?.type === 'COVERAGE',
    );
    await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relevant.map((n: any) => notifee.cancelTriggerNotification(n.notification.id)),
    );
  } catch {
    // non-fatal
  }
}

// ─── Bootstrap (called from TeacherNavigator on mount) ───────────────────────

/**
 * Full bootstrap: channels + FCM routing.
 * schoolId is undefined initially; call registerFCMToken separately after schoolId is known.
 */
export async function bootstrapNotifications(): Promise<void> {
  try {
    await setupNotificationChannels();
    const notifee = tryGetNotifee();

    // FCM foreground message → display via notifee
    messaging().onMessage(async remoteMessage => {
      if (!notifee) return;
      const data = (remoteMessage.data ?? {}) as Record<string, string>;
      const channelId = data.channelId ?? CHANNEL_GENERAL;
      await notifee.displayNotification({
        title: remoteMessage.notification?.title ?? 'NeuraLife',
        body:  remoteMessage.notification?.body  ?? '',
        data,
        android: {channelId, pressAction: {id: 'default'}},
      }).catch(() => {});
    });

    // Notifee foreground tap → deep-link
    if (notifee) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {EventType} = require('@notifee/react-native');
      notifee.onForegroundEvent(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({type, detail}: {type: number; detail: {notification?: {data?: Record<string, string>}}}) => {
          if (type === EventType.PRESS) {
            routeNotification(detail.notification?.data);
          }
        },
      );
    }

    // Background tap (app in background, system tray)
    messaging().onNotificationOpenedApp(msg => {
      routeNotification((msg?.data ?? undefined) as Record<string, string> | undefined);
    });

    // Cold start: app launched by tapping a notification
    const initial = await messaging().getInitialNotification();
    if (initial?.data) {
      routeNotification(initial.data as Record<string, string>);
    }
  } catch (err) {
    console.warn('[notifications] bootstrap failed:', err);
  }
}

// ─── Legacy helpers (kept for useNotifications hook) ─────────────────────────

export interface PeriodTriggerPayload {
  subject: string; classYear: number; section: string;
  startTime: string; endTime: string; studentCount: number; periodNumber: number;
}

function periodDeepLinkData(p: PeriodTriggerPayload, type: 'ATTENDANCE' | 'COVERAGE'): Record<string, string> {
  return {
    type,
    screen: type === 'ATTENDANCE' ? 'AttendanceMark' : 'MarkCoverage',
    classYear: String(p.classYear),
    section: p.section,
    subject: p.subject,
    periodNumber: String(p.periodNumber),
    startTime: p.startTime,
    endTime: p.endTime,
  };
}

export async function triggerAttendanceNotification(p: PeriodTriggerPayload): Promise<void> {
  try {
    await api.post('/teacher/notify/period-start', {...p, type: 'ATTENDANCE'});
  } catch {
    const notifee = tryGetNotifee();
    if (!notifee) return;
    await notifee.displayNotification({
      title: `📋 Mark Attendance — Class ${p.classYear}-${p.section}`,
      body:  `${p.subject.replace(/_/g, ' ')} · ${p.startTime}–${p.endTime} · ${p.studentCount} students`,
      data: periodDeepLinkData(p, 'ATTENDANCE'),
      android: {channelId: CHANNEL_ATTENDANCE, pressAction: {id: 'default'}},
    }).catch(() => {});
  }
}

export async function triggerCoverageNotification(p: PeriodTriggerPayload): Promise<void> {
  try {
    await api.post('/teacher/notify/period-start', {...p, type: 'COVERAGE'});
  } catch {
    const notifee = tryGetNotifee();
    if (!notifee) return;
    await notifee.displayNotification({
      title: `📝 Mark Coverage — ${p.subject.replace(/_/g, ' ')}`,
      body:  `Class ${p.classYear}-${p.section} ending at ${p.endTime} — what did you teach?`,
      data: periodDeepLinkData(p, 'COVERAGE'),
      android: {channelId: CHANNEL_COVERAGE, pressAction: {id: 'default'}},
    }).catch(() => {});
  }
}
