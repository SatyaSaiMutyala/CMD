const mongoose = require('mongoose');

// The last pending count each source told us about. This is what the reminder
// uses to decide whether anything is waiting, without calling every project
// every 15 minutes. Sources send the count with each webhook call.
const sourceStateSchema = new mongoose.Schema(
  {
    software: { type: String, required: true, unique: true },
    pending: { type: Number, default: 0, min: 0 },
    reported_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SourceState', sourceStateSchema);
