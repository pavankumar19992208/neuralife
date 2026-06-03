import {create} from 'zustand';

/**
 * Holds the most recent notification deep-link that has not yet been consumed
 * by its target screen.
 *
 * WHY THIS EXISTS:
 *   A notification can be tapped (a) in foreground, (b) in background, or
 *   (c) on a cold start before navigation is even mounted — and the target
 *   screen may not be built yet. Rather than lose that intent, we always
 *   store it here. Navigation flushes it when ready; target screens read it
 *   on mount as a fallback to route params. See @lib/deepLink.
 */
export interface DeepLinkIntent {
  /** Logical notification type, e.g. ATTENDANCE | COVERAGE | TEST. */
  type: string;
  /** Target route name the notification wants to open. */
  screen: string;
  /** Pre-fill params for that screen (class, section, subject, date, …). */
  params: Record<string, string>;
  /** When the intent was captured (ms). */
  ts: number;
}

interface NotificationState {
  pending: DeepLinkIntent | null;
  setPending: (intent: DeepLinkIntent) => void;
  /** Consume + clear the pending intent (returns it once, then null). */
  consume: () => DeepLinkIntent | null;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  pending: null,
  setPending: intent => set({pending: intent}),
  consume: () => {
    const {pending} = get();
    if (pending) set({pending: null});
    return pending;
  },
  clear: () => set({pending: null}),
}));
