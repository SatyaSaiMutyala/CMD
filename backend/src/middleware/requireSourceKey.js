const { findSource, hookKey } = require('../config/sources');
const { safeEqual } = require('../utils/safeEqual');

// Server-to-server guard for the webhook: the caller is one of our own
// projects, trusted by its key alone (X-Api-Key). No user, no JWT — which is
// why these keys must never reach a browser or the mobile app.
const requireSourceKey = (req, res, next) => {
  const source = findSource(req.params.software);
  // The same answer for an unknown source and a wrong key, so a probe learns nothing.
  if (!source || !safeEqual(req.get('x-api-key'), hookKey(source.id))) {
    return res.status(401).json({ message: 'Not allowed.' });
  }
  req.source = source;
  return next();
};

module.exports = { requireSourceKey };
