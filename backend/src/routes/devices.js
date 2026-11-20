const express = require('express');
const env = require('../config/env');
const Device = require('../models/Device');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// GET /api/devices/web-push-key  ->  { publicKey }  (the browser needs it to subscribe)
router.get('/web-push-key', requireAuth, (req, res) => res.json({ publicKey: env.vapid.publicKey || null }));

// POST /api/devices   register this phone or browser for push
//   phones  : { platform: 'android' | 'ios', token }
//   browser : { platform: 'web', subscription }       (the PushSubscription as JSON)
//   either  : + { reminders: false } to stop the 15-minute reminder on this
//             device (send it again with true to switch it back on). Left out,
//             the device's current choice is kept.
router.post('/', requireAuth, async (req, res) => {
  const platform = String(req.body?.platform || '');
  const subscription = platform === 'web' ? req.body?.subscription : null;
  const token = platform === 'web' ? String(subscription?.endpoint || '') : String(req.body?.token || '');
  if (!['android', 'ios', 'web'].includes(platform) || !token) {
    return res.status(400).json({ message: 'A platform and a device token are required.' });
  }
  const choice = typeof req.body?.reminders === 'boolean' ? { reminders: req.body.reminders } : {};
  await Device.findOneAndUpdate(
    { token },
    { user: req.user._id, platform, token, subscription, last_seen_at: new Date(), ...choice },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  return res.json({ ok: true });
});

// DELETE /api/devices  { token }   stop push for this device (on sign-out)
router.delete('/', requireAuth, async (req, res) => {
  const token = String(req.body?.token || '');
  if (!token) return res.status(400).json({ message: 'Which device?' });
  await Device.deleteOne({ token, user: req.user._id });
  return res.json({ ok: true });
});

module.exports = router;
