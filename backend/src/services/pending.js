const { SOURCES } = require('../config/sources');
const SourceState = require('../models/SourceState');

// What is waiting for the CMD right now, per software and in total, from the
// counts the sources last reported.
const getPendingSummary = async () => {
  const states = await SourceState.find().lean();
  const byId = new Map(states.map((s) => [s.software, s]));
  const bySoftware = SOURCES.map((src) => {
    const state = byId.get(src.id);
    return {
      software: src.id,
      name: src.name,
      // null = this software has never reported, i.e. it is not connected yet
      pending: state ? state.pending : null,
      reportedAt: state ? state.reported_at : null,
    };
  });
  const total = bySoftware.reduce((n, s) => n + (s.pending || 0), 0);
  return { total, bySoftware };
};

const setPending = (software, pending) =>
  SourceState.findOneAndUpdate(
    { software },
    { pending: Math.max(0, Math.floor(pending)), reported_at: new Date() },
    { upsert: true, returnDocument: 'after' },
  );

module.exports = { getPendingSummary, setPending };
