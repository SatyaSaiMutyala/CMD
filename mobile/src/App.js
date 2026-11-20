import React, { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  ArrivalBanner,
  ConfirmSheet,
  DetailsModal,
  ReminderOverlay,
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
  // Reading the saved session takes a moment: show the plain background meanwhile
  if (!ready) return null;
  if (!user) return <LoginScreen />;
  return (
    <HubProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
      {/* Overlays sit above every screen, in this stacking order */}
      <DetailsModal />
      <ConfirmSheet />
      <ArrivalBanner />
      <ReminderOverlay />
    </HubProvider>
  );
}

export default function App() {
  // One Redux store for the life of the app (see store/store.js)
  const [store] = useState(makeStore);
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar
            barStyle="light-content"
            translucent
            backgroundColor="transparent"
          />
          <View style={styles.root}>
            <Root />
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
});
