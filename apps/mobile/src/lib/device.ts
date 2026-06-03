import * as Keychain from 'react-native-keychain';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_SERVICE = 'in.neuralife.teacher.device_id';

/**
 * Returns a stable UUID for this device.
 * Generated once on first install, persisted in Keychain.
 * Survives app updates (Android Keychain persists across reinstalls unless
 * user explicitly clears app data).
 *
 * This ID is used in:
 *   1. FCM token registration (audit trail linkage)
 *   2. Attendance signature hashes (legal traceability)
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const stored = await Keychain.getGenericPassword({ service: DEVICE_ID_SERVICE });
    if (stored && stored.password) {
      return stored.password;
    }
  } catch {
    // Keychain read failed — generate new
  }

  const newId = uuidv4();
  try {
    await Keychain.setGenericPassword('device', newId, {
      service: DEVICE_ID_SERVICE,
    });
  } catch {
    console.warn('[Device] Could not persist device ID to Keychain');
  }
  return newId;
}

let _cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (_cachedDeviceId) return _cachedDeviceId;
  _cachedDeviceId = await getOrCreateDeviceId();
  return _cachedDeviceId;
}

/** Sync accessor — only valid after getDeviceId() has been called once at app start. */
export function getDeviceIdSync(): string {
  return _cachedDeviceId ?? 'DEVICE_ID_NOT_LOADED';
}
