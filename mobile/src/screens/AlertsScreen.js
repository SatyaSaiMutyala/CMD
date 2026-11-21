import React, { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
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
  Toggle,
} from '../components/common';
import { Icon } from '../components/icons';
import TimePicker from '../components/overlays/TimePicker';
import { ROUTES } from '../navigation/routes';
import { available, openLegacySetup } from '../services/reminderSetup';
import { useAuth } from '../store/AuthProvider';
import { useHub } from '../store/HubProvider';
import { colors, hairline, ms, mvs, s } from '../theme';
import {
  REMINDER_CHOICES,
  clockLabel,
  everyLabel,
  everyShort,
  quietStatus,
} from '../utils/quiet';
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
      <AppText
        display
        size={21}
        lh={1.15}
        weight={800}
        style={styles.androidTitle}
      >
        Reminder covers the whole screen
      </AppText>
      {available ? (
        <View style={styles.progress}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${allowed * 50}%` }]}
            />
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

/* How often the reminder comes: one tap for the usual choices, or the
   stepper for anything in between. Kept on the account, so the website
   follows it too, and the server itself times the reminder by it. */
function HowOften() {
  const { store, saveReminderMinutes } = useHub();
  const { minutes, min, max } = store.reminder;
  // Five minutes at a time; an hour at a time once it is two hours or more
  const step = by => {
    const long = by > 0 ? minutes >= 120 : minutes > 120;
    const next = Math.min(max, Math.max(min, minutes + by * (long ? 60 : 5)));
    if (next !== minutes) saveReminderMinutes(next);
  };

  return (
    <Card pad={16} style={styles.dnd}>
      <View style={styles.dndHead}>
        <View style={styles.dndIcon}>
          <Icon name="clock" size={21} stroke={2.2} />
        </View>
        <View style={styles.grow}>
          <AppText size={16} weight={800}>
            How often
          </AppText>
          <AppText size={12.5} lh={1.4} color={colors.muted}>
            A reminder every {everyLabel(minutes)}, while approvals wait
          </AppText>
        </View>
      </View>

      <View style={styles.choices}>
        {REMINDER_CHOICES.map(choice => {
          const on = choice === minutes;
          return (
            <Pressable
              key={choice}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Every ${everyLabel(choice)}`}
              onPress={() => (on ? null : saveReminderMinutes(choice))}
              style={({ pressed }) => [
                styles.choice,
                on ? styles.choiceOn : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <AppText
                size={13}
                weight={800}
                color={on ? colors.white : colors.ink}
              >
                {everyShort(choice)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Less often"
          disabled={minutes >= max}
          hitSlop={6}
          onPress={() => step(1)}
          style={({ pressed }) => [
            styles.stepButton,
            minutes >= max ? styles.timeOff : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <AppText display size={22} weight={800}>
            +
          </AppText>
        </Pressable>
        <View style={styles.stepValue}>
          <Eyebrow size={11} track={0.07}>
            EVERY
          </Eyebrow>
          <AppText display size={22} weight={800}>
            {everyShort(minutes)}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More often"
          disabled={minutes <= min}
          hitSlop={6}
          onPress={() => step(-1)}
          style={({ pressed }) => [
            styles.stepButton,
            minutes <= min ? styles.timeOff : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <AppText display size={22} weight={800}>
            −
          </AppText>
        </Pressable>
      </View>
    </Card>
  );
}

/* Do not disturb for the reminder: pause it now, and set the hours
   it keeps quiet every day. Kept on the account, so it is the same on the
   website, and the server itself holds the reminder back. */
function DoNotDisturb() {
  const { store, saveDnd } = useHub();
  const { dnd } = store;
  // which end of the quiet hours is being set: 'from' | 'to' | null
  const [setting, setSetting] = useState(null);
  const [quiet, status] = quietStatus(dnd);

  const time = (which, label) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${clockLabel(dnd[which])}, change`}
      accessibilityState={{ disabled: !dnd.daily }}
      disabled={!dnd.daily}
      onPress={() => setSetting(which)}
      style={({ pressed }) => [
        styles.time,
        dnd.daily ? null : styles.timeOff,
        pressed ? styles.pressed : null,
      ]}
    >
      <Eyebrow size={11} track={0.07}>
        {label}
      </Eyebrow>
      <AppText display size={20} weight={800}>
        {clockLabel(dnd[which])}
      </AppText>
    </Pressable>
  );

  return (
    <Card pad={16} style={styles.dnd}>
      <View style={styles.dndHead}>
        <View style={[styles.dndIcon, quiet ? styles.dndIconOn : null]}>
          <Icon name="moon" size={21} stroke={2.2} />
        </View>
        <View style={styles.grow}>
          <AppText size={16} weight={800}>
            Do not disturb
          </AppText>
          <AppText size={12.5} lh={1.4} color={colors.muted}>
            {status}
          </AppText>
        </View>
      </View>

      <View style={styles.dndRow}>
        <View style={styles.grow}>
          <AppText size={14} weight={800}>
            Do not disturb now
          </AppText>
          <AppText size={12} lh={1.35} color={colors.muted}>
            Pauses the reminder on every device until you turn it off
          </AppText>
        </View>
        <Toggle
          value={!!dnd.on}
          label="Do not disturb now"
          onChange={() => saveDnd({ on: !dnd.on })}
        />
      </View>

      <View style={styles.dndRow}>
        <View style={styles.grow}>
          <AppText size={14} weight={800}>
            Quiet hours every day
          </AppText>
          <AppText size={12} lh={1.35} color={colors.muted}>
            No reminder between these times. Tap a time to change it.
          </AppText>
        </View>
        <Toggle
          value={!!dnd.daily}
          label="Quiet hours every day"
          onChange={() => saveDnd({ daily: !dnd.daily })}
        />
      </View>
      <View style={styles.times}>
        {time('from', 'FROM')}
        <Icon name="arrowRight" size={18} stroke={2.4} color={colors.muted} />
        {time('to', 'TO')}
      </View>
      <AppText size={12} lh={1.4} color={colors.muted}>
        Only the reminder is paused. A new approval still notifies you the
        moment it arrives.
      </AppText>

      <TimePicker
        open={!!setting}
        value={setting ? dnd[setting] : '00:00'}
        title={setting === 'to' ? 'QUIET UNTIL' : 'QUIET FROM'}
        onClose={() => setSetting(null)}
        onDone={value => {
          saveDnd({ [setting]: value });
          setSetting(null);
        }}
      />
    </Card>
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
        backdrop={
          <Disc size={380} color={colors.yellowSoft} style={styles.disc} />
        }
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
            title={`Reminder every ${everyShort(store.reminder.minutes)}`}
            text="This phone only · skipped when nothing is pending"
            value={!!settings.hourly}
            onChange={() => toggleSetting('hourly')}
          />
        </View>

        <HowOften />

        <DoNotDisturb />

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
              <AppText
                size={13}
                weight={600}
                color={colors.muted}
                numberOfLines={1}
              >
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

  grow: { flex: 1 },
  pressed: { opacity: 0.7 },
  dnd: { gap: mvs(14) },
  dndHead: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  dndIcon: {
    width: ms(46),
    height: ms(46),
    borderRadius: ms(23),
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // quiet right now
  dndIconOn: { backgroundColor: colors.yellow },
  dndRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    paddingTop: mvs(12),
    borderTopWidth: hairline,
    borderTopColor: colors.line,
  },
  times: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  time: {
    flex: 1,
    borderRadius: ms(18),
    backgroundColor: colors.mint,
    paddingVertical: mvs(10),
    paddingHorizontal: s(14),
    gap: 2,
  },
  timeOff: { opacity: 0.45 },

  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8) },
  choice: {
    minWidth: ms(62),
    height: ms(40),
    borderRadius: ms(20),
    paddingHorizontal: s(14),
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceOn: { backgroundColor: colors.teal },
  stepper: { flexDirection: 'row-reverse', alignItems: 'center', gap: s(10) },
  stepButton: {
    width: ms(52),
    height: ms(52),
    borderRadius: ms(26),
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    flex: 1,
    alignItems: 'center',
    borderRadius: ms(18),
    borderWidth: hairline,
    borderColor: colors.line,
    paddingVertical: mvs(8),
    gap: 2,
  },

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
