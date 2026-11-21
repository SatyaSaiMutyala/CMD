// One connector per source project that the hub can read and action.
// Adding a project = adding its file here; the routes do not change.
const ledgertrace = require('./ledgertrace');
const edos = require('./edos');
const aims = require('./aims');
const sp365 = require('./sp365');
const prism = require('./prism');

const CONNECTORS = { [ledgertrace.id]: ledgertrace, [edos.id]: edos, [aims.id]: aims, [sp365.id]: sp365, [prism.id]: prism };

const findConnector = (id) => CONNECTORS[String(id || '').toLowerCase()] || null;

module.exports = { findConnector };
