import React, { useCallback, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  ArrivalBanner,
  ConfirmSheet,
  DetailsModal,
  ForceUpdateDialog,
  NetworkPopup,
  ReminderOverlay,
  SplashScreen,
} from './components/overlays';
import { navigationRef } from './navigation/navigationRef';
import RootNavigator from './navigation/RootNavigator';
import LoginScreen from './screens/LoginScreen';
import { AuthProvider, useAuth } from './store/AuthProvider';
import { HubProvider } from './store/HubProvider';
import { makeStore } from './store/store';
import { colors } from './theme';

/* Starting: nothing yet. Signed out: the login screen. Signed in: the hub, its screens and overlays. */
function Root() {
  const { user, ready } = useAuth();
  // Reading the saved session takes a moment: the opening screen covers it
  if (!ready) return null;
  if (!user) return <LoginScreen />;
  return (
    <HubProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
      {/* Overlays sit above every screen, in this stacking order: the confirm
          sheet can open over the details page */}
      <DetailsModal />
      <ConfirmSheet />
      <ArrivalBanner />
      <ReminderOverlay />
    </HubProvider>
  );
}

/* The animated opening screen, over the app until it has played and the
   saved sign-in has been read */
function Opening() {
  const { ready } = useAuth();
  const [gone, setGone] = useState(false);
  const done = useCallback(() => setGone(true), []);
  return gone ? null : <SplashScreen ready={ready} onDone={done} />;
}

export default function App() {
  // One Redux store for the life of the app (see store/store.js)
  const [store] = useState(makeStore);
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AuthProvider>
          {/* Pages are white: dark status-bar text unless a page says otherwise */}
          <StatusBar
            barStyle="dark-content"
            translucent
            backgroundColor="transparent"
          />
          <View style={styles.root}>
            <Root />
            {/* Watches the connection on every screen, signed in or not */}
            <NetworkPopup />
            <Opening />
            {/* Its own window, so it is above the opening screen too */}
            <ForceUpdateDialog />
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
});
