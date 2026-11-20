import { PermissionsAndroid, Platform } from 'react-native';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  hasPermission,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
} from '@react-native-firebase/messaging';

/* Push notifications — what reaches the CMD when the app is closed or in the
   background. The hub backend sends them through Firebase:
     a new approval     notification with the approval sound
     15-minute reminder notification with the reminder sound

   This file does three things: asks for permission, hands this phone's token
   to whoever registers it with the backend (and forgets it on sign-out), and
   reports which software a tapped notification was about so the app can open
   it. It makes no server calls itself: the callers pass in `sendToken` /
   `removeToken`, which go through the store's API layer (store/api.js).

   Push is an extra: nothing here may break sign-in or the screens, so every
   call fails quietly and reports a status instead. */

export const PUSH = {
  on: 'on',
  off: 'off', // not asked yet, or registration failed
  blocked: 'blocked', // refused in the phone's settings
};

let registeredToken = null;

/** This phone's push token once it has been registered, otherwise null */
export const registeredPushToken = () => registeredToken;

const allowed = status =>
  status === AuthorizationStatus.AUTHORIZED ||
  status === AuthorizationStatus.PROVISIONAL;

/** Whether the phone currently lets this app show notifications */
export async function pushStatus() {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const ok = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return ok && registeredToken ? PUSH.on : PUSH.off;
    }
    const status = await hasPermission(getMessaging());
    if (status === AuthorizationStatus.DENIED) return PUSH.blocked;
    return allowed(status) && registeredToken ? PUSH.on : PUSH.off;
  } catch (e) {
    return PUSH.off;
  }
}

async function askPermission() {
  if (Platform.OS === 'android') {
    if (Platform.Version < 33) return PUSH.on; // allowed at install on older Android
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result === PermissionsAndroid.RESULTS.GRANTED) return PUSH.on;
    return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
      ? PUSH.blocked
      : PUSH.off;
  }
  const status = await requestPermission(getMessaging(), {
    alert: true,
    sound: true,
    badge: true,
  });
  if (allowed(status)) return PUSH.on;
  return status === AuthorizationStatus.DENIED ? PUSH.blocked : PUSH.off;
}

/** Ask for permission and register this phone with the hub backend.
    `sendToken(token, platform)` saves the token on the server.
    Call after sign-in. Returns PUSH.on | PUSH.off | PUSH.blocked. */
export async function registerForPush(sendToken) {
  try {
    const permission = await askPermission();
    if (permission !== PUSH.on) return permission;
    const messaging = getMessaging();
    if (Platform.OS === 'ios') await registerDeviceForRemoteMessages(messaging);
    const token = await getToken(messaging);
    if (!token) return PUSH.off;
    await sendToken(token, Platform.OS);
    registeredToken = token;
    return PUSH.on;
  } catch (e) {
    // No Google Play services, a simulator without push, no network …
    return PUSH.off;
  }
}

/** Firebase replaces the token now and then: keep the backend's copy current.
    Returns a function that stops listening. */
export function watchTokenRefresh(sendToken) {
  try {
    return onTokenRefresh(getMessaging(), token => {
      registeredToken = token;
      Promise.resolve(sendToken(token, Platform.OS)).catch(() => {});
    });
  } catch (e) {
    return () => {};
  }
}

/** Stop sending notifications to this phone. `removeToken(token)` deletes it
    on the server. Call BEFORE the session is cleared: that needs the login. */
export async function unregisterFromPush(removeToken) {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await removeToken(token);
  } catch (e) {
    /* the backend drops dead tokens by itself on the next send */
  }
}

/** `onOpen(softwareId)` runs when the CMD taps a notification — both when the
    app was in the background and when the tap started it.
    Returns a function that stops listening. */
export function watchNotificationTaps(onOpen) {
  const open = message => {
    const software = message && message.data && message.data.software;
    onOpen(software ? String(software) : null);
  };
  try {
    const messaging = getMessaging();
    getInitialNotification(messaging)
      .then(message => message && open(message))
      .catch(() => {});
    return onNotificationOpenedApp(messaging, open);
  } catch (e) {
    return () => {};
  }
}
