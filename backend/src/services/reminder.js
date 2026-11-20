// The pending-approvals reminder. Every REMINDER_MINUTES (15), on the clock
// (:00, :15, :30, :45), the server checks whether anything is waiting and, if
// so, reminds every device. The server keeps the time, not the phone, so it
// still fires when the app is closed.
const env = require('../config/env');
const { announceReminder } = require('./notifier');
const { getPendingSummary } = require('./pending');

let timer = null;

// One check. Returns what was sent, or null when nothing is pending.
const runReminder = async () => {
  const summary = await getPendingSummary();
  if (summary.total === 0) return null;
  return announceReminder(summary);
};

const msToNextSlot = (minutes, now = Date.now()) => {
  const slot = minutes * 60 * 1000;
  return slot - (now % slot);
};

const startReminder = () => {
  const schedule = () => {
    timer = setTimeout(async () => {
      try {
        await runReminder();
      } catch (err) {
        console.warn('[reminder] check failed:', err.message);
      }
      schedule();
    }, msToNextSlot(env.reminderMinutes));
  };
  schedule();
  console.log(`[reminder] checking every ${env.reminderMinutes} minutes`);
};

const stopReminder = () => clearTimeout(timer);

module.exports = { startReminder, stopReminder, runReminder, msToNextSlot };
