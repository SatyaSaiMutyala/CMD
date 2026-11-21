const express = require('express');
const mongoose = require('mongoose');
const Decision = require('../models/Decision');
const Notification = require('../models/Notification');
const { requireAuth, refuseViewOnly } = require('../middleware/requireAuth');
const { getPendingSummary } = require('../services/pending');

const router = express.Router();

// GET /api/pending  ->  { total, bySoftware: [{ software, name, pending, reportedAt }] }
router.get('/pending', requireAuth, async (req, res) => res.json(await getPendingSummary()));

/* ---- notifications: what the hub announced, as the CMD's list ---- */

// Only what the CMD has not removed from the list
const LISTED = { cleared_at: null };
const dateFrom = (value) => {
  const d = value ? new Date(String(value)) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

// GET /api/notifications?limit=20&before=<ISO date>&since=<ISO date>
//   ->  { items, has_more, unread }
// Newest first, a page at a time: `before` is the `at` of the last item of
// the page before. `since` gives what arrived after a moment (an app catching
// up after being offline). `unread` counts the whole list, not just the page.
router.get('/notifications', requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const since = dateFrom(req.query.since);
  const before = dateFrom(req.query.before);
  const filter = { ...LISTED };
  if (since || before) {
    filter.created_at = { ...(since ? { $gt: since } : {}), ...(before ? { $lt: before } : {}) };
  }
  // One more than asked for: its presence says there is another page
  const rows = await Notification.find(filter).sort({ created_at: -1 }).limit(limit + 1);
  const unread = await Notification.countDocuments({ ...LISTED, read_at: null });
  return res.json({
    items: rows.slice(0, limit).map((n) => n.toPublic()),
    has_more: rows.length > limit,
    unread,
  });
});

// POST /api/notifications/read-all  ->  { ok, changed }
// The list is one list, shared: a view-only account reads it and leaves it
// as it found it.
router.post('/notifications/read-all', requireAuth, refuseViewOnly, async (req, res) => {
  const done = await Notification.updateMany({ ...LISTED, read_at: null }, { $set: { read_at: new Date() } });
  return res.json({ ok: true, changed: done.modifiedCount });
});

// POST /api/notifications/:id/read  ->  { ok }
router.post('/notifications/:id/read', requireAuth, refuseViewOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Notification not found.' });
  await Notification.updateOne({ _id: req.params.id, read_at: null }, { $set: { read_at: new Date() } });
  return res.json({ ok: true });
});

// DELETE /api/notifications/:id  ->  { ok }
// Takes one out of the CMD's list. Nothing is erased: it is marked as removed.
router.delete('/notifications/:id', requireAuth, refuseViewOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Notification not found.' });
  await Notification.updateOne({ _id: req.params.id, cleared_at: null }, { $set: { cleared_at: new Date() } });
  return res.json({ ok: true });
});

// DELETE /api/notifications  ->  { ok, changed }
// Empties the CMD's list (again by marking, not erasing).
router.delete('/notifications', requireAuth, refuseViewOnly, async (req, res) => {
  const done = await Notification.updateMany({ ...LISTED }, { $set: { cleared_at: new Date() } });
  return res.json({ ok: true, changed: done.modifiedCount });
});

// GET /api/decisions?limit=100&software=ledgertrace  ->  { items }
// The CMD's own decisions made through the hub, newest first. `software`
// keeps it to one application (the History page's export, by application).
// The limit is generous on purpose: an export wants the whole history.
router.get('/decisions', requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 5000);
  const filter = { user: req.user._id };
  if (req.query.software) filter.software = String(req.query.software).toLowerCase();
  const rows = await Decision.find(filter).sort({ created_at: -1 }).limit(limit);
  return res.json({ items: rows.map((d) => d.toPublic()) });
});

module.exports = router;
