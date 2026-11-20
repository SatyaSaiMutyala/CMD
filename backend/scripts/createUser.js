// Create the CMD's sign-in, or reset its password.
//
//   npm run user:create -- --email cmd@trustlab.in --name "Full Name" --password "a-strong-password"
//
// Run it again with the same email to change the name or password.
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const { connectDb, disconnectDb } = require('../src/config/db');
const User = require('../src/models/User');

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : '';
};

(async () => {
  const email = String(arg('email') || '').trim().toLowerCase();
  const name = String(arg('name') || '').trim();
  const password = String(arg('password') || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || !name || password.length < 8) {
    console.error('Usage: npm run user:create -- --email <email> --name "<name>" --password "<8+ characters>"');
    process.exit(1);
  }
  await connectDb(env.mongoUri);
  const password_hash = await bcrypt.hash(password, 12);
  const user = await User.findOneAndUpdate(
    { email },
    { name, email, password_hash, is_active: true },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  console.log(`User ready: ${user.name} <${user.email}>`);
  await disconnectDb();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
