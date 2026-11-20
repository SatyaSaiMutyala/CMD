import React, { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Eyebrow,
  Pill,
  ScreenHeader,
  SettingRow,
  Toggle,
  Screen,
} from '../components/common';
import { PasswordModal } from '../components/overlays';
import { useAuth } from '../store/AuthProvider';
import { useHub } from '../store/HubProvider';
import { colors, gutter, mvs, s } from '../theme';

/* How the hub gets the user's attention, plus two "try it" actions */
export default function AlertsScreen() {
  const {
    store,
    push,
    enablePush,
    toggleSetting,
    previewArrival,
    previewReminder,
  } = useHub();
  const { settings } = store;
  const { user, logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <Screen>
      <ScreenHeader title="Alerts" sub="How the hub gets your attention" />
      <View style={styles.list}>
        <SettingRow
          title="Sound on new approval"
          text="A sound plays the moment a new approval arrives while the app is open."
        >
          <Toggle
            value={!!settings.sound}
            label="Chime on new approval"
            onChange={() => toggleSetting('sound')}
          />
        </SettingRow>
        <SettingRow
          title="Reminder every 15 minutes"
          text="Every 15 minutes this phone reminds you of what is pending, also when the app is closed. Skipped when nothing is pending."
        >
          <Toggle
            value={!!settings.hourly}
            label="Reminder every 15 minutes"
            onChange={() => toggleSetting('hourly')}
          />
        </SettingRow>
        <SettingRow
          title="Phone notifications"
          text="Notifies you with sound when the app is closed or in the background."
        >
          {push === 'on' ? (
            <Pill tone="ok" label="On" />
          ) : push === 'blocked' ? (
            <Pill tone="bad" label="Blocked" />
          ) : (
            <Button size="mini" label="Turn on" onPress={enablePush} />
          )}
        </SettingRow>
        <AppText size={12.5} lh={1.5} color={colors.muted} style={styles.hint}>
          {push === 'blocked'
            ? 'Notifications are blocked for this app. Allow them in the phone settings: Settings → Notifications → CMD Approval Hub.'
            : 'With notifications on, new approvals and the 15-minute reminder reach you even when the app is closed.'}
        </AppText>

        {Platform.OS === 'android' ? (
          <SettingRow
            title="Reminder covers the whole screen"
            text="Lets the 15-minute reminder open over the lock screen and over other apps. Needs two permissions."
          >
            <Button
              size="mini"
              variant="ghost"
              label="Set up"
              onPress={() =>
                Linking.sendIntent('com.app.approvalhub.REMINDER_SETUP').catch(
                  () => {},
                )
              }
            />
          </SettingRow>
        ) : null}

        <Eyebrow style={styles.tryIt}>TRY IT</Eyebrow>
        <SettingRow
          title="Preview a new-approval alert"
          text="Shows the banner a real arrival shows. Nothing is changed."
        >
          <Button size="mini" label="Preview" onPress={previewArrival} />
        </SettingRow>
        <SettingRow
          title="Preview the reminder"
          text="Shows the full-screen reminder now."
        >
          <Button
            size="mini"
            variant="ghost"
            label="Preview"
            onPress={previewReminder}
          />
        </SettingRow>

        <Eyebrow style={styles.tryIt}>ACCOUNT</Eyebrow>
        <SettingRow title={user.name} text={user.email}>
          <Button
            size="mini"
            variant="dangerOutline"
            label="Sign out"
            onPress={logout}
          />
        </SettingRow>
        <SettingRow
          title="Password"
          text="Change the password you sign in with."
        >
          <Button
            size="mini"
            variant="ghost"
            label="Change"
            onPress={() => setPasswordOpen(true)}
          />
        </SettingRow>
      </View>
      <PasswordModal
        visible={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: mvs(14), paddingHorizontal: gutter, paddingTop: mvs(16) },
  hint: { paddingVertical: mvs(2), paddingHorizontal: s(4) },
  tryIt: { marginTop: mvs(10) },
});
