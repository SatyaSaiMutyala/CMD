// What the web and mobile apps call to read and decide approvals. Each call
// is forwarded to the source project that owns the data, with that project's
// key added here on the server.
//
//   GET  /api/software/:software/pending                      the CMD's lists there
//   GET  /api/software/:software/items/:code                  one item in full
//   POST /api/software/:software/items/:code/:action          { stage, reason }
//          action = approve | sendback | reject
//   POST /api/software/:software/stages/:stage/approve-all    { codes? }
//   POST /api/software/:software/items/:code/files/:docId/link   -> { url }
//          a link that opens one attached document, good for two minutes
//
// Every action carries the stage the app believes the item is at; the source
// refuses it (409) if the item has moved since, so a double tap cannot act twice.
const express = require('express');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { findConnector } = require('../connectors');
const { requireAuth } = require('../middleware/requireAuth');
const Decision = require('../models/Decision');
const { announceChange } = require('../services/notifier');
const { setPending } = require('../services/pending');

const router = express.Router();
router.use(requireAuth);

router.param('software', (req, res, next, id) => {
  req.connector = findConnector(id);
  if (!req.connector) return res.status(404).json({ message: 'That software is not connected to the hub yet.' });
  return next();
});

// Runs a connector call; a refusal from the source keeps its status and message.
const forward = (fn) => async (req, res) => {
  try {
    return res.json(await fn(req));
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ message: err.message, ...err.extra });
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong on the server.' });
  }
};

// The source's own count is the truth: keep ours in step with it, so the
// 15-minute reminder is right even if a webhook was missed.
const remember = async (software, data) => {
  const total = data && data.pending && Number(data.pending.total);
  if (Number.isFinite(total)) await setPending(software, total);
};

// The hub's own record of what the CMD decided — History on both apps reads
// it. Never allowed to fail the action it follows: that already happened.
const VERBS = { approve: 'Approved', sendback: 'Sent back', reject: 'Rejected' };
const record = async (req, rows) => {
  try {
    await Decision.insertMany(rows.map((row) => ({ user: req.user._id, software: req.connector.id, ...row })));
  } catch (err) {
    console.error('[decisions] not recorded:', err.message);
  }
};

router.get('/:software/pending', forward(async (req) => {
  const data = await req.connector.pending();
  await remember(req.connector.id, data);
  return data;
}));

router.get('/:software/items/:code', forward((req) => req.connector.item(req.params.code)));

// A browser tab (or the phone's browser) cannot send the login token when it
// simply opens a URL, so a document is opened through a link that carries its
// own short-lived, single-purpose token instead. See routes/files.js.
const FILE_LINK_SECONDS = 120;
router.post('/:software/items/:code/files/:docId/link', forward(async (req) => {
  const token = jwt.sign(
    { typ: 'file', sub: String(req.user._id), sw: req.connector.id, code: req.params.code, doc: req.params.docId },
    env.jwtSecret,
    { expiresIn: FILE_LINK_SECONDS },
  );
  const base = (env.publicUrl || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  return { url: `${base}/api/files/${token}`, expires_in: FILE_LINK_SECONDS };
}));

router.post('/:software/items/:code/:action', forward(async (req) => {
  const { action, code } = req.params;
  if (!req.connector.actions.includes(action)) {
    const err = new Error(`Unknown action. Use one of: ${req.connector.actions.join(', ')}.`);
    err.status = 400;
    throw err;
  }
  const data = await req.connector.act(code, action, {
    stage: req.body?.stage,
    reason: req.body?.reason ? String(req.body.reason).slice(0, 300) : undefined,
    by: req.user.name,
  });
  await remember(req.connector.id, data);
  await record(req, [{
    // What the source calls the item and who or what it is about (the
    // names differ: LedgerTrace says invoice / vendor, eDOS says ref / party)
    ref: data.ref || data.invoice || code,
    party: data.party || data.vendor || '',
    amount: data.amount_text || '',
    // Approving at the release stage is releasing the payment
    verb: action === 'approve' && data.from && data.from.key === 'rel' ? 'Released' : VERBS[action],
    from_stage: data.from ? data.from.key || data.from.name : null,
    to_stage: data.to ? data.to.key || data.to.name : null,
    reason: req.body?.reason ? String(req.body.reason).slice(0, 300) : '',
  }]);
  // The CMD's other devices refresh at once, without waiting for the source's webhook.
  announceChange(req.connector.id, data.from ? data.from.key : null);
  return data;
}));

router.post('/:software/stages/:stage/approve-all', forward(async (req) => {
  if (!req.connector.approveAll) {
    const err = new Error('That software decides one item at a time.');
    err.status = 400;
    throw err;
  }
  const codes = Array.isArray(req.body?.codes) ? req.body.codes.map(String) : undefined;
  const data = await req.connector.approveAll(req.params.stage, { codes, by: req.user.name });
  await remember(req.connector.id, data);
  const moved = Array.isArray(data.moved_items) ? data.moved_items : (data.moved || []).map((ref) => ({ code: ref }));
  await record(req, moved.map((item) => ({
    ref: item.code,
    party: item.vendor || '',
    amount: item.amount_text || '',
    verb: 'Moved',
    from_stage: data.from ? data.from.key || data.from.name : null,
    to_stage: data.to ? data.to.key || data.to.name : null,
  })));
  announceChange(req.connector.id, data.from ? data.from.key : null);
  return data;
}));

module.exports = router;
