// Trust Prism — the brand asset library. The CMD is the Super Admin there, so
// the hub shows the two places an asset waits before it is approved, read and
// decided through Trust Prism's own /api/cmdhub/* endpoints. See
// backend/src/controllers/cmdHubController.js in the Trust-Prism project.
//
//   draft    Version Tracker   send for approval, or leave feedback
//   review   Approval          approve, or send back to the Version Tracker
//
// Publishing an approved asset is done in Trust Prism itself.
//
// FILES. An asset is a file, and often a large one (films, layered artwork), so
// nothing is passed through this server: Trust Prism hands out short-lived
// links straight to its storage, and a document is opened by sending the
// browser to one. A document id is "master" (the current file) or "v2r3"
// (version 2, revision 3); "<id>!save" asks for it as a download.
//
// A zip can be looked inside without downloading it (`contents`), and one
// file opened out of it: that one is small and read by Trust Prism, so it
// does come through here as bytes. Its document id is
// "zip~<the zip's id>~<base64url of the path inside>".
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

const NAME = 'Trust Prism';
const configured = () => Boolean(env.prism.url && env.prism.key);
const base = () => env.prism.url.replace(/\/+$/, '');

const call = async (method, path, body) => {
  if (!configured()) throw new SourceError(503, `${NAME} is not connected on this server yet.`);
  let res;
  try {
    res = await fetch(base() + path, {
      method,
      headers: {
        'X-Api-Key': env.prism.key,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(env.prism.timeoutMs),
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
    console.error(`[prism] ${method} ${path} -> ${res.status}: ${data && data.error}`);
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
const q = (v) => encodeURIComponent(String(v));

// "zip~master~<b64url path>" -> { zip: 'master', path: 'brand/logo.svg' }, or null
const zipEntry = (docId) => {
  const m = /^zip~([A-Za-z0-9]+)~([A-Za-z0-9_-]+)$/.exec(String(docId));
  if (!m) return null;
  return { zip: m[1], path: Buffer.from(m[2], 'base64url').toString('utf8') };
};

// Where a document is: { url } when the browser should be sent straight to
// storage for it, null when it has to be read through here (a file in a zip).
const locate = async (c, docId) => {
  if (zipEntry(docId)) return null;
  const [doc, how] = String(docId).split('!');
  const said = await call('GET', `/api/cmdhub/items/${id(c)}/file-url?doc=${q(doc)}${how === 'save' ? '&download=1' : ''}`);
  return { url: said.url };
};

// One file out of a zip, as bytes.
const file = async (c, docId) => {
  const entry = zipEntry(docId);
  if (!entry) throw new SourceError(404, 'That document could not be opened.');
  if (!configured()) throw new SourceError(503, `${NAME} is not connected on this server yet.`);
  let res;
  try {
    res = await fetch(`${base()}/api/cmdhub/items/${id(c)}/zip-file?doc=${q(entry.zip)}&path=${q(entry.path)}`, {
      headers: { 'X-Api-Key': env.prism.key },
      signal: AbortSignal.timeout(env.prism.timeoutMs * 2),
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
      console.error(`[prism] zip file ${c}/${docId} -> ${res.status}: ${said}`);
      throw new SourceError(502, `${NAME} refused the connection. Please tell the administrator.`);
    }
    throw new SourceError(res.status >= 400 && res.status < 500 ? res.status : 502, said || 'That file could not be opened.');
  }
  return {
    body: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
    disposition: res.headers.get('content-disposition') || 'attachment',
  };
};

module.exports = {
  id: 'prism',
  SourceError,
  configured,
  actions: ['approve', 'sendback', 'reject'],
  // { pending: { draft, review, total },
  //   stages: [{ key, name, count, items: [...] }] }
  pending: () => call('GET', '/api/cmdhub/pending'),
  // { item: { ...card, stage_name, facts, preview, documents, activity } }
  item: (c) => call('GET', `/api/cmdhub/items/${id(c)}`),
  // { url } | null — see FILES above
  locate,
  // { body: Buffer, contentType, disposition } — a file inside a zip
  file,
  // { entries: [{ name, size, size_text, encrypted, opens }], count, truncated }
  contents: (c, docId) => call('GET', `/api/cmdhub/items/${id(c)}/zip?doc=${q(docId)}`),
  // -> { ref, party, amount_text, verb, from, to, message, pending }
  act: (c, action, { stage, reason, by }) =>
    call('POST', `/api/cmdhub/items/${id(c)}/${action}`, { stage, reason, by }),
  // No approveAll: each asset is looked at before it is decided.
};
