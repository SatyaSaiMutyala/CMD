import React from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import ChangePassword from '../components/account/ChangePassword';
import {
  AppText,
  Button,
  Card,
  Disc,
  Eyebrow,
  KeyboardAvoider,
  Pill,
  Ring,
  Screen,
  ScreenHeader,
  SettingRow,
} from '../components/common';
import { Icon } from '../components/icons';
import { ROUTES } from '../navigation/routes';
import { available, openLegacySetup } from '../services/reminderSetup';
import { useAuth } from '../store/AuthProvider';
import { useHub } from '../store/HubProvider';
import { colors, ms, mvs, s } from '../theme';
import { useReminderPermissions } from './ReminderSetupScreen';

/* Android: how far the "reminder covers the whole screen" setup has got */
function FullScreenCard({ onSetUp }) {
  const { fullScreen, overApps } = useReminderPermissions();
  const allowed = (fullScreen ? 1 : 0) + (overApps ? 1 : 0);
  return (
    <View style={styles.android}>
      <Ring
        size={130}
        width={14}
        color={colors.white}
        opacity={0.7}
        style={styles.androidRing}
      />
      <Eyebrow size={11.5} track={0.08} color={colors.ink}>
        ANDROID
      </Eyebrow>
      <AppText display size={21} lh={1.15} weight={800} style={styles.androidTitle}>
        Reminder covers the whole screen
      </AppText>
      {available ? (
        <View style={styles.progress}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${allowed * 50}%` }]} />
          </View>
          <AppText size={12.5} weight={800}>
            {allowed} of 2 allowed
          </AppText>
        </View>
      ) : null}
      <Button
        variant="white"
        height={46}
        fontSize={14}
        iconRight="arrowRight"
        iconSize={16}
        iconStroke={2.6}
        label="Set up"
        onPress={onSetUp}
        style={styles.androidButton}
      />
    </View>
  );
}

/* How the hub gets the CMD's attention, two "try it" buttons, and the account:
   who is signed in, sign out, and changing the password */
export default function AlertsScreen({ navigation }) {
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

  return (
    <KeyboardAvoider style={styles.fill}>
      <Screen
        top={12}
        backdrop={<Disc size={380} color={colors.yellowSoft} style={styles.disc} />}
      >
        <ScreenHeader
          large
          title="Alerts"
          sub="How the hub gets your attention"
          style={styles.title}
        />

        <View style={styles.pair}>
          <SettingRow
            icon="sound"
            title="Sound on new approval"
            text="Plays the moment one arrives while the app is open"
            value={!!settings.sound}
            onChange={() => toggleSetting('sound')}
          />
          <SettingRow
            icon="clock"
            title="Reminder every 15 min"
            text="This phone only · skipped when nothing is pending"
            value={!!settings.hourly}
            onChange={() => toggleSetting('hourly')}
          />
        </View>

        <Card bg={colors.mint} pad={16} style={styles.push}>
          <View style={styles.pushIcon}>
            <Icon name="bell" size={21} stroke={2.2} />
          </View>
          <View style={styles.pushCopy}>
            <AppText size={15} weight={800}>
              Notifications
            </AppText>
            <AppText size={12.5} lh={1.4} color={colors.muted}>
              {push === 'blocked'
                ? 'Blocked for this app. Allow them in the phone settings.'
                : 'This phone can alert you when the app is closed'}
            </AppText>
          </View>
          {push === 'on' ? (
            <Pill
              label="On"
              icon="check"
              iconStroke={3}
              height={30}
              pad={12}
              size={12.5}
              bg={colors.teal}
              color={colors.white}
              style={styles.center}
            />
          ) : (
            <Button
              variant="yellow"
              height={38}
              fontSize={12.5}
              label={push === 'blocked' ? 'Settings' : 'Turn on'}
              onPress={
                push === 'blocked'
                  ? () => Linking.openSettings().catch(() => {})
                  : enablePush
              }
              style={styles.pushButton}
            />
          )}
        </Card>

        {Platform.OS === 'android' ? (
          <FullScreenCard
            onSetUp={() =>
              available
                ? navigation.navigate(ROUTES.reminderSetup)
                : openLegacySetup()
            }
          />
        ) : null}

        <View style={styles.block}>
          <View style={styles.blockHead}>
            <AppText display size={19} weight={800} accessibilityRole="header">
              Try it
            </AppText>
            <AppText size={12.5} weight={600} color={colors.muted}>
              Changes no data
            </AppText>
          </View>
          <View style={styles.tryRow}>
            <Button
              variant="outline"
              height={54}
              fontSize={13.5}
              icon="play"
              iconSize={17}
              label="New-approval alert"
              onPress={previewArrival}
              style={styles.try}
            />
            <Button
              variant="outline"
              height={54}
              fontSize={13.5}
              icon="play"
              iconSize={17}
              label="Reminder"
              onPress={previewReminder}
              style={styles.try}
            />
          </View>
        </View>

        <Card style={styles.account}>
          <View style={styles.who}>
            <View style={styles.avatarHalo}>
              <View style={styles.avatar}>
                <AppText display size={16} weight={800}>
                  CMD
                </AppText>
              </View>
            </View>
            <View style={styles.whoCopy}>
              <AppText size={17} weight={800} numberOfLines={1}>
                {user.name}
              </AppText>
              <AppText size={13} weight={600} color={colors.muted} numberOfLines={1}>
                {user.role}
              </AppText>
              <AppText size={13} color={colors.muted} numberOfLines={1}>
                {user.email}
              </AppText>
            </View>
          </View>
          <Button
            variant="outline"
            height={50}
            fontSize={14.5}
            icon="signOut"
            iconStroke={2.2}
            label="Sign out"
            onPress={logout}
          />
        </Card>

        <ChangePassword />
      </Screen>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignSelf: 'center' },
  disc: { right: -s(150), top: -ms(170) },
  title: { paddingBottom: mvs(6) },
  pair: { flexDirection: 'row', gap: s(12) },

  push: { flexDirection: 'row', alignItems: 'center', gap: s(14) },
  pushIcon: {
    width: ms(46),
    height: ms(46),
    borderRadius: ms(23),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushCopy: { flex: 1, gap: 2 },
  pushButton: { paddingHorizontal: s(14) },

  android: {
    overflow: 'hidden',
    backgroundColor: colors.yellow,
    borderRadius: ms(28),
    padding: s(18),
    gap: mvs(12),
  },
  androidRing: { right: -ms(30), top: -ms(30) },
  androidTitle: { maxWidth: s(250) },
  androidButton: { alignSelf: 'flex-start', paddingHorizontal: s(20) },
  progress: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  progressTrack: {
    flex: 1,
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  progressFill: { height: ms(8), backgroundColor: colors.teal },

  block: { gap: mvs(10) },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: mvs(4),
    paddingHorizontal: s(4),
  },
  tryRow: { flexDirection: 'row', gap: s(10) },
  try: { flex: 1, paddingHorizontal: s(8), gap: s(7) },

  account: { gap: mvs(14) },
  who: { flexDirection: 'row', alignItems: 'center', gap: s(14) },
  avatarHalo: {
    width: ms(68),
    height: ms(68),
    borderRadius: ms(34),
    backgroundColor: colors.yellowSoft,
    alignItems: 'center',
    justifyContent: 'center',
    margin: -ms(5),
    marginRight: 0,
  },
  avatar: {
    width: ms(58),
    height: ms(58),
    borderRadius: ms(29),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whoCopy: { flex: 1, minWidth: 0, gap: 2 },
});
