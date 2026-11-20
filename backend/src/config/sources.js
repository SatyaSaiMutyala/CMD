// The software that sends CMD-level approvals to the hub. The ids match the
// registry in the web and mobile apps.
//
// Each one calls our webhook with a key: the shared HUB_WEBHOOK_KEY, or its
// own, set in .env as HOOK_KEY_<ID> (for example HOOK_KEY_LEDGERTRACE), which
// wins where it is set. With neither configured a source is rejected.
const SOURCES = [
  {
    id: 'ledgertrace',
    name: 'LedgerTrace',
    // The CMD's stages there, by the key LedgerTrace sends; used in notification text.
    stages: { inv: 'Invoice Approval', pay: 'Pay Approval', rel: 'Payment Release' },
  },
  {
    id: 'edos',
    name: 'eDOS',
    // One stage: a test addition or edit waiting for approval.
    stages: { req: 'Test Approval' },
  },
  { id: 'sp365', name: 'Sales Pulse 365' },
  { id: 'pace', name: 'PACE' },
  { id: 'tams', name: 'TAMS' },
  { id: 'truflow', name: 'TruFlow' },
  { id: 'lexes', name: 'LEXES' },
  { id: 'caxis', name: 'CAXIS' },
];

const findSource = (id) => SOURCES.find((s) => s.id === String(id || '').toLowerCase()) || null;

// The key a source must send to our webhook: its own if it has one, otherwise
// the one shared by every project (HUB_WEBHOOK_KEY).
const hookKey = (id) => process.env[`HOOK_KEY_${String(id).toUpperCase()}`] || process.env.HUB_WEBHOOK_KEY || '';

module.exports = { SOURCES, findSource, hookKey };
