// eDOS — the approval queue for test additions and edits (one stage: Test
// Approval), read and decided through eDOS's own /api/cmdhub/* endpoints. See
// app/Http/Controllers/Api/CmdHubController.php in the dos-2.0 project.
//
// eDOS has two decisions only: approve and reject. There is no "send back"
// and no "approve all" there, so there is none here.
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

const NAME = 'eDOS';
const configured = () => Boolean(env.edos.url && env.edos.key);
const base = () => env.edos.url.replace(/\/+$/, '');

const call = async (method, path, body) => {
  if (!configured()) throw new SourceError(503, `${NAME} is not connected on this server yet.`);
  let res;
  try {
    res = await fetch(base() + path, {
      method,
      headers: {
        'X-Api-Key': env.edos.key,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(env.edos.timeoutMs),
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
    console.error(`[edos] ${method} ${path} -> ${res.status}: ${data && data.error}`);
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

// One file attached to a request, as bytes. Not JSON, so it has its own call.
const file = async (c, docId) => {
  if (!configured()) throw new SourceError(503, `${NAME} is not connected on this server yet.`);
  let res;
  try {
    res = await fetch(`${base()}/api/cmdhub/requests/${id(c)}/file/${encodeURIComponent(String(docId))}`, {
      headers: { 'X-Api-Key': env.edos.key },
      signal: AbortSignal.timeout(env.edos.timeoutMs * 2),
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
      console.error(`[edos] file ${c}/${docId} -> ${res.status}: ${said}`);
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
  id: 'edos',
  SourceError,
  configured,
  actions: ['approve', 'reject'],
  // { pending: { req, total }, stages: [{ key: 'req', name, count, items: [...] }] }
  pending: () => call('GET', '/api/cmdhub/pending'),
  // { request: { ...card, changes, variants, documents } }
  item: (c) => call('GET', `/api/cmdhub/requests/${id(c)}`),
  // { body: Buffer, contentType, disposition }
  file,
  // -> { ref, party, amount_text, from, to, message, pending }
  act: (c, action, { stage, reason, by }) =>
    call('POST', `/api/cmdhub/requests/${id(c)}/${action}`, { stage, reason, by }),
  // No approveAll: eDOS decides one request at a time.
};
