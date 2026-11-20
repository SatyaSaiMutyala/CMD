const mongoose = require('mongoose');

// One phone or browser that should receive push notifications.
//   android / ios : `token` is the Firebase Cloud Messaging token
//   web           : `subscription` is the browser's Web Push subscription;
//                   `token` holds its endpoint so every device has one unique key
const deviceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: ['android', 'ios', 'web'], required: true },
    token: { type: String, required: true, unique: true },
    subscription: { type: Object, default: null },
    // The "reminder every 15 minutes" switch on this device. Off = the reminder
    // is not sent here; new-approval notifications still are.
    reminders: { type: Boolean, default: true },
    last_seen_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Device', deviceSchema);
