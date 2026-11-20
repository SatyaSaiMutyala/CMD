import { AppState, Vibration } from 'react-native';
import Sound from 'react-native-sound';

/* Sounds and vibration for alerts while the app is open.

   Two sound files, bundled with the app (and used by the push notifications
   too, so an alert sounds the same whether the app is open or closed):
     approval.wav   a new approval arrived
     reminder.wav   the 15-minute reminder

   iOS: the files are in the app bundle. Android: android/app/src/main/res/raw. */

const FILES = { arrival: 'approval.wav', reminder: 'reminder.wav' };
const players = {};

// "Playback" so an approval is heard even with the ring switch on silent;
// mixing means it does not stop music or a call that is already playing.
try {
  Sound.setCategory('Playback', true);
} catch (e) {
  /* sound is best-effort */
}

const load = kind => {
  if (players[kind]) return;
  try {
    players[kind] = new Sound(FILES[kind], Sound.MAIN_BUNDLE, error => {
      if (error) players[kind] = null;
    });
  } catch (e) {
    players[kind] = null;
  }
};

/** Load both files ahead of time, so the first alert plays without a delay */
export function prepareSounds() {
  Object.keys(FILES).forEach(load);
}

/** `strong` = the reminder sound; otherwise the new-approval sound.
    Silent in the background: there the push notification brings its own sound. */
export function chime(strong, enabled) {
  if (!enabled || AppState.currentState !== 'active') return;
  const kind = strong ? 'reminder' : 'arrival';
  load(kind);
  const player = players[kind];
  if (!player) return;
  try {
    player.stop(() => player.play());
  } catch (e) {
    /* sound is best-effort */
  }
}

export function buzz() {
  try {
    Vibration.vibrate([0, 200, 100, 200]);
  } catch (e) {
    /* vibration is best-effort */
  }
}
