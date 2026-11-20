import { Linking, NativeModules, Platform } from 'react-native';

/* Android's two permissions for the full-screen reminder.

   The native side is android/.../reminder/HubReminderModule.kt. iPhones have
   no such reminder, and an Android build made before the module existed does
   not have it either: `available` is false there. */

const native = Platform.OS === 'android' ? NativeModules.HubReminder : null;

export const available = !!native;

/** { fullScreen, overApps } — true where it is already allowed */
export async function reminderPermissions() {
  if (!native) return { fullScreen: false, overApps: false };
  try {
    const status = await native.status();
    return { fullScreen: !!status.fullScreen, overApps: !!status.overApps };
  } catch (e) {
    return { fullScreen: false, overApps: false };
  }
}

/** Opens the Settings page for one of them: 'fullScreen' | 'overApps' */
export function openReminderSettings(which) {
  if (native) native.openSettings(which);
}

/** Shows the reminder in five seconds with made-up numbers */
export function tryReminder() {
  if (native) native.tryIt();
}

/** For a build without the module: the older setup screen, drawn by Android */
export function openLegacySetup() {
  return Linking.sendIntent('com.app.approvalhub.REMINDER_SETUP').catch(() => {});
}
