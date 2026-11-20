import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  Button,
  CircleButton,
  Disc,
  Eyebrow,
  Notice,
  Pill,
} from '../components/common';
import { Icon } from '../components/icons';
import {
  openReminderSettings,
  reminderPermissions,
  tryReminder,
} from '../services/reminderSetup';
import { colors, ms, mvs, s } from '../theme';

/* One of the two permissions: allowed (teal, ticked) or not yet (dashed, with
   the button that opens its Settings page) */
function Permission({ n, icon, title, allowed, onOpen }) {
  if (allowed) {
    return (
      <View style={[styles.permission, styles.allowed]}>
        <View style={[styles.mark, styles.markAllowed]}>
          <Icon name={icon} size={22} stroke={2.2} />
        </View>
        <View style={styles.copy}>
          <Eyebrow size={11} track={0.08} color={colors.white}>
            PERMISSION {n} · ALLOWED
          </Eyebrow>
          <AppText size={15} lh={1.3} weight={800} color={colors.white}>
            {title}
          </AppText>
        </View>
        <View style={styles.tick} accessibilityLabel="Allowed">
          <Icon name="check" size={18} stroke={3} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.permission, styles.wanted]}>
      <View style={styles.row}>
        <View style={[styles.mark, styles.markWanted]}>
          <Icon name={icon} size={22} stroke={2.2} />
        </View>
        <View style={styles.copy}>
          <Eyebrow size={11} track={0.08}>
            PERMISSION {n} · NOT ALLOWED
          </Eyebrow>
          <AppText size={15} lh={1.3} weight={800}>
            {title}
          </AppText>
        </View>
      </View>
      <Button
        variant="yellow"
        height={50}
        fontSize={14.5}
        iconRight="external"
        iconSize={16}
        label="Open settings"
        onPress={onOpen}
      />
    </View>
  );
}

/* Android only: the two places where the CMD must say yes before the reminder
   may cover the whole screen, where each stands, and a way to try it.
   Returns { fullScreen, overApps } to whoever needs the count. */
export function useReminderPermissions() {
  const [status, setStatus] = useState({ fullScreen: false, overApps: false });
  const refresh = useCallback(() => {
    reminderPermissions().then(setStatus);
  }, []);
  useEffect(() => {
    refresh();
    // The answer changes in Settings, while the app is away
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);
  return status;
}

export default function ReminderSetupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { fullScreen, overApps } = useReminderPermissions();
  const [tried, setTried] = useState(false);

  return (
    <View
      style={[
        styles.page,
        {
          paddingTop: insets.top + mvs(6),
          paddingBottom: insets.bottom + mvs(28),
        },
      ]}
    >
      <StatusBar barStyle="dark-content" />
      <Disc size={340} color={colors.mint} style={styles.disc} />

      <View style={styles.top}>
        <CircleButton
          icon="back"
          label="Back to alerts"
          onPress={() => navigation.goBack()}
        />
        <Pill label="ANDROID ONLY" height={30} pad={12} bg={colors.yellow} />
      </View>

      <View style={styles.intro}>
        <AppText display size={32} lh={1.05} weight={800} accessibilityRole="header">
          Full-screen{'\n'}reminder
        </AppText>
        <AppText size={14} lh={1.5} color={colors.muted}>
          Android asks for your consent in two places before the hub can cover
          the screen with a reminder.
        </AppText>
      </View>

      <Permission
        n={1}
        icon="moon"
        title="When the phone is locked or asleep"
        allowed={fullScreen}
        onOpen={() => openReminderSettings('fullScreen')}
      />
      <Permission
        n={2}
        icon="window"
        title="While you are using another app"
        allowed={overApps}
        onOpen={() => openReminderSettings('overApps')}
      />

      <Notice
        tone="info"
        text={
          tried
            ? 'The reminder shows in 5 seconds. Lock the phone or switch to another app.'
            : fullScreen && overApps
            ? 'Both are allowed. The reminder will cover the screen.'
            : 'Until both are allowed, the reminder arrives as a normal notification with sound.'
        }
        style={styles.note}
      />

      <View style={styles.actions}>
        <Button
          variant="outlineTeal"
          icon="play"
          iconSize={15}
          label="Try it in 5 seconds"
          onPress={() => {
            tryReminder();
            setTried(true);
          }}
        />
        <Button
          variant="teal"
          height={58}
          fontSize={16}
          label="Done"
          onPress={() => navigation.goBack()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: s(18),
    gap: mvs(16),
    overflow: 'hidden',
  },
  disc: { left: -s(90), top: -ms(120) },
  top: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  intro: { gap: mvs(8), paddingTop: mvs(6), paddingHorizontal: s(4) },
  permission: { borderRadius: ms(28), padding: s(16) },
  allowed: {
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
  },
  wanted: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.teal,
    gap: mvs(14),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: s(14) },
  mark: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(25),
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllowed: { backgroundColor: colors.white },
  markWanted: { backgroundColor: colors.mint },
  copy: { flex: 1, gap: 3 },
  tick: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { backgroundColor: colors.yellowSoft },
  actions: { marginTop: 'auto', gap: mvs(10) },
});
