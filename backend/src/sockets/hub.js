// Socket.IO hub for the apps' live updates.
//
// One namespace, `/hub`, and one room, `cmd`. An app connects, sends its JWT
// in `hub:subscribe`, and joins the room only if that token belongs to an
// active user — the room is decided here, never by the client.
//
// Three events go out:
//   hub:changed   { software, stage, at }      something moved; refetch that software
//   hub:arrival   { ...notification }          a new approval: chime + snackbar
//   hub:reminder  { total, bySoftware, at }    the 15-minute reminder: full screen
//
// `hub:changed` carries no rows on purpose. The apps refetch over the ordinary
// REST routes, so every access rule stays in one place.
//
// ⚠ Running more than one server process needs @socket.io/redis-adapter, or a
// broadcast only reaches the apps attached to the same process.
const { Server } = require('socket.io');
const env = require('../config/env');
const { userFromToken } = require('../middleware/requireAuth');

const ROOM = 'cmd';
let hub = null;

const initHub = (httpServer) => {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: env.corsOrigins.length ? env.corsOrigins : true },
  });
  hub = io.of('/hub');

  hub.on('connection', (socket) => {
    // Re-sent by the app on every connect: after a reconnect the server has
    // no memory of it.
    socket.on('hub:subscribe', async ({ token } = {}) => {
      try {
        const user = await userFromToken(token);
        if (!user) return; // silent — an invalid token learns nothing
        socket.join(ROOM);
        socket.emit('hub:subscribed', { user: user.toPublic() });
      } catch {
        /* invalid or expired token */
      }
    });
    socket.on('hub:unsubscribe', () => socket.leave(ROOM));
  });

  console.log('[hub] Socket.IO namespace /hub attached at /socket.io');
  return io;
};

// Push an event to every signed-in app. Safe to call before the hub is up.
// Returns how many sockets were listening.
const emitToApps = (event, payload) => {
  if (!hub) return 0;
  hub.to(ROOM).emit(event, payload);
  const room = hub.adapter.rooms.get(ROOM);
  return room ? room.size : 0;
};

module.exports = { initHub, emitToApps };
