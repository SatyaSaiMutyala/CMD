const http = require('http');
const env = require('./config/env');
const app = require('./app');
const { connectDb, disconnectDb } = require('./config/db');
const { initPush } = require('./services/push');
const { startReminder, stopReminder } = require('./services/reminder');
const { initHub } = require('./sockets/hub');

let server = null;
let io = null;

// Start everything. `port` and `mongoUri` can be overridden (the tests do).
const start = async ({ port = env.port, mongoUri = env.mongoUri, reminder = true } = {}) => {
  if (!env.jwtSecret) throw new Error('JWT_SECRET is not set in .env');
  await connectDb(mongoUri);

  // Express and Socket.IO share one listener: HTTP routes and /socket.io on the same port
  server = http.createServer(app);
  io = initHub(server);
  initPush();
  if (reminder) startReminder();

  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`[server] listening on http://localhost:${server.address().port}`);
  return server;
};

const stop = async () => {
  stopReminder();
  if (io) await io.close(); // also closes the HTTP server
  await disconnectDb();
};

if (require.main === module) {
  start().catch((err) => {
    console.error('[server] could not start:', err.message);
    process.exit(1);
  });
}

module.exports = { start, stop };
