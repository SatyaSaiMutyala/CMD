// Every setting the server reads, in one place. See .env.example for what each one means.
require('dotenv').config();

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

module.exports = {
  port: Number(process.env.PORT) || 5050,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  // Browser origins allowed to call the API and open the socket. Empty = any (development).
  corsOrigins: list(process.env.CORS_ORIGINS),
  reminderMinutes: Number(process.env.REMINDER_MINUTES) || 15,
  // This server's own address as the apps reach it (https://hub.example.com).
  // Used to build document links. Empty = taken from each request.
  publicUrl: process.env.PUBLIC_URL || '',
  // The two keys shared with every connected project (see .env.example):
  //   hubApiKey      sent by us, as X-Api-Key, when we call a project
  //   hubWebhookKey  sent by a project, as X-Api-Key, when it calls our webhook
  // A project can still be given keys of its own (LEDGERTRACE_API_KEY,
  // HOOK_KEY_LEDGERTRACE, ...); where one is set it is used instead.
  hubApiKey: process.env.HUB_API_KEY || '',
  hubWebhookKey: process.env.HUB_WEBHOOK_KEY || '',
  // LedgerTrace: where its /api/cmdhub/* lives, and the key it expects from us.
  ledgertrace: {
    url: process.env.LEDGERTRACE_API_URL || '',
    key: process.env.LEDGERTRACE_API_KEY || process.env.HUB_API_KEY || '',
    timeoutMs: Number(process.env.LEDGERTRACE_TIMEOUT_MS) || 15000,
  },
  // eDOS: where its /api/cmdhub/* lives, and the key it expects from us.
  edos: {
    url: process.env.EDOS_API_URL || '',
    key: process.env.EDOS_API_KEY || process.env.HUB_API_KEY || '',
    timeoutMs: Number(process.env.EDOS_TIMEOUT_MS) || 15000,
  },
  // AIMS: where its /api/cmdhub/* lives, and the key it expects from us.
  aims: {
    url: process.env.AIMS_API_URL || '',
    key: process.env.AIMS_API_KEY || process.env.HUB_API_KEY || '',
    timeoutMs: Number(process.env.AIMS_TIMEOUT_MS) || 15000,
  },
  // Sales Pulse 365: where its /api/cmdhub/* lives, and the key it expects from us.
  sp365: {
    url: process.env.SP365_API_URL || '',
    key: process.env.SP365_API_KEY || process.env.HUB_API_KEY || '',
    timeoutMs: Number(process.env.SP365_TIMEOUT_MS) || 15000,
  },
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || '',
  },
};
