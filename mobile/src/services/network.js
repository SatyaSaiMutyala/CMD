import { NativeModules, TurboModuleRegistry } from 'react-native';
import { API_URL } from '../config';

/* Is the phone online, and is the hub answering quickly?

   Two sources:
   - the phone itself (the @react-native-community/netinfo library) says at
     once when Wi-Fi or mobile data is lost or comes back;
   - a small request to the hub (/api/health) says whether the server can
     really be reached, and how long it takes to answer.

   The library has a native half. An app built before it was added does not
   have it; there only the request to the hub is used. */

// A reply slower than this is "slow"; no reply within the limit is "no reply"
export const SLOW_MS = 3000;
const GIVE_UP_MS = 10000;

let NetInfo = null;
try {
  const present =
    TurboModuleRegistry.get('RNCNetInfo') || NativeModules.RNCNetInfo;
  if (present) NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  NetInfo = null;
}

/** Calls onChange(true | false) whenever the phone gains or loses its
    connection. Returns a function that stops it. */
export function watchPhone(onChange) {
  if (!NetInfo) return () => {};
  return NetInfo.addEventListener(state => {
    // `null` means "not known yet": only a definite no counts as offline
    onChange(
      !(state.isConnected === false || state.isInternetReachable === false),
    );
  });
}

/** One request to the hub: 'online' | 'slow' | 'unreachable' */
export async function checkHub() {
  const started = Date.now();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), GIVE_UP_MS);
  try {
    const res = await fetch(`${API_URL}/api/health`, { signal: abort.signal });
    if (!res.ok) return 'unreachable';
    return Date.now() - started > SLOW_MS ? 'slow' : 'online';
  } catch (e) {
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}
