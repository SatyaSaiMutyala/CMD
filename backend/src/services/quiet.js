// The reminder's two settings, kept on the user (so the phone, the website
// and the server all agree): how often it comes, and when it keeps quiet.
//
// HOW OFTEN. Every `reminder_minutes`, counted from midnight on the person's
// own clock: every 30 minutes is :00 and :30, every 2 hours is 12, 2, 4 ...
// Empty means the server's own setting (REMINDER_MINUTES, 15).
//
// DO NOT DISTURB.
//
// Two switches, kept on the user (so the phone, the website and the server
// all agree):
//   on     "Do not disturb" — quiet from now until it is switched off
//   daily  quiet hours every day, `from` .. `to` ("22:00" .. "07:00"), read
//          on the clock of the person's own time zone (`tz`). The hours may
//          run past midnight; the same time at both ends means nothing.
//
// Only the reminder is held back. A new approval still notifies at once.
const env = require('../config/env');

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
// The shortest and longest the reminder may be set to: five minutes to a day
const MIN_MINUTES = 5;
const MAX_MINUTES = 24 * 60;
const DEFAULTS = { on: false, daily: false, from: '22:00', to: '07:00', tz: 'Asia/Kolkata' };

const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

const validZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// Whatever is stored (or nothing), as a complete, well-formed setting
const dndOf = (stored) => {
  const d = stored || {};
  return {
    on: !!d.on,
    daily: !!d.daily,
    from: TIME.test(d.from || '') ? d.from : DEFAULTS.from,
    to: TIME.test(d.to || '') ? d.to : DEFAULTS.to,
    tz: d.tz && validZone(d.tz) ? d.tz : DEFAULTS.tz,
  };
};

// Minutes since midnight on that person's clock
const localMinutes = (tz, now) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return get('hour') * 60 + get('minute');
};

/** Is the reminder held back for this setting at this moment? */
const isQuiet = (stored, now = new Date()) => {
  const d = dndOf(stored);
  if (d.on) return true;
  if (!d.daily) return false;
  const from = minutesOf(d.from);
  const to = minutesOf(d.to);
  if (from === to) return false;
  const at = localMinutes(d.tz, now);
  // 22:00 .. 07:00 runs past midnight; 13:00 .. 15:00 does not
  return from < to ? at >= from && at < to : at >= from || at < to;
};

/** How often this person's reminder comes, in minutes */
const minutesOf24 = (user) => {
  const n = Number(user && user.reminder_minutes);
  return Number.isInteger(n) && n >= MIN_MINUTES && n <= MAX_MINUTES ? n : env.reminderMinutes;
};

/** Is this the minute their reminder falls on? (Do not disturb is separate.) */
const isDue = (user, now = new Date()) => localMinutes(dndOf(user && user.dnd).tz, now) % minutesOf24(user) === 0;

/** A new interval sent by an app, checked: { minutes } or { error } */
const readInterval = (body) => {
  const n = Number(body && body.minutes);
  if (!Number.isInteger(n) || n < MIN_MINUTES || n > MAX_MINUTES) {
    return { error: 'Set the reminder to between 5 minutes and 24 hours.' };
  }
  return { minutes: n };
};

/**
 * A change sent by an app, checked. Returns { dnd } with only the fields that
 * were sent and are good, or { error } naming what is wrong.
 */
const readChange = (body) => {
  const b = body || {};
  const dnd = {};
  if (b.on !== undefined) dnd.on = !!b.on;
  if (b.daily !== undefined) dnd.daily = !!b.daily;
  for (const key of ['from', 'to']) {
    if (b[key] === undefined) continue;
    if (!TIME.test(String(b[key]))) return { error: 'Give the time as hours and minutes, like 22:00.' };
    dnd[key] = String(b[key]);
  }
  if (b.tz !== undefined) {
    if (!validZone(String(b.tz))) return { error: 'That time zone is not known.' };
    dnd.tz = String(b.tz);
  }
  return { dnd };
};

module.exports = {
  DEFAULTS, MIN_MINUTES, MAX_MINUTES,
  dndOf, isQuiet, readChange,
  reminderMinutesOf: minutesOf24, isDue, readInterval,
};
