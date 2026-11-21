const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');

const app = express();

// Behind nginx / a load balancer the caller's address is in X-Forwarded-For;
// the login rate limit needs the real one.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.corsOrigins.length ? env.corsOrigins : true }));
// Everything is small JSON, except a decision that carries a live selfie
// (Sales Pulse asks for one to sign a contract): those routes alone may be large.
const DECISION = /^\/api\/software\/[^/]+\/items\/[^/]+\/[^/]+$/;
const smallJson = express.json({ limit: '100kb' });
const photoJson = express.json({ limit: '8mb' });
app.use((req, res, next) => (req.method === 'POST' && DECISION.test(req.path) ? photoJson : smallJson)(req, res, next));
if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/hooks', require('./routes/hooks'));
app.use('/api/files', require('./routes/files'));
app.use('/api/software', require('./routes/software'));
app.use('/api', require('./routes/hub'));

app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'The request body is not valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'That is too large to send.' });
  console.error(err);
  return res.status(500).json({ message: 'Something went wrong on the server.' });
});

module.exports = app;
