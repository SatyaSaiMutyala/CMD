import { NativeModules } from 'react-native';
import { APP_VERSION } from './appVersion';

/* The version of the app that is installed on this phone.

   Asked of Android itself (reminder/HubReminderModule.kt), because that is
   the one answer that cannot be wrong. The version written into the
   JavaScript at build time (appVersion.js) is only the fallback: a build
   once shipped with the previous version in it, and every phone that
   installed it was told to update for ever. */
export function installedVersion() {
  try {
    const native = NativeModules.HubReminder;
    const constants =
      native && typeof native.getConstants === 'function'
        ? native.getConstants()
        : native;
    const version = constants && constants.versionName;
    if (typeof version === 'string' && /^\d+(\.\d+)*$/.test(version)) {
      return version;
    }
  } catch (e) {
    /* an app built before the native side knew its version */
  }
  return APP_VERSION;
}
