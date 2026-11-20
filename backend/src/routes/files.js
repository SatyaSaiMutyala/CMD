// Opening an attached document.
//
//   GET /api/files/:token
//
// The token is made by POST /api/software/:software/items/:code/files/:docId/link
// for a signed-in CMD. It names exactly one document, works for two minutes,
// and is refused once the account behind it is no longer active — so the link
// can be opened in a plain browser tab without exposing anything else.
// The file is fetched from the source project with that project's key and
// passed straight through; nothing is stored here.
const express = require('express');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { findConnector } = require('../connectors');
const User = require('../models/User');

const router = express.Router();

router.get('/:token', async (req, res) => {
  let claim;
  try {
    claim = jwt.verify(String(req.params.token), env.jwtSecret);
  } catch {
    return res.status(401).type('text/plain').send('This link has expired. Open the document again from the hub.');
  }
  // A login token must never work here, and a file token never as a login
  if (!claim || claim.typ !== 'file') return res.status(401).type('text/plain').send('This link is not valid.');

  const user = await User.findById(claim.sub);
  const connector = findConnector(claim.sw);
  if (!user || !user.is_active || !connector || !connector.file) {
    return res.status(401).type('text/plain').send('This link is not valid.');
  }
  try {
    const file = await connector.file(claim.code, claim.doc);
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': file.disposition,
      'Content-Length': String(file.body.length),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
      // Lets the browser show a PDF or image in its own viewer
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; object-src 'self'",
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    return res.send(file.body);
  } catch (err) {
    if (err && err.status) return res.status(err.status).type('text/plain').send(err.message);
    console.error(err);
    return res.status(500).type('text/plain').send('Something went wrong on the server.');
  }
});

module.exports = router;
