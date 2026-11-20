import React from 'react';
import { Modal, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { REGISTRY } from '../../data/registry';
import { useHub } from '../../store/HubProvider';
import { swPending, totalPending } from '../../store/selectors';
import { colors, ms, mvs, s, shadows } from '../../theme';
import { clockParts, weekdayDate } from '../../utils/format';
import { AppText, Button, Eyebrow, Mono, Ring } from '../common';
import { Icon } from '../icons';

/* Full-screen reminder, every 15 minutes, of what is still pending: the time,
   the count, where the approvals are, and three ways out.

   It is shown in its own window (a Modal), so it covers everything — the tab
   bar, any page or sheet that is open, and the areas behind the status bar
   and the navigation bar on Android. */
export default function ReminderOverlay() {
  const { remindOpen, store, reviewNow, snoozeReminder, dismissReminder } =
    useHub();
  const insets = useSafeAreaInsets();
  if (!remindOpen) return null;

  const now = new Date();
  const [time, half] = clockParts(now);
  const total = totalPending(store);
  let rows = REGISTRY.filter(sw => sw.connected && swPending(store, sw) > 0);
  if (!rows.length) rows = REGISTRY.filter(sw => sw.connected);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      // Android's back button dismisses it
      onRequestClose={dismissReminder}
    >
      <View style={styles.host} accessibilityViewIsModal>
        <StatusBar barStyle="dark-content" />
        <Ring
          size={240}
          width={40}
          color={colors.white}
          opacity={0.7}
          style={styles.ringThick}
        />
        <Ring size={380} color={colors.white} style={styles.ringThin} />
        <ScrollView
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + mvs(16),
              paddingBottom: insets.bottom + mvs(30),
            },
          ]}
        >
          <View style={styles.head}>
            <View style={styles.bellHalo}>
              <View style={styles.bell}>
                <Icon name="bell" size={22} stroke={2.4} color={colors.white} />
              </View>
            </View>
            <Eyebrow size={13} track={0.08} color={colors.ink}>
              PENDING REMINDER
            </Eyebrow>
          </View>

          <View style={styles.clock}>
            <View style={styles.time}>
              <AppText display size={108} lh={1} weight={800} track={-0.04}>
                {time}
              </AppText>
              <AppText display size={28} weight={700}>
                {half}
              </AppText>
            </View>
            <AppText size={16} weight={600}>
              {weekdayDate(now)}
            </AppText>
          </View>

          <View style={styles.card}>
            <View style={styles.count}>
              <AppText display size={68} lh={1} weight={800}>
                {total}
              </AppText>
              <AppText size={16} lh={1.3} weight={700} style={styles.countText}>
                {total === 1 ? 'approval is' : 'approvals are'}
                {'\n'}waiting for you
              </AppText>
            </View>
            {rows.map(sw => (
              <View key={sw.id} style={styles.row}>
                <Mono label={sw.mono} size={40} radius={13} fontSize={14} />
                <AppText size={15} weight={700} style={styles.grow}>
                  {sw.name}
                </AppText>
                <View style={styles.rowCount}>
                  <AppText size={15} weight={800}>
                    {swPending(store, sw) || 0}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Button
              variant="teal"
              height={62}
              fontSize={17}
              iconRight="chevronsRight"
              iconSize={20}
              label="Review now"
              shadow={shadows.tealButton}
              onPress={reviewNow}
            />
            <Button
              variant="white"
              weight={700}
              icon="clock"
              iconStroke={2.2}
              label="Remind me in 15 minutes"
              onPress={snoozeReminder}
            />
            <Button
              variant="text"
              height={46}
              weight={700}
              underline
              label="Dismiss"
              onPress={dismissReminder}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    backgroundColor: colors.yellow,
    overflow: 'hidden',
  },
  ringThick: { right: -s(40), top: -ms(40) },
  ringThin: { right: -s(110), top: -ms(110) },
  content: { flexGrow: 1, paddingHorizontal: s(22) },
  grow: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  bellHalo: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    backgroundColor: colors.yellowMid,
    alignItems: 'center',
    justifyContent: 'center',
    margin: -ms(8),
    marginRight: 0,
  },
  bell: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: { marginTop: mvs(40), gap: 4 },
  time: { flexDirection: 'row', alignItems: 'baseline', gap: s(6) },
  card: {
    marginTop: mvs(36),
    backgroundColor: colors.white,
    borderRadius: ms(32),
    padding: s(22),
    gap: mvs(16),
    boxShadow: shadows.reminderCard,
  },
  count: { flexDirection: 'row', alignItems: 'flex-end', gap: s(12) },
  countText: { paddingBottom: 4, flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    backgroundColor: colors.mint,
    borderRadius: ms(18),
    paddingVertical: ms(10),
    paddingHorizontal: s(14),
  },
  rowCount: {
    minWidth: ms(40),
    height: ms(30),
    borderRadius: ms(15),
    paddingHorizontal: s(10),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { marginTop: 'auto', paddingTop: mvs(28), gap: mvs(10) },
});
