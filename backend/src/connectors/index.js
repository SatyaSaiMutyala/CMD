// One connector per source project that the hub can read and action.
// Adding a project = adding its file here; the routes do not change.
const ledgertrace = require('./ledgertrace');
const edos = require('./edos');
const aims = require('./aims');

const CONNECTORS = { [ledgertrace.id]: ledgertrace, [edos.id]: edos, [aims.id]: aims };

const findConnector = (id) => CONNECTORS[String(id || '').toLowerCase()] || null;

module.exports = { findConnector };
