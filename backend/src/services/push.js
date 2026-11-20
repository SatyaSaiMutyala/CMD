// Push notifications for when the app or browser tab is not open.
//
//   android / ios : Firebase Cloud Messaging   (needs FIREBASE_SERVICE_ACCOUNT_PATH)
//   web           : Web Push                   (needs the three VAPID_* settings)
//
// Each channel switches itself off, with one log line, when it is not
// configured — the server and the socket work without either.
const path = require('path');
const env = require('../config/env');
const Device = require('../models/Device');

let messaging = null;
let webpush = null;

const initPush = () => {
  if (env.firebaseServiceAccountPath) {
    try {
      const { initializeApp, getApps, cert } = require('firebase-admin/app');
      const { getMessaging } = require('firebase-admin/messaging');
      const serviceAccount = require(path.resolve(env.firebaseServiceAccountPath));
      const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
      messaging = getMessaging(app);
      console.log('[push] Firebase Cloud Messaging ready (android, ios)');
    } catch (err) {
      console.warn('[push] Firebase not started:', err.message);
    }
  } else {
    console.log('[push] FIREBASE_SERVICE_ACCOUNT_PATH not set — phone push is off');
  }

  const { publicKey, privateKey, subject } = env.vapid;
  if (publicKey && privateKey && subject) {
    try {
      webpush = require('web-push');
      webpush.setVapidDetails(subject, publicKey, privateKey);
      console.log('[push] Web Push ready (browsers)');
    } catch (err) {
      webpush = null;
      console.warn('[push] Web Push not started:', err.message);
    }
  } else {
    console.log('[push] VAPID keys not set — browser push is off');
  }
};

// The two sound files are bundled in the mobile app; a notification names the
// one to play. iOS takes the file name; Android takes its channel.
const SOUNDS = { arrival: 'approval.wav', reminder: 'reminder.wav' };
// Must match the channel ids created in the mobile app's MainApplication.kt.
// The reminders channel (reminders_v1) is used by the app itself, not from here.
const CHANNELS = { arrival: 'approvals_v1' };

const sendToPhones = async (devices, message) => {
  if (!messaging || !devices.length) return 0;
  // FCM data values must all be strings
  const data = Object.fromEntries(Object.entries(message.data).map(([k, v]) => [k, String(v ?? '')]));
  const res = await messaging.sendEachForMulticast({
    tokens: devices.map((d) => d.token),
    data: { ...data, kind: message.kind, title: message.title, body: message.body },
    // Android, high priority so it arrives in Doze.
    //   new approval : shown by the phone itself, on the approvals channel,
    //                  which carries the sound (channels are created in the
    //                  mobile app's MainApplication.kt).
    //   reminder     : sent as data only — no notification block — so the
    //                  app's own code runs even when it is closed and shows
    //                  the reminder FULL SCREEN (reminder/HubMessagingService.kt
    //                  reads kind, title, body and total from `data`).
    android: {
      priority: 'high',
      ttl: 15 * 60 * 1000,
      ...(message.kind === 'reminder'
        ? null
        : {
            notification: {
              title: message.title,
              body: message.body,
              channelId: CHANNELS.arrival,
              sound: SOUNDS.arrival.replace(/\.wav$/, ''),
            },
          }),
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          alert: { title: message.title, body: message.body },
          sound: SOUNDS[message.kind] || 'default',
          'interruption-level': 'time-sensitive',
        },
      },
    },
  });
  // Forget tokens Firebase says are gone (app uninstalled, token rotated)
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
      dead.push(devices[i].token);
    }
  });
  if (dead.length) await Device.deleteMany({ token: { $in: dead } });
  return res.successCount;
};

const sendToBrowsers = async (devices, message) => {
  if (!webpush || !devices.length) return 0;
  const payload = JSON.stringify({ kind: message.kind, title: message.title, body: message.body, data: message.data });
  const results = await Promise.all(
    devices.map(async (d) => {
      try {
        await webpush.sendNotification(d.subscription, payload, { TTL: 15 * 60, urgency: 'high' });
        return true;
      } catch (err) {
        // 404 / 410: the browser dropped this subscription
        if (err.statusCode === 404 || err.statusCode === 410) await Device.deleteOne({ token: d.token });
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
};

// Who gets a push of this kind: everyone, except that the 15-minute reminder
// skips devices where the CMD has switched it off.
const devicesFor = (kind, devices) => (kind === 'reminder' ? devices.filter((d) => d.reminders !== false) : devices);

/**
 * Send one push to every registered device.
 * @param {{kind:'arrival'|'reminder', title:string, body:string, data?:object}} message
 * @returns {Promise<number>} how many devices accepted it
 */
const sendPush = async (message) => {
  if (!messaging && !webpush) return 0;
  const full = { data: {}, ...message };
  try {
    const devices = devicesFor(full.kind, await Device.find().lean());
    const [phones, browsers] = await Promise.all([
      sendToPhones(devices.filter((d) => d.platform !== 'web'), full),
      sendToBrowsers(devices.filter((d) => d.platform === 'web'), full),
    ]);
    return phones + browsers;
  } catch (err) {
    // A push problem must never fail the webhook that triggered it
    console.warn('[push] send failed:', err.message);
    return 0;
  }
};

module.exports = { initPush, sendPush, devicesFor };
