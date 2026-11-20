/* Where the hub backend lives.

   LIVE is the deployed hub, used by both the Android and the iPhone app.

   To work against a backend running on this computer instead (port 5050),
   set API_URL to one of the LOCAL addresses below. Never ship a build that
   points at a local address.
     iOS simulator      http://localhost:5050
     Android emulator   http://10.0.2.2:5050
     a real phone       the computer's Wi-Fi address, e.g.
                        http://192.168.29.126:5050 (`ipconfig getifaddr en0`
                        prints the current one; same Wi-Fi as the computer) */
const LIVE = 'https://approvalhub.mytrustlab.co.in';

export const API_URL = LIVE;

// Give up on a request after this long, so a dead connection shows an error
export const REQUEST_TIMEOUT_MS = 20000;
