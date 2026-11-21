// The CMD's own settings, kept on the account so every device agrees.
//
//   GET /api/settings            ->  { reminder: { minutes, min, max },
//                                      dnd: { on, daily, from, to, tz }, quiet }
//   PUT /api/settings/reminder   { minutes }                       ->  the same
//   PUT /api/settings/dnd        { on?, daily?, from?, to?, tz? }  ->  the same
//
// `reminder.minutes` is how often the reminder comes; `dnd` is do not disturb
// for it (both in services/quiet.js); `quiet` says whether the reminder is
// being held back right now. Only what
// is sent is changed. Every open app is told at once (hub:settings), so a
// switch flipped on the phone shows on the website without a refresh.
const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const {
  MIN_MINUTES, MAX_MINUTES, dndOf, isQuiet, readChange, readInterval, reminderMinutesOf,
} = require('../services/quiet');
const { emitToApps } = require('../sockets/hub');

const router = express.Router();
router.use(requireAuth);

const answer = (user) => ({
  reminder: { minutes: reminderMinutesOf(user), min: MIN_MINUTES, max: MAX_MINUTES },
  dnd: dndOf(user.dnd),
  quiet: isQuiet(user.dnd),
});

router.get('/', (req, res) => res.json(answer(req.user)));

router.put('/reminder', async (req, res) => {
  const { minutes, error } = readInterval(req.body);
  if (error) return res.status(400).json({ message: error });
  req.user.reminder_minutes = minutes;
  await req.user.save();
  emitToApps('hub:settings', { at: Date.now() });
  return res.json(answer(req.user));
});

router.put('/dnd', async (req, res) => {
  const { dnd, error } = readChange(req.body);
  if (error) return res.status(400).json({ message: error });
  req.user.dnd = { ...dndOf(req.user.dnd), ...dnd };
  await req.user.save();
  emitToApps('hub:settings', { at: Date.now() });
  return res.json(answer(req.user));
});

module.exports = router;
