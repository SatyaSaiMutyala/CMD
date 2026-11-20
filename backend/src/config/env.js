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
  // LedgerTrace: where its /api/cmdhub/* lives, and the key it expects from us.
  ledgertrace: {
    url: process.env.LEDGERTRACE_API_URL || '',
    key: process.env.LEDGERTRACE_API_KEY || '',
    timeoutMs: Number(process.env.LEDGERTRACE_TIMEOUT_MS) || 15000,
  },
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || '',
  },
};
