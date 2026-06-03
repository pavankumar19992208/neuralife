import {useMemo} from 'react';
import {useRoute} from '@react-navigation/native';
import {useNotificationStore} from '@store/notificationStore';

/**
 * Returns the pre-fill selection for a deep-link target screen.
 *
 * Resolution order:
 *   1. `route.params` — set when navigation delivered the deep link directly
 *   2. pending intent in the notification store — set when the tap happened
 *      before this screen existed / before nav was ready (cold start)
 *
 * Every screen that is a push-notification target MUST use this so a tapped
 * notification arrives with its class/section/subject already selected.
 * See @lib/deepLink for the full contract.
 *
 * @param expectedType  the notification `type` this screen handles (e.g. 'ATTENDANCE').
 *                      Pending intent is only consumed if its type matches.
 */
export function useDeepLinkParams(expectedType: string): Record<string, string> {
  const route = useRoute();
  const routeParams = (route.params ?? {}) as Record<string, string>;

  return useMemo(() => {
    if (Object.keys(routeParams).length > 0) {
      return routeParams;
    }
    const pending = useNotificationStore.getState().pending;
    if (pending && pending.type === expectedType) {
      useNotificationStore.getState().clear();
      return pending.params;
    }
    return {};
    // route.params identity changes when navigation delivers new params
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(routeParams), expectedType]);
}
