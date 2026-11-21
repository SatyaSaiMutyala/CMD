// Everything the hub announces goes through here, so the socket, the push
// and the log can never disagree about what was sent.
const Notification = require('../models/Notification');
const { emitToApps } = require('../sockets/hub');
const { sendPush } = require('./push');
const User = require('../models/User');
const { isDue, isQuiet } = require('./quiet');

// Something moved in a source: tell open apps to refetch it. No push, no sound.
const announceChange = (software, stage) =>
  emitToApps('hub:changed', { software, stage: stage || null, at: Date.now() });

// A new approval arrived: log it, then chime + snackbar in open apps and a
// push notification everywhere else.
const announceArrival = async ({ software, stage, ref, title, body }) => {
  const note = await Notification.create({ kind: 'arrival', software, stage, ref, title, body });
  const sockets = emitToApps('hub:arrival', note.toPublic());
  const pushed = await sendPush({ kind: 'arrival', title, body, data: { software, stage, ref } });
  return { sockets, pushed };
};

// Who the reminder is for at this moment. Each person sets how often it
// comes and when it keeps quiet (services/quiet.js):
//   `at` given  the clock's own check: those whose interval falls on this minute
//   no `at`     asked for outright: everyone
// and, either way, nobody who is in do-not-disturb.
// -> { people, due: Set<id>, quiet: Set<id> }
const reminderAudience = async (at) => {
  const people = await User.find({ is_active: true }).select('dnd reminder_minutes').lean();
  const quiet = new Set(people.filter((u) => isQuiet(u.dnd, at || new Date())).map((u) => String(u._id)));
  const due = new Set(
    people.filter((u) => !quiet.has(String(u._id)) && (!at || isDue(u, at))).map((u) => String(u._id)),
  );
  return { people, due, quiet };
};

// The reminder: full screen in open apps and on Android, a notification with
// its own sound on iPhone and in a closed browser.
//
// Anyone it is not for right now is left alone: no push goes to their
// devices. When that is everyone, nothing is announced at all and nothing is
// added to the notifications list (`quiet: true` when the reason is
// do-not-disturb, null when it is simply not their time yet).
const announceReminder = async ({ total, bySoftware }, at) => {
  const { people, due, quiet } = await reminderAudience(at);
  if (people.length && !due.size) {
    return quiet.size === people.length ? { sockets: 0, pushed: 0, quiet: true } : null;
  }
  // everyone it is not for, for the push to pass over
  const quietUsers = new Set(people.map((u) => String(u._id)).filter((id) => !due.has(id)));

  const title = `${total} ${total === 1 ? 'approval is' : 'approvals are'} waiting for you`;
  const body = bySoftware
    .filter((s) => s.pending > 0)
    .map((s) => `${s.name}: ${s.pending}`)
    .join(' · ');
  await Notification.create({ kind: 'reminder', title, body });
  const sockets = emitToApps('hub:reminder', { total, bySoftware, at: Date.now() });
  const pushed = await sendPush({ kind: 'reminder', title, body, data: { total }, quietUsers });
  return { sockets, pushed };
};

module.exports = { announceChange, announceArrival, announceReminder, reminderAudience };
