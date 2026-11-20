const crypto = require('crypto');

// Compare two secrets without leaking, through timing, how much of one matched.
const safeEqual = (given, expected) => {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(expected || ''));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = { safeEqual };
