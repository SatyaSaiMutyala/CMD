import { createAsyncStorage } from '@react-native-async-storage/async-storage';

/* The signed-in session, kept on the phone so the app opens straight to the
   hub next time. Storage problems never block the app: it just asks for
   sign-in again. */

const storage = createAsyncStorage('cmd-hub');
const KEY = 'session';

export async function loadSession() {
  try {
    const raw = await storage.getItem(KEY);
    const session = raw ? JSON.parse(raw) : null;
    return session && session.token && session.user ? session : null;
  } catch (e) {
    return null;
  }
}

export async function saveSession(session) {
  try {
    await storage.setItem(KEY, JSON.stringify(session));
  } catch (e) {
    /* the session still works until the app is closed */
  }
}

/* The alert switches on the Alerts tab, remembered the same way */
const SETTINGS_KEY = 'settings';

export async function loadSettings() {
  try {
    const raw = await storage.getItem(SETTINGS_KEY);
    const settings = raw ? JSON.parse(raw) : null;
    return settings && typeof settings === 'object' ? settings : null;
  } catch (e) {
    return null;
  }
}

export async function saveSettings(settings) {
  try {
    await storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    /* the choice still holds until the app is closed */
  }
}

export async function clearSession() {
  try {
    await storage.removeItem(KEY);
  } catch (e) {
    /* nothing to clear */
  }
}
