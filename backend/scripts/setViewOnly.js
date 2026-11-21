// Make a sign-in view-only, or give it back its full access.
//
//   npm run user:view-only -- --email reviewer@example.com --on
//   npm run user:view-only -- --email reviewer@example.com --off
//   npm run user:view-only                      (lists every sign-in and what it is)
//
// A view-only account sees everything the CMD sees and can decide nothing:
// every approve, send back, reject and "move all" is refused by the server.
// Use it for the account given to an app store's reviewers.
const env = require('../src/config/env');
const { connectDb, disconnectDb } = require('../src/config/db');
const User = require('../src/models/User');

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : '';
};
const has = (name) => process.argv.includes(`--${name}`);

(async () => {
  const email = String(arg('email') || '').trim().toLowerCase();
  if (email && has('on') === has('off')) {
    console.error('Say which: --on (view-only) or --off (full access).');
    process.exit(1);
  }
  await connectDb(env.mongoUri);
  if (email) {
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`No sign-in with the email ${email}.`);
      await disconnectDb();
      process.exit(1);
    }
    user.view_only = has('on');
    await user.save();
    console.log(`${user.name} <${user.email}> is now ${user.view_only ? 'VIEW-ONLY' : 'a full sign-in'}.`);
  }
  const everyone = await User.find().sort({ email: 1 });
  console.log('\nSign-ins:');
  everyone.forEach((u) => {
    console.log(`  ${u.view_only ? 'view-only' : 'full     '}  ${u.is_active ? '' : '(inactive) '}${u.name} <${u.email}>`);
  });
  await disconnectDb();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
