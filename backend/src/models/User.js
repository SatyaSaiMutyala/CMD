const mongoose = require('mongoose');

// The people who may sign in. Today that is one account: the CMD.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, default: 'Chairman & Managing Director' },
    is_active: { type: Boolean, default: true },
    // Login tokens issued before this moment are refused: changing the
    // password signs every other device out.
    password_changed_at: { type: Date, default: null },
    // How often the reminder comes, in minutes. Empty = the server's own
    // setting (REMINDER_MINUTES, 15). See services/quiet.js.
    reminder_minutes: { type: Number, default: null },
    // Do not disturb for the reminder: quiet now (`on`), and quiet
    // hours every day (`daily`, `from` .. `to` on the clock of `tz`). See
    // services/quiet.js, which also fills in whatever is missing here.
    dnd: {
      on: { type: Boolean, default: false },
      daily: { type: Boolean, default: false },
      from: { type: String, default: '22:00' },
      to: { type: String, default: '07:00' },
      tz: { type: String, default: 'Asia/Kolkata' },
    },
  },
  { timestamps: true },
);

userSchema.methods.toPublic = function toPublic() {
  return { id: String(this._id), name: this.name, email: this.email, role: this.role };
};

module.exports = mongoose.model('User', userSchema);
