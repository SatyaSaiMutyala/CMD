/* Sounds and system notifications.
   Two sound files, the same ones the phone app uses:
     /sounds/approval.wav   a new approval arrived
     /sounds/reminder.wav   the 15-minute reminder                              */

const FILES = { arrival: '/sounds/approval.wav', reminder: '/sounds/reminder.wav' }
const players = {}

const player = (kind) => {
  if (!players[kind]) {
    players[kind] = new Audio(FILES[kind])
    players[kind].preload = 'auto'
  }
  return players[kind]
}

// Browsers only allow sound after a user gesture; call this on the first click
// so the files are loaded and ready before the first alert.
export function unlockAudio() {
  try {
    Object.keys(FILES).forEach((kind) => player(kind).load())
  } catch {
    /* sound is best-effort */
  }
}

// `strong` = the reminder sound; otherwise the new-approval sound.
export function chime(strong, enabled) {
  if (!enabled) return
  try {
    const audio = player(strong ? 'reminder' : 'arrival')
    audio.currentTime = 0
    // Rejected until the person has clicked somewhere on the page: stays silent
    audio.play().catch(() => {})
  } catch {
    /* sound is best-effort */
  }
}

// System notification, only when the page is in the background.
export function notify(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification(title, { body, tag: 'cmd-hub' })
    }
  } catch {
    /* notifications are best-effort */
  }
}

export const notificationPermission = () =>
  'Notification' in window ? Notification.permission : 'unsupported'
