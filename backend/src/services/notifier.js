// Everything the hub announces goes through here, so the socket, the push
// and the log can never disagree about what was sent.
const Notification = require('../models/Notification');
const { emitToApps } = require('../sockets/hub');
const { sendPush } = require('./push');

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

// The 15-minute reminder: full screen in open apps and on Android, a
// notification with its own sound on iPhone and in a closed browser.
const announceReminder = async ({ total, bySoftware }) => {
  const title = `${total} ${total === 1 ? 'approval is' : 'approvals are'} waiting for you`;
  const body = bySoftware
    .filter((s) => s.pending > 0)
    .map((s) => `${s.name}: ${s.pending}`)
    .join(' · ');
  await Notification.create({ kind: 'reminder', title, body });
  const sockets = emitToApps('hub:reminder', { total, bySoftware, at: Date.now() });
  const pushed = await sendPush({ kind: 'reminder', title, body, data: { total } });
  return { sockets, pushed };
};

module.exports = { announceChange, announceArrival, announceReminder };
