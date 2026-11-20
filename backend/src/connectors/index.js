// One connector per source project that the hub can read and action.
// Adding a project = adding its file here; the routes do not change.
const ledgertrace = require('./ledgertrace');

const CONNECTORS = { [ledgertrace.id]: ledgertrace };

const findConnector = (id) => CONNECTORS[String(id || '').toLowerCase()] || null;

module.exports = { findConnector };
