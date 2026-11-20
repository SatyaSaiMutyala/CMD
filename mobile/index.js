/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { enableFreeze } from 'react-native-screens';
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

// A page that is not on screen (Home, while a software's list is open over
// it) stops redrawing itself until it is shown again. Otherwise every change
// in the app's data redraws all of them, visible or not.
enableFreeze(true);

AppRegistry.registerComponent(appName, () => App);
