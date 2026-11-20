import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AlertsScreen from '../screens/AlertsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReminderSetupScreen from '../screens/ReminderSetupScreen';
import SoftwareScreen from '../screens/SoftwareScreen';
import { colors } from '../theme';
import { ROUTES } from './routes';
import TabBar from './TabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const renderTabBar = props => <TabBar {...props} />;

// The Approvals tab: the home page, with one software's approvals on top of it
function ApprovalsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.ground },
      }}
    >
      <Stack.Screen name={ROUTES.home} component={HomeScreen} />
      <Stack.Screen
        name={ROUTES.notifications}
        component={NotificationsScreen}
      />
      <Stack.Screen
        name={ROUTES.software}
        component={SoftwareScreen}
        getId={({ params }) => params.swId}
        // No "swipe from the edge to go back" on iPhone: on this page a swipe
        // to the right means approve. The round back button goes back.
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      // Back from the reminder setup returns to Alerts, where it was opened
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.ground },
      }}
    >
      <Tab.Screen name={ROUTES.approvals} component={ApprovalsStack} />
      <Tab.Screen name={ROUTES.history} component={HistoryScreen} />
      <Tab.Screen name={ROUTES.alerts} component={AlertsScreen} />
      <Tab.Screen
        name={ROUTES.reminderSetup}
        component={ReminderSetupScreen}
      />
    </Tab.Navigator>
  );
}
