const express = require('express');
const Decision = require('../models/Decision');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/requireAuth');
const { getPendingSummary } = require('../services/pending');

const router = express.Router();

// GET /api/pending  ->  { total, bySoftware: [{ software, name, pending, reportedAt }] }
router.get('/pending', requireAuth, async (req, res) => res.json(await getPendingSummary()));

// GET /api/notifications?since=<ISO date>&limit=50  ->  { items }
// What the hub announced, newest first — lets an app catch up after being offline.
router.get('/notifications', requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const since = req.query.since ? new Date(String(req.query.since)) : null;
  const filter = since && !Number.isNaN(since.getTime()) ? { created_at: { $gt: since } } : {};
  const rows = await Notification.find(filter).sort({ created_at: -1 }).limit(limit);
  return res.json({ items: rows.map((n) => n.toPublic()) });
});

// GET /api/decisions?limit=100  ->  { items }
// The CMD's own decisions made through the hub, newest first.
router.get('/decisions', requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const rows = await Decision.find({ user: req.user._id }).sort({ created_at: -1 }).limit(limit);
  return res.json({ items: rows.map((d) => d.toPublic()) });
});

module.exports = router;
