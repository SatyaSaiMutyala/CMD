// AIMS — everything waiting in its four approval queues (Master, Indent,
// Document and Adjustment Approval), as an administrator sees it there: the
// CMD is an administrator in AIMS. Read and decided through AIMS's own
// /api/cmdhub/* endpoints. See backend/core/cmdhub_views.py and
// backend/core/services/cmdhub.py in the aims2.0 project.
//
// AIMS signs a record off in two steps, Verify then Approve, and an
// administrator holds both. So an item still at the first step (`can_verify`)
// has two ways forward: "verify" takes it through that step only, "approve"
// takes it all the way. The other decision is reject. There is no "send back"
// and no "approve all" there, so there is none here, and AIMS shares no
// attached files with the hub.
//
// An item's id is the opaque one AIMS gives it. It goes back to AIMS in the
// query string or the body, never in the path.
//
// The key below is sent from this server only. The web and mobile apps call
// our routes with the CMD's login; they never see it.
const env = require('../config/env');

class SourceError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const NAME = 'AIMS';
const configured = () => Boolean(env.aims.url && env.aims.key);
const base = () => env.aims.url.replace(/\/+$/, '');

const call = async (method, path, body) => {
  if (!configured()) throw new SourceError(503, `${NAME} is not connected on this server yet.`);
  let res;
  try {
    res = await fetch(base() + path, {
      method,
      headers: {
        'X-Api-Key': env.aims.key,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(env.aims.timeoutMs),
    });
  } catch {
    throw new SourceError(502, `${NAME} could not be reached. Please try again.`);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* not JSON: handled below */
  }
  if (res.ok && data && data.ok) return data;
  // Our own key being wrong is a server problem, not something the CMD can fix.
  if (res.status === 401 || res.status === 503) {
    console.error(`[aims] ${method} ${path} -> ${res.status}: ${data && data.error}`);
    throw new SourceError(502, `${NAME} refused the connection. Please tell the administrator.`);
  }
  const { ok, error, ...extra } = data || {};
  throw new SourceError(
    res.status >= 400 && res.status < 500 ? res.status : 502,
    error || `${NAME} could not complete that.`,
    extra,
  );
};

module.exports = {
  id: 'aims',
  SourceError,
  configured,
  actions: ['verify', 'approve', 'reject'],
  // { pending: { master, indent, doc, adj, total },
  //   stages: [{ key, name, count, items: [...] }] }
  pending: () => call('GET', '/api/cmdhub/pending/'),
  // { item: { ...card, stage_name, facts, lines, notes, activity } }
  item: (c) => call('GET', `/api/cmdhub/item/?id=${encodeURIComponent(String(c))}`),
  // -> { ref, party, amount_text, verb, from, to, message, pending }
  act: (c, action, { stage, reason, by }) =>
    call('POST', '/api/cmdhub/act/', { id: String(c), action, stage, reason, by }),
  // No approveAll and no file: AIMS decides one item at a time and shares no documents.
};
