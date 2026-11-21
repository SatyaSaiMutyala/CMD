// Webhooks — the server-to-server side, called by our other projects
// (LedgerTrace, eDOS, AIMS, Sales Pulse 365) the moment something changes there.
//
//   POST /api/hooks/:software/changed          X-Api-Key: that software's key
//
//   {
//     "pending": { "inv": 0, "pay": 18, "rel": 2, "total": 20 },   // or just a number
//     "changes": [                    // what moved; several when moved together
//       { "ref": "INS-2026-1140", "party": "TRANSASIA BIO-MEDICALS LTD",
//         "amount_text": "₹7,662",
//         "from": null,               // the CMD stage it left, or null
//         "to": "pay" }               // the CMD stage it entered, or null
//     ]
//   }
//
// Every call nudges open apps to refetch. A change that ENTERS a CMD stage
// from outside (from = null) is a new approval: chime + snackbar in open
// apps, a push everywhere else. A move between two CMD stages, or out of
// them, is the CMD's own doing (or a withdrawal) and stays silent.
//
// The older single-event body is still accepted:
//   { "event": "new" | "updated" | "removed", "stage": "pay", "pending": 10,
//     "item": { "ref": "…", "party": "…", "amount": "₹41,706" } }
const express = require('express');
const { requireSourceKey } = require('../middleware/requireSourceKey');
const { announceArrival, announceChange } = require('../services/notifier');
const { setPending } = require('../services/pending');

const router = express.Router();
const EVENTS = ['new', 'updated', 'removed'];
const MAX_CHANGES = 500;

const text = (v) => (v === null || v === undefined ? '' : String(v).slice(0, 200));

// The two body shapes, read into one list of changes.
const readChanges = (body) => {
  if (Array.isArray(body.changes)) {
    return body.changes.slice(0, MAX_CHANGES).map((c) => ({
      ref: text(c && c.ref),
      party: text(c && c.party),
      amount: text(c && (c.amount_text || c.amount)),
      from: c && c.from ? text(c.from) : null,
      to: c && c.to ? text(c.to) : null,
    }));
  }
  const event = String(body.event || 'updated');
  if (!EVENTS.includes(event)) return null;
  const stage = body.stage ? text(body.stage) : null;
  const item = body.item || {};
  return [{
    ref: text(item.ref),
    party: text(item.party),
    amount: text(item.amount),
    from: event === 'removed' ? stage : null,
    to: event === 'removed' ? null : stage,
    silent: event !== 'new',
  }];
};

router.post('/:software/changed', requireSourceKey, async (req, res) => {
  const { source } = req;
  const body = req.body || {};
  const changes = readChanges(body);
  if (!changes) return res.status(400).json({ message: `event must be one of: ${EVENTS.join(', ')}` });

  const pending = Number(body.pending && typeof body.pending === 'object' ? body.pending.total : body.pending);
  if (Number.isFinite(pending)) await setPending(source.id, pending);

  // One nudge per stage touched (or one general nudge when none is named).
  const stages = [...new Set(changes.flatMap((c) => [c.from, c.to]).filter(Boolean))];
  let sockets = 0;
  for (const stage of stages.length ? stages : [null]) sockets = announceChange(source.id, stage);

  const arrivals = changes.filter((c) => c.to && !c.from && !c.silent);
  let pushed = 0;
  if (arrivals.length) {
    const stageNames = source.stages || {};
    const first = arrivals[0];
    const stageName = stageNames[first.to] || '';
    const many = arrivals.length > 1;
    const sent = await announceArrival({
      software: source.id,
      stage: first.to,
      ref: many ? null : first.ref || null,
      title: many
        ? `${arrivals.length} new approvals`
        : `New approval${first.amount ? ` · ${first.amount}` : ''}`,
      body: many
        ? [source.name, arrivals.every((c) => c.to === first.to) ? stageName : ''].filter(Boolean).join(' · ')
        : [first.party, source.name, stageName].filter(Boolean).join(' · '),
    });
    pushed = sent.pushed;
  }
  return res.json({ ok: true, notified: { sockets, pushed, arrivals: arrivals.length } });
});

module.exports = router;
