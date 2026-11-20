const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

// Who is this token? Reads the user rather than trusting the token, so a
// deactivated account stops working at once. Shared by HTTP and the socket.
const userFromToken = async (token) => {
  const payload = jwt.verify(String(token || ''), env.jwtSecret);
  if (!payload || !payload.sub) return null;
  // A document link's token (routes/files.js) opens one file and nothing else
  if (payload.typ) return null;
  const user = await User.findById(payload.sub);
  if (!user || !user.is_active) return null;
  // Issued before the password was last changed: no longer good
  if (user.password_changed_at && payload.iat * 1000 < user.password_changed_at.getTime()) return null;
  return user;
};

const requireAuth = async (req, res, next) => {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const user = await userFromToken(token);
    if (!user) return res.status(401).json({ message: 'Please sign in again.' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Please sign in again.' });
  }
};

module.exports = { requireAuth, userFromToken };
