// The pending-approvals reminder. Every minute, on the minute, the server
// checks whether anyone's reminder falls on it (each person sets how often
// theirs comes: services/quiet.js) and whether anything is waiting; if both,
// it reminds their devices. The server keeps the time, not the phone, so it
// still fires when the app is closed.
const { announceReminder, reminderAudience } = require('./notifier');
const { getPendingSummary } = require('./pending');

let timer = null;

// One check. Returns what was sent, or null when there was nothing to send.
//   `at` given  the clock's own check: only those whose interval falls on
//               that minute are reminded
//   no `at`     reminds everyone now (do not disturb still applies)
const runReminder = async (at) => {
  // Nobody's minute: no need to count what is pending
  if (at && !(await reminderAudience(at)).due.size) return null;
  const summary = await getPendingSummary();
  if (summary.total === 0) return null;
  return announceReminder(summary, at);
};

const msToNextSlot = (minutes, now = Date.now()) => {
  const slot = minutes * 60 * 1000;
  return slot - (now % slot);
};

const startReminder = () => {
  const schedule = () => {
    timer = setTimeout(async () => {
      try {
        // the minute this tick is for, whatever the delay in getting here
        await runReminder(new Date(Math.floor(Date.now() / 60000) * 60000));
      } catch (err) {
        console.warn('[reminder] check failed:', err.message);
      }
      schedule();
    }, msToNextSlot(1) + 50);
  };
  schedule();
  console.log('[reminder] checking every minute for reminders that are due');
};

const stopReminder = () => clearTimeout(timer);

module.exports = { startReminder, stopReminder, runReminder, msToNextSlot };
