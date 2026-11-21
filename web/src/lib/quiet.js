/* The reminder's two settings — how often it comes, and when it keeps quiet
   (do not disturb) — by the same rules the server applies
   (backend/src/services/quiet.js), so what this app shows and what the server
   sends never disagree.

     dnd = { on, daily, from, to, tz }
       on     quiet from now until it is switched off
       daily  quiet hours every day, `from` .. `to` ("22:00" .. "07:00") on
              the clock of time zone `tz`; they may run past midnight          */

/** How often the reminder comes until the server says otherwise, and the
    choices offered at a tap (any number of minutes in between can be typed) */
export const REMINDER_DEFAULT = { minutes: 15, min: 5, max: 1440 }
export const REMINDER_CHOICES = [5, 10, 15, 30, 60, 120]

/** 15 -> "15 minutes", 60 -> "1 hour", 90 -> "1 hour 30 minutes" */
export function everyLabel(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h ? `${h} ${h === 1 ? 'hour' : 'hours'}` : '', m ? `${m} ${m === 1 ? 'minute' : 'minutes'}` : '']
    .filter(Boolean)
    .join(' ')
}

/** 15 -> "15 min", 60 -> "1 hr", 90 -> "1 hr 30 min": for a button */
export function everyShort(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h ? `${h} hr` : '', m ? `${m} min` : ''].filter(Boolean).join(' ')
}

export const DND_DEFAULTS = { on: false, daily: false, from: '22:00', to: '07:00', tz: 'Asia/Kolkata' }

const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

// Minutes since midnight in that time zone (this device's own, if it is not known here)
const localMinutes = (tz, now) => {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
    const get = (type) => Number(parts.find((p) => p.type === type).value)
    return get('hour') * 60 + get('minute')
  } catch {
    return now.getHours() * 60 + now.getMinutes()
  }
}

/** Is the reminder held back at this moment? */
export function isQuiet(dnd, now = new Date()) {
  const d = { ...DND_DEFAULTS, ...(dnd || {}) }
  if (d.on) return true
  if (!d.daily) return false
  const from = minutesOf(d.from)
  const to = minutesOf(d.to)
  if (from === to) return false
  const at = localMinutes(d.tz, now)
  return from < to ? at >= from && at < to : at >= from || at < to
}

/** "22:00" -> "10:00 pm" */
export function clockLabel(hhmm) {
  const h = Number(hhmm.slice(0, 2))
  const m = hhmm.slice(3, 5)
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`
}

/** The time zone this device keeps, for the server to read the hours on */
export function deviceZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DND_DEFAULTS.tz
  } catch {
    return DND_DEFAULTS.tz
  }
}

/** One line saying where things stand: [tone, text] */
export function quietStatus(dnd, now = new Date()) {
  const d = { ...DND_DEFAULTS, ...(dnd || {}) }
  if (d.on) return ['warn', 'Do not disturb is on. Reminders are paused until you turn it off.']
  if (d.daily && isQuiet(d, now)) return ['warn', `Quiet hours now. Reminders start again at ${clockLabel(d.to)}.`]
  if (d.daily) return ['ok', `Reminders are on. Quiet every day from ${clockLabel(d.from)} to ${clockLabel(d.to)}.`]
  return ['ok', 'Reminders are on, day and night.']
}
