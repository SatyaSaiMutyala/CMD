/**
 * @format
 */

import { AppRegistry } from 'react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Notifications that arrive while the app is closed are shown by the phone
// itself. Firebase still needs a handler registered here, before the app
// starts, for messages that carry data only.
try {
  setBackgroundMessageHandler(getMessaging(), async () => {});
} catch (e) {
  /* push is optional: the app runs without it */
}

AppRegistry.registerComponent(appName, () => App);
