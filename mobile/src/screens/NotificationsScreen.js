import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Button,
  CircleButton,
  Disc,
  EmptyState,
  Mono,
  Notice,
  Screen,
  ScreenHeader,
} from '../components/common';
import { Icon } from '../components/icons';
import { NotificationsSkeleton } from '../components/approvals';
import { findSoftware } from '../data/registry';
import { ROUTES } from '../navigation/routes';
import { useHub } from '../store/HubProvider';
import { colors, gutter, hairline, ms, mvs, s, shadows } from '../theme';
import { clockUpper, dayLabel } from '../utils/format';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'arrival', label: 'New approvals' },
  { key: 'reminder', label: 'Reminders' },
];

/* One notification: its mark, what it said, when, and a button that deletes
   it. A new approval opens the software it is about. `fresh` = unread. */
function Row({ note, fresh, onPress, onDelete }) {
  const arrival = note.kind === 'arrival';
  const sw = note.swId ? findSoftware(note.swId) : null;
  // "New approval · ₹7,662": the amount is picked out in yellow
  const [lead, ...rest] = note.title.split(' · ');
  const amount = rest.find(part => part.startsWith('₹'));
  const body = (
    <>
      {arrival ? (
        <Mono label={sw ? sw.mono : '•'} size={46} radius={23} fontSize={15} />
      ) : (
        <View style={styles.bell}>
          <Icon name="bell" size={21} stroke={2.2} color={colors.teal} />
        </View>
      )}
      <View style={styles.copy}>
        <View style={styles.top}>
          <View style={styles.title}>
            <AppText
              size={14.5}
              weight={800}
              numberOfLines={1}
              style={styles.shrink}
            >
              {amount ? `${lead} · ` : note.title}
            </AppText>
            {amount ? (
              <View style={styles.amount}>
                <AppText size={14.5} weight={800} color={colors.white}>
                  {amount}
                </AppText>
              </View>
            ) : null}
          </View>
          {fresh ? <View style={styles.dot} /> : null}
          <AppText size={11.5} weight={700} color={colors.muted}>
            {clockUpper(note.ts)}
          </AppText>
        </View>
        {note.body ? (
          <AppText size={12.5} lh={1.4} color={colors.muted} numberOfLines={2}>
            {note.body}
          </AppText>
        ) : null}
      </View>
    </>
  );
  // Two buttons side by side: the notification itself, and its delete
  return (
    <View style={[styles.row, fresh ? styles.rowFresh : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${fresh ? 'Unread. ' : ''}${note.title}. ${
          note.body
        }`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.rowMain,
          pressed ? styles.pressed : null,
        ]}
      >
        {body}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete notification: ${note.title}`}
        onPress={onDelete}
        hitSlop={8}
        style={({ pressed }) => [
          styles.delete,
          pressed ? styles.pressed : null,
        ]}
      >
        <Icon name="trash" size={18} stroke={2} color={colors.muted} />
      </Pressable>
    </View>
  );
}

/* One line of the drop-down menu */
function Choice({ icon, title, disabled, onPress }) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        pressed ? styles.choicePressed : null,
        disabled ? styles.choiceOff : null,
      ]}
    >
      <Icon name={icon} size={18} stroke={2.2} />
      <AppText size={14.5} weight={700}>
        {title}
      </AppText>
    </Pressable>
  );
}

/* The drop-down under the three dots: a small white card at the top right
   with what can be done to the whole list. A tap anywhere else closes it. */
function MoreMenu({ visible, unread, onClose, onReadAll, onDeleteAll }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.menuHost}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        {/* Just under the three dots it opens from */}
        <View
          accessibilityRole="menu"
          style={[styles.menu, { top: insets.top + mvs(6) + ms(52) }]}
        >
          <Choice
            icon="check"
            title="Mark all as read"
            disabled={!unread}
            onPress={onReadAll}
          />
          <View style={styles.menuLine} />
          <Choice icon="trash" title="Delete all" onPress={onDeleteAll} />
        </View>
      </View>
    </Modal>
  );
}

/* Everything the hub announced — new approvals as they arrived and the
   15-minute reminders — newest first, one heading per day. Reached from the
   bell on the home page.

   Unread ones are tinted; opening one reads it. Each can be deleted. The
   three dots at the top open a drop-down with "Mark all as read" and "Delete
   all" (which asks first). The list comes a page
   at a time: the next page loads as the bottom is reached. */
export default function NotificationsScreen({ navigation }) {
  const hub = useHub();
  const { store } = hub;
  const [filter, setFilter] = useState('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  // One "next page" request at a time
  const busy = useRef(false);

  // The page opens at once, as shimmering rows, and asks for the list; the
  // real rows replace them when the answer is in
  const [fetching, setFetching] = useState(true);
  const { reloadNotifications } = hub;
  useFocusEffect(
    useCallback(() => {
      let live = true;
      const began = Date.now();
      setFetching(true);
      Promise.resolve(reloadNotifications())
        .catch(() => {})
        .then(() => {
          const wait = Math.max(350 - (Date.now() - began), 0);
          setTimeout(() => live && setFetching(false), wait);
        });
      return () => {
        live = false;
      };
    }, [reloadNotifications]),
  );

  const loadMore = async () => {
    if (busy.current || !store.notificationsMore) return;
    busy.current = true;
    setLoadingMore(true);
    await hub.moreNotifications();
    busy.current = false;
    setLoadingMore(false);
  };

  // A change the server refused is put back by the store; say so here
  const attempt = async (action, what) => {
    setFailed(null);
    if (!(await action()))
      setFailed(`Couldn't ${what}. Check your connection and try again.`);
  };

  const deleteAll = () =>
    Alert.alert(
      'Delete all notifications?',
      'Your list is emptied on every phone and browser you use. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () =>
            attempt(hub.deleteAllNotifications, 'delete the notifications'),
        },
      ],
    );

  const open = (note, sw) => {
    if (!note.read) hub.readNotification(note.id);
    if (sw) {
      navigation.navigate(ROUTES.software, { swId: sw.id, view: 'list' });
    }
  };

  const shown = store.notifications.filter(
    note => filter === 'all' || note.kind === filter,
  );
  const days = [];
  shown.forEach(note => {
    const label = dayLabel(note.ts);
    const day = days[days.length - 1];
    if (day && day.label === label) day.notes.push(note);
    else days.push({ label, notes: [note] });
  });
  const unread = store.unread;
  const any = store.notifications.length > 0;

  return (
    <Screen
      top={6}
      // Near the bottom: fetch the next page
      scrollEventThrottle={200}
      onScroll={({ nativeEvent: e }) => {
        const left =
          e.contentSize.height - e.layoutMeasurement.height - e.contentOffset.y;
        if (left < 400) loadMore();
      }}
      // A page of its own, over the tabs: no tab bar under it
      tabBar={false}
      backdrop={<Disc size={380} color={colors.mint} style={styles.disc} />}
    >
      <ScreenHeader
        onBack={() => navigation.goBack()}
        backLabel="Back to home"
        title="Notifications"
        sub={unread ? `${unread} unread` : 'What the hub has told you'}
        right={
          any ? (
            <CircleButton
              icon="more"
              stroke={3}
              label="More: mark all as read, delete all"
              onPress={() => setMoreOpen(true)}
            />
          ) : null
        }
      />
      <MoreMenu
        visible={moreOpen}
        unread={unread}
        onClose={() => setMoreOpen(false)}
        onReadAll={() => {
          setMoreOpen(false);
          attempt(hub.readAllNotifications, 'mark them as read');
        }}
        onDeleteAll={() => {
          setMoreOpen(false);
          // After the menu has gone: two windows at once confuse iPhone
          setTimeout(deleteAll, 350);
        }}
      />
      <ScrollView
        horizontal
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        style={styles.chipScroll}
        contentContainerStyle={styles.chips}
      >
        {FILTERS.map(({ key, label }) => {
          const on = key === filter;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(key)}
              style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
            >
              <AppText
                size={13}
                weight={on ? 800 : 700}
                color={on ? colors.white : colors.ink}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {failed ? (
        <Notice
          tone="info"
          icon="wifiOff"
          text={failed}
          onDismiss={() => setFailed(null)}
        />
      ) : null}

      {fetching ? (
        <NotificationsSkeleton />
      ) : days.length ? (
        days.map(day => (
          <View key={day.label} style={styles.day}>
            <AppText
              display
              size={18}
              weight={800}
              accessibilityRole="header"
              style={styles.dayHead}
            >
              {day.label}
            </AppText>
            {day.notes.map(note => {
              const sw = note.swId ? findSoftware(note.swId) : null;
              return (
                <Row
                  key={note.id}
                  note={note}
                  fresh={!note.read}
                  onPress={() => open(note, sw)}
                  onDelete={() =>
                    attempt(
                      () => hub.deleteNotification(note.id),
                      'delete that notification',
                    )
                  }
                />
              );
            })}
          </View>
        ))
      ) : (
        <EmptyState
          title={any ? 'Nothing of this kind' : 'Nothing yet'}
          text="New approvals and the 15-minute reminders are listed here as they come in."
          style={styles.empty}
        />
      )}

      {/* The end of what is loaded: more on the way, more to fetch, or all */}
      {any && !fetching ? (
        loadingMore ? (
          <View style={styles.foot}>
            <Icon name="spinner" size={16} stroke={2.8} color={colors.teal} />
            <AppText size={12.5} weight={700} color={colors.muted}>
              Loading more…
            </AppText>
          </View>
        ) : store.notificationsMore ? (
          <Button
            variant="mint"
            height={46}
            fontSize={13.5}
            label="Load more"
            onPress={loadMore}
          />
        ) : (
          <View style={styles.foot}>
            <AppText size={12.5} weight={600} color={colors.muted}>
              That is everything
            </AppText>
          </View>
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  disc: { right: -s(150), top: -ms(170) },
  shrink: { flexShrink: 1 },
  pressed: { opacity: 0.8 },
  chipScroll: { flexGrow: 0, marginHorizontal: -gutter },
  chips: { gap: s(8), paddingHorizontal: gutter },
  chip: {
    height: ms(38),
    borderRadius: ms(19),
    paddingHorizontal: s(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.teal },
  chipOff: {
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
  },
  // Rows run the full width of the screen, one under the other with only a
  // line between them
  day: { marginHorizontal: -gutter },
  dayHead: {
    marginTop: mvs(6),
    marginBottom: mvs(8),
    marginHorizontal: gutter + s(4),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopWidth: hairline,
    borderTopColor: colors.line,
    paddingRight: gutter - s(6),
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    paddingVertical: ms(14),
    paddingLeft: gutter,
    paddingRight: s(6),
  },
  delete: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuHost: { flex: 1 },
  menu: {
    position: 'absolute',
    right: gutter,
    minWidth: s(210),
    backgroundColor: colors.white,
    borderRadius: ms(20),
    borderWidth: hairline,
    borderColor: colors.line,
    paddingVertical: ms(6),
    boxShadow: shadows.deck,
  },
  menuLine: { height: hairline, backgroundColor: colors.line },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    paddingVertical: ms(14),
    paddingHorizontal: s(16),
  },
  choicePressed: { backgroundColor: colors.mint },
  choiceOff: { opacity: 0.4 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    paddingVertical: mvs(10),
  },
  // Unread: tinted teal
  rowFresh: { backgroundColor: colors.mint },
  bell: {
    width: ms(46),
    height: ms(46),
    borderRadius: ms(23),
    backgroundColor: colors.mintMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: ms(9),
    height: ms(9),
    borderRadius: ms(5),
    backgroundColor: colors.teal,
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  top: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  title: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  amount: {
    paddingVertical: 1,
    paddingHorizontal: ms(7),
    borderRadius: ms(8),
    backgroundColor: colors.teal,
  },
  empty: { marginTop: mvs(40) },
});
