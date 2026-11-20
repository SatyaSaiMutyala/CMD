/* Where the hub backend lives. The calls themselves are RTK Query endpoints
   in src/store/api.js; the live socket (lib/socket.js) uses the same address. */

// Set VITE_API_URL in .env; the default is a backend running on this computer.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5050').replace(/\/+$/, '')

// Give up on a request after this long, so a dead connection shows an error
export const REQUEST_TIMEOUT_MS = 20000
