const mongoose = require('mongoose');

// One decision the CMD made through the hub: approved, sent back, rejected …
// The source project keeps the real audit trail; this is the hub's own copy,
// so History reads the same on the phone and the website and survives a restart.
const decisionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    software: { type: String, required: true },
    // What it was called there, and enough to recognise it in a list
    ref: { type: String, required: true },
    party: { type: String, default: '' },
    amount: { type: String, default: '' },
    // 'Approved' | 'Verified' | 'Released' | 'Sent back' | 'Rejected' | 'Moved'
    verb: { type: String, required: true },
    from_stage: { type: String, default: null },
    to_stage: { type: String, default: null },
    reason: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

decisionSchema.index({ user: 1, created_at: -1 });

decisionSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    software: this.software,
    ref: this.ref,
    party: this.party,
    amount: this.amount,
    verb: this.verb,
    reason: this.reason,
    at: this.created_at,
  };
};

module.exports = mongoose.model('Decision', decisionSchema);
