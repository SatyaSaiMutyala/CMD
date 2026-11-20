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
  },
  { timestamps: true },
);

userSchema.methods.toPublic = function toPublic() {
  return { id: String(this._id), name: this.name, email: this.email, role: this.role };
};

module.exports = mongoose.model('User', userSchema);
