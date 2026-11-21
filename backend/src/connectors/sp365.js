// Sales Pulse 365 — the two approvals that wait for an admin there (the CMD is
// an admin in Sales Pulse), read and decided through its own /api/cmdhub/*
// endpoints. See app/Http/Controllers/Api/CmdHubController.php in the
// salespulse-365 project.
//
//   contract  Pending Approval, the pipeline's last tab: a contract the client
//             has signed, waiting for approval and the Party One signature.
//             It is approved or sent back for changes.
//   quote     Price Quote Approval: a pricing request waiting for a decision.
//             It is approved or rejected.
//
// Approving a contract signs it, and Sales Pulse requires a live selfie of the
// person doing it — the same identity check its own review window makes. The
// apps take it at the moment of approving and it travels with that one call
// as `photo` (an image data URL); Sales Pulse keeps it with the contract.
// Without one the approval is refused (code "selfie_required").
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

const NAME = 'Sales Pulse';
const configured = () => Boolean(env.sp365.url && env.sp365.key);
const base = () => env.sp365.url.replace(/\/+$/, '');

const call = async (method, path, body) => {
  if (!configured()) throw new SourceError(503, `${NAME} is not connected on this server yet.`);
  let res;
  try {
    res = await fetch(base() + path, {
      method,
      headers: {
        'X-Api-Key': env.sp365.key,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(env.sp365.timeoutMs),
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
    console.error(`[sp365] ${method} ${path} -> ${res.status}: ${data && data.error}`);
    throw new SourceError(502, `${NAME} refused the connection. Please tell the administrator.`);
  }
  const { ok, error, ...extra } = data || {};
  throw new SourceError(
    res.status >= 400 && res.status < 500 ? res.status : 502,
    error || `${NAME} could not complete that.`,
    extra,
  );
};

const id = (c) => encodeURIComponent(String(c));

// The contract as a PDF, as bytes. Not JSON, so it has its own call.
const file = async (c, docId) => {
  if (!configured()) throw new SourceError(503, `${NAME} is not connected on this server yet.`);
  let res;
  try {
    res = await fetch(`${base()}/api/cmdhub/items/${id(c)}/file/${encodeURIComponent(String(docId))}`, {
      headers: { 'X-Api-Key': env.sp365.key },
      signal: AbortSignal.timeout(env.sp365.timeoutMs * 2),
    });
  } catch {
    throw new SourceError(502, `${NAME} could not be reached. Please try again.`);
  }
  if (!res.ok) {
    let said = null;
    try {
      said = (await res.json()).error;
    } catch {
      /* not JSON */
    }
    if (res.status === 401 || res.status === 503) {
      console.error(`[sp365] file ${c}/${docId} -> ${res.status}: ${said}`);
      throw new SourceError(502, `${NAME} refused the connection. Please tell the administrator.`);
    }
    throw new SourceError(res.status >= 400 && res.status < 500 ? res.status : 502, said || 'That document could not be opened.');
  }
  return {
    body: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
    disposition: res.headers.get('content-disposition') || 'inline',
  };
};

module.exports = {
  id: 'sp365',
  SourceError,
  configured,
  actions: ['approve', 'reject', 'sendback'],
  // { pending: { contract, quote, total },
  //   stages: [{ key, name, count, items: [...] }] }
  pending: () => call('GET', '/api/cmdhub/pending'),
  // { item: { ...card, stage_name, facts, lines, notes, documents, activity } }
  item: (c) => call('GET', `/api/cmdhub/items/${id(c)}`),
  // { body: Buffer, contentType, disposition }
  file,
  // -> { ref, party, amount_text, verb, from, to, message, pending }
  act: (c, action, { stage, reason, by, photo }) =>
    call('POST', `/api/cmdhub/items/${id(c)}/${action}`, { stage, reason, by, photo }),
  // No approveAll: each one is read before it is decided.
};
