const mongoose = require('mongoose');

// A log of what the hub announced: new approvals and the 15-minute reminders.
// The apps read it to catch up on anything that arrived while they were offline,
// and show it as the CMD's list of notifications.
const notificationSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['arrival', 'reminder'], required: true },
    software: { type: String, default: null }, // source id; null for a reminder
    stage: { type: String, default: null },
    ref: { type: String, default: null }, // the source's own reference, e.g. ADS-2026-1317
    title: { type: String, required: true },
    body: { type: String, default: '' },
    // The CMD has seen it (opened it, or "mark all as read")
    read_at: { type: Date, default: null },
    // The CMD removed it from the list. The record itself is kept: "delete"
    // in the apps only takes it out of what they are shown.
    cleared_at: { type: Date, default: null },
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
    read: !!this.read_at,
    at: this.created_at,
  };
};

module.exports = mongoose.model('Notification', notificationSchema);
