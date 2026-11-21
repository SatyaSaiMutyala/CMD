const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const User = require('../models/User');
const { requireAuth, refuseViewOnly } = require('../middleware/requireAuth');

const router = express.Router();

// Slows down guessing: 10 attempts per 15 minutes from one address, counted
// separately for signing in and for changing the password.
const limiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Try again in a few minutes.' },
  });
const loginLimiter = limiter();
const changeLimiter = limiter();

const MIN_PASSWORD = 8;

const issueToken = (user) => jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const passwordProblem = (password) => {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > 200) return 'That password is too long.';
  return null;
};

// Saves the new password and signs every other device out: tokens issued
// before this moment stop working (see middleware/requireAuth.js).
const setPassword = async (user, password) => {
  user.password_hash = await bcrypt.hash(password, 12);
  // Token times are whole seconds; a second back keeps the token issued next valid
  user.password_changed_at = new Date(Date.now() - 1000);
  await user.save();
};

// POST /api/auth/login  { email, password }  ->  { token, user }
router.post('/login', loginLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ message: 'Enter your email and password.' });

  const user = await User.findOne({ email }).select('+password_hash');
  // One message for "no such user" and "wrong password", so neither is revealed
  const ok = user && user.is_active && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return res.status(401).json({ message: 'Wrong email or password.' });

  return res.json({ token: issueToken(user), user: user.toPublic() });
});

// GET /api/auth/me  ->  { user }   (restores a remembered session)
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

// POST /api/auth/change-password  { next, current? }  ->  { token, user }
// Being signed in is enough: the website asks only for the new password.
// `current` is optional — when it is sent (the phone app does) it must be right.
// The answer carries a fresh token for this device; every other device is signed out.
// (Not for a view-only account: whoever was handed that sign-in must not be
// able to lock everyone else out of it.)
router.post('/change-password', changeLimiter, requireAuth, refuseViewOnly, async (req, res) => {
  const current = req.body?.current === undefined || req.body?.current === null ? null : String(req.body.current);
  const next = String(req.body?.next || '');
  const user = await User.findById(req.user._id).select('+password_hash');
  if (current !== null && !(await bcrypt.compare(current, user.password_hash))) {
    return res.status(400).json({ message: 'Your current password is not right.' });
  }
  const problem = passwordProblem(next);
  if (problem) return res.status(400).json({ message: problem });
  if (await bcrypt.compare(next, user.password_hash)) {
    return res.status(400).json({ message: 'Choose a password different from the current one.' });
  }

  await setPassword(user, next);
  return res.json({ token: issueToken(user), user: user.toPublic() });
});

module.exports = router;
