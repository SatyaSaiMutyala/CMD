// LedgerTrace — the CMD's three board stages (CMD Invoice Approval, CMD Pay
// Approval, Payment Release), read and actioned through LedgerTrace's own
// /api/cmdhub/* endpoints. See p2p/cmdhub.py in the LedgerTrace project.
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

const configured = () => Boolean(env.ledgertrace.url && env.ledgertrace.key);

const call = async (method, path, body) => {
  if (!configured()) throw new SourceError(503, 'LedgerTrace is not connected on this server yet.');
  let res;
  try {
    res = await fetch(env.ledgertrace.url.replace(/\/+$/, '') + path, {
      method,
      headers: {
        'X-Api-Key': env.ledgertrace.key,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(env.ledgertrace.timeoutMs),
    });
  } catch {
    throw new SourceError(502, 'LedgerTrace could not be reached. Please try again.');
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
    console.error(`[ledgertrace] ${method} ${path} -> ${res.status}: ${data && data.error}`);
    throw new SourceError(502, 'LedgerTrace refused the connection. Please tell the administrator.');
  }
  const { ok, error, ...extra } = data || {};
  throw new SourceError(
    res.status >= 400 && res.status < 500 ? res.status : 502,
    error || 'LedgerTrace could not complete that.',
    extra,
  );
};

const code = (c) => encodeURIComponent(String(c));

// One scan or sheet behind a document, as bytes. Not JSON, so it has its own call.
const file = async (c, docId) => {
  if (!configured()) throw new SourceError(503, 'LedgerTrace is not connected on this server yet.');
  let res;
  try {
    res = await fetch(
      `${env.ledgertrace.url.replace(/\/+$/, '')}/api/cmdhub/invoice/${code(c)}/file/${encodeURIComponent(String(docId))}/`,
      { headers: { 'X-Api-Key': env.ledgertrace.key }, signal: AbortSignal.timeout(env.ledgertrace.timeoutMs * 2) },
    );
  } catch {
    throw new SourceError(502, 'LedgerTrace could not be reached. Please try again.');
  }
  if (!res.ok) {
    let said = null;
    try {
      said = (await res.json()).error;
    } catch {
      /* not JSON */
    }
    if (res.status === 401 || res.status === 503) {
      console.error(`[ledgertrace] file ${c}/${docId} -> ${res.status}: ${said}`);
      throw new SourceError(502, 'LedgerTrace refused the connection. Please tell the administrator.');
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
  id: 'ledgertrace',
  SourceError,
  configured,
  actions: ['approve', 'sendback', 'reject'],
  // { pending: {inv, pay, rel, total}, stages: [{ key, name, count, items: [...] }] }
  pending: () => call('GET', '/api/cmdhub/pending/'),
  item: (c) => call('GET', `/api/cmdhub/invoice/${code(c)}/`),
  // { body: Buffer, contentType, disposition }
  file,
  act: (c, action, { stage, reason, by }) =>
    call('POST', `/api/cmdhub/invoice/${code(c)}/${action}/`, { stage, reason, by }),
  approveAll: (stage, { codes, by }) =>
    call('POST', `/api/cmdhub/stage/${Number(stage)}/approve-all/`, codes ? { codes, by } : { by }),
};
