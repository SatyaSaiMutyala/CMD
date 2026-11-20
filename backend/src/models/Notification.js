const mongoose = require('mongoose');

// A log of what the hub announced: new approvals and the 15-minute reminders.
// The apps read it to catch up on anything that arrived while they were offline.
const notificationSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['arrival', 'reminder'], required: true },
    software: { type: String, default: null }, // source id; null for a reminder
    stage: { type: String, default: null },
    ref: { type: String, default: null }, // the source's own reference, e.g. ADS-2026-1317
    title: { type: String, required: true },
    body: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

notificationSchema.index({ created_at: -1 });

notificationSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    kind: this.kind,
    software: this.software,
    stage: this.stage,
    ref: this.ref,
    title: this.title,
    body: this.body,
    at: this.created_at,
  };
};

module.exports = mongoose.model('Notification', notificationSchema);
