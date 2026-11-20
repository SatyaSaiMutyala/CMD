import { Platform } from 'react-native';

/* Where the hub backend lives.
   DEVELOPMENT: the backend runs on this computer on port 5050. The iOS
   simulator reaches it as localhost; the Android emulator reaches the same
   computer as 10.0.2.2. A real phone needs the computer's Wi-Fi address, or
   the hosted URL once the backend is deployed — change it here, in one place. */
export const API_URL = Platform.select({
  android: 'http://10.0.2.2:5050',
  default: 'http://localhost:5050',
});

// Give up on a request after this long, so a dead connection shows an error
export const REQUEST_TIMEOUT_MS = 20000;
