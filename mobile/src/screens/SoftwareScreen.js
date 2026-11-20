import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  ApprovalItem,
  DeckSkeleton,
  ListSkeleton,
  StageTabs,
  SwipeDeck,
} from '../components/approvals';
import {
  AppText,
  Button,
  Card,
  CircleButton,
  Disc,
  EmptyState,
  Eyebrow,
  Mono,
  Notice,
  Pill,
  Screen,
  ScreenHeader,
} from '../components/common';
import { Icon } from '../components/icons';
import { findSoftware } from '../data/registry';
import { useHub } from '../store/HubProvider';
import {
  defaultStage,
  isLoaded,
  loadError,
  loadedAt,
  waitingCount,
  waitingItems,
} from '../store/selectors';
import { colors, hairline, ms, mvs, s, shadows } from '../theme';
import { clockTime } from '../utils/format';

/* ---- a software that is not connected yet ---- */

function NotConnected({ sw, onHome }) {
  const icons = sw.plannedIcons || [];
  return (
    <Screen top={6} gap={16}>
      <ScreenHeader
        onBack={onHome}
        backLabel="Back to home"
        title={sw.name}
        sub={sw.sub}
        right={
          <Pill
            label="Not connected"
            height={30}
            pad={12}
            border={colors.teal}
            dashed
          />
        }
      />
      <Card bg={colors.mint} radius={36} pad={22} style={styles.linkCard}>
        <View style={styles.linkArt}>
          <Mono
            label={sw.mono}
            fontSize={20}
            radius={20}
            style={[styles.linkTile, styles.linkLeft]}
          />
          <Mono
            label="HUB"
            fontSize={16}
            radius={20}
            bg={colors.white}
            color={colors.ink}
            style={[styles.linkTile, styles.linkRight]}
          />
          <Svg width={ms(52)} height={ms(16)} viewBox="0 0 52 16" style={styles.linkLine}>
            <Path
              d="M2 8h48"
              stroke={colors.teal}
              strokeWidth="3"
              strokeDasharray="4 6"
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.linkPlug}>
            <Icon name="plug" size={20} stroke={2.2} />
          </View>
        </View>
        <AppText display size={23} lh={1.15} weight={800} align="center">
          Approval page not{'\n'}connected yet
        </AppText>
        <AppText size={14} lh={1.55} color={colors.muted} align="center">
          Once {sw.name} is linked, its approvals land here with the same
          swipe-to-decide flow as LedgerTrace.
        </AppText>
      </Card>

      <View style={styles.planned}>
        <Eyebrow style={styles.plannedHead}>PLANNED APPROVALS</Eyebrow>
        {sw.planned.map((line, i) => (
          <View key={line} style={styles.plan}>
            <View style={styles.planIcon}>
              <Icon name={icons[i] || 'docLines'} size={19} stroke={2} />
            </View>
            <AppText size={15} weight={700} style={styles.grow}>
              {line}
            </AppText>
          </View>
        ))}
      </View>

      <Button
        variant="outlineTeal"
        icon="arrowLeft"
        label="Back to all software"
        onPress={onHome}
      />
    </Screen>
  );
}

/* ---- pieces both views share ---- */

/* Card view / list view switch in the header of the list */
function ViewSwitch({ onCards }) {
  return (
    <View accessibilityRole="tablist" style={styles.switch}>
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="Card view"
        onPress={onCards}
        style={styles.switchSide}
      >
        <Icon name="cards" size={18} stroke={2.2} color={colors.muted} />
      </Pressable>
      <View
        accessibilityRole="tab"
        accessibilityState={{ selected: true }}
        accessibilityLabel="List view"
        style={[styles.switchSide, styles.switchOn]}
      >
        <Icon name="list" size={18} stroke={2.4} color={colors.white} />
      </View>
    </View>
  );
}

/* Loading, failed to load, or nothing waiting — or null when there are
   items to show. `fetching` = the page has just been opened and its fresh
   list is on the way: the shimmering shapes show meanwhile. */
function stateOf({ store, sw, stage, count, fetching, onRetry }) {
  if (fetching) return 'loading';
  if (!isLoaded(store, sw)) {
    return loadError(store, sw) ? (
      <EmptyState
        kind="failed"
        title={`Couldn't load ${sw.name}`}
        text="The hub couldn't reach it just now. Check your connection, then try again."
        actionLabel="Try again"
        onAction={onRetry}
        style={styles.state}
      />
    ) : (
      'loading'
    );
  }
  if (!count) {
    return (
      <EmptyState
        title="All clear here"
        text={`Nothing is waiting in ${stage.label}. New items appear the moment they're sent up.`}
        style={styles.state}
      />
    );
  }
  return null;
}

/* The strips under the tabs: a failed refresh, and what the last decision did */
function Notices({ sw, store, toast, onRetry, onDismiss }) {
  const stale = isLoaded(store, sw) && loadError(store, sw);
  const at = loadedAt(store, sw);
  const show = toast && toast.swId === sw.id;
  return (
    <>
      {stale ? (
        <Notice
          tone="warn"
          text={`Couldn't refresh. Showing the list from ${
            at ? clockTime(new Date(at)) : 'earlier'
          }.`}
          actionLabel="Try again"
          onAction={onRetry}
        />
      ) : null}
      {show ? (
        <Notice
          tone={toast.tone || 'ok'}
          icon="phone"
          text={toast.text}
          bold={toast.bold}
          onDismiss={onDismiss}
        />
      ) : null}
    </>
  );
}

/* One round action under the swipe card, with its name */
function DeckAction({ label, bold, ...button }) {
  return (
    <View style={styles.deckAction}>
      <CircleButton label={label} {...button} />
      <AppText size={12} weight={bold ? 800 : 700}>
        {label}
      </AppText>
    </View>
  );
}

/* ---- the swipe review: one card at a time ---- */

function ReviewView({ sw, stage, tabs, fetching, onStage, onBack, onList }) {
  const insets = useSafeAreaInsets();
  const hub = useHub();
  const { store, gone, sheet, toast } = hub;
  const items = waitingItems(store, sw, stage, gone);
  const count = waitingCount(store, sw, stage, gone);
  // Swiping a card up moves on without deciding it: `at` is the card shown.
  // It goes round — after the last comes the first again.
  const [skipped, setSkipped] = useState(0);
  useEffect(() => setSkipped(0), [stage.key]);
  const at = items.length ? skipped % items.length : 0;
  const top = items[at];
  const state = stateOf({
    store,
    sw,
    stage,
    count: top ? count : 0,
    fetching,
    onRetry: () => hub.reload(sw.id),
  });

  // Progress through this stage since the page was opened
  const done = hub.decided[`${sw.id}:${stage.key}`] || 0;
  const of = done + (count || 0);
  const left = top && top.canReject ? 'reject' : 'back';
  const act = type => () =>
    hub.openSheet(type, sw.id, stage.key, top.id, { from: 'deck' });
  // The card is away to one side while its sheet is open
  const flown =
    top && sheet && sheet.id === top.id && sheet.swId === sw.id
      ? sheet.type
      : null;

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" />
      <Disc size={380} color={colors.mint} style={styles.discTop} />
      <Disc size={160} color={colors.yellowSoft} style={styles.discLow} />

      <View style={[styles.reviewTop, { paddingTop: insets.top + mvs(6) }]}>
        <ScreenHeader
          onBack={onBack}
          backLabel="Back to home"
          title={sw.name}
          sub={`Swipe right to ${
            stage.key === 'rel' ? 'release' : 'approve'
          } · left to ${left === 'reject' ? 'reject' : 'send back'}`}
          right={
            <CircleButton
              icon="list"
              iconSize={20}
              label="Switch to list view"
              onPress={onList}
            />
          }
        />
        <StageTabs tabs={tabs} current={stage.key} onSelect={onStage} />
        {top && !state ? (
          <View style={styles.progress}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(((done + at + 1) / of) * 100)}%` },
                ]}
              />
            </View>
            <AppText size={12.5} weight={700} color={colors.muted}>
              {done + at + 1} of {of}
            </AppText>
          </View>
        ) : null}
        <Notices
          sw={sw}
          store={store}
          toast={toast}
          onRetry={() => hub.reload(sw.id)}
          onDismiss={hub.clearToast}
        />
      </View>

      {state === 'loading' ? (
        <View style={styles.deckArea}>
          <DeckSkeleton />
        </View>
      ) : state ? (
        <View style={styles.reviewState}>{state}</View>
      ) : (
        <>
          <View style={styles.deckArea}>
            <SwipeDeck
              item={top}
              sw={sw}
              stage={stage}
              behind={items.length - 1}
              left={left}
              flown={flown}
              onDecide={type => act(type)()}
              onOpen={() => hub.openDetail(sw.id, stage.key, top.id)}
              onSkip={step =>
                setSkipped((at + step + items.length) % items.length)
              }
            />
          </View>
          <View
            style={[
              styles.deckActions,
              { paddingBottom: insets.bottom + mvs(26) },
            ]}
          >
            {top.canReject ? (
              <DeckAction
                label="Reject"
                icon="x"
                size={60}
                iconSize={26}
                stroke={2.6}
                borderWidth={2}
                shadow={shadows.soft}
                onPress={act('reject')}
              />
            ) : null}
            {top.canSendBack === false ? null : (
              <DeckAction
                label="Send back"
                icon="undo"
                size={50}
                iconSize={21}
                stroke={2.4}
                borderWidth={2}
                onPress={act('back')}
              />
            )}
            <DeckAction
              label="Details"
              icon="docLines"
              size={50}
              iconSize={21}
              borderWidth={2}
              onPress={() => hub.openDetail(sw.id, stage.key, top.id)}
            />
            <DeckAction
              bold
              label={stage.key === 'rel' ? 'Release' : 'Approve'}
              icon="check"
              size={74}
              iconSize={32}
              stroke={2.8}
              bg={colors.yellow}
              border={null}
              shadow={shadows.yellow}
              onPress={act('approve')}
            />
          </View>
        </>
      )}
    </View>
  );
}

/* ---- the list: every approval of the stage, and "move all" ---- */

// Rows drawn when the page opens, and how many more each step after that
const FIRST_ROWS = 4;
const MORE_ROWS = 8;
// The shimmer shows for at least this long, so it never just flickers
const SHIMMER_MIN_MS = 350;

function ListView({ sw, stage, tabs, fetching, onStage, onBack, onCards }) {
  const hub = useHub();
  const { store, gone, toast } = hub;
  const items = waitingItems(store, sw, stage, gone);
  const count = waitingCount(store, sw, stage, gone);
  const state = stateOf({
    store,
    sw,
    stage,
    count,
    fetching,
    onRetry: () => hub.reload(sw.id),
  });
  const { openSheet, openDetail } = hub;
  // The same two functions for every row, so a row is not drawn again unless
  // its own item changes
  const open = useCallback(
    (type, id) =>
      openSheet(type, sw.id, stage.key, id, { from: 'list', count }),
    [openSheet, sw.id, stage.key, count],
  );
  const details = useCallback(
    id => openDetail(sw.id, stage.key, id),
    [openDetail, sw.id, stage.key],
  );
  const anyReject = items.some(item => item.canReject);

  // A long list is drawn a few rows at a time, so the shimmer gives way to
  // the first rows at once and the rest follow without holding anything up
  const [drawn, setDrawn] = useState(FIRST_ROWS);
  useEffect(() => setDrawn(FIRST_ROWS), [stage.key, fetching]);
  useEffect(() => {
    if (fetching || drawn >= items.length) return undefined;
    const timer = setTimeout(() => setDrawn(n => n + MORE_ROWS), 80);
    return () => clearTimeout(timer);
  }, [drawn, items.length, fetching]);

  return (
    <Screen
      top={6}
      backdrop={<Disc size={380} color={colors.mint} style={styles.discTop} />}
    >
      <ScreenHeader
        onBack={onBack}
        backLabel="Back to home"
        title={sw.name}
        sub={sw.sub}
        right={<ViewSwitch onCards={onCards} />}
      />
      <StageTabs tabs={tabs} current={stage.key} onSelect={onStage} />
      <Notices
        sw={sw}
        store={store}
        toast={toast}
        onRetry={() => hub.reload(sw.id)}
        onDismiss={hub.clearToast}
      />

      {state === 'loading' ? (
        <ListSkeleton />
      ) : state ? (
        state
      ) : (
        <>
          {stage.bulk && count > 1 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => open('bulk')}
              style={({ pressed }) => [
                styles.bulk,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.bulkCopy}>
                <Icon name="layers" size={20} stroke={2.2} />
                <AppText size={15} weight={800} numberOfLines={1} style={styles.shrink}>
                  {stage.bulk.replace('{n}', count)}
                </AppText>
              </View>
              <View style={styles.bulkArrow}>
                <Icon name="arrowRight" size={18} stroke={2.4} />
              </View>
            </Pressable>
          ) : null}

          <View style={styles.hint}>
            <AppText size={12} weight={700} color={colors.muted}>
              Swipe a row → approve · ← {anyReject ? 'reject' : 'send back'}
            </AppText>
            <AppText size={12} weight={700} color={colors.muted}>
              {count} waiting
            </AppText>
          </View>

          {items.slice(0, drawn).map(item => (
            <ApprovalItem
              key={item.id}
              item={item}
              onAction={open}
              onDetails={details}
            />
          ))}
          {drawn < items.length ? (
            <View style={styles.drawing}>
              <Icon name="spinner" size={16} stroke={2.8} color={colors.teal} />
              <AppText size={12.5} weight={700} color={colors.muted}>
                Loading the rest…
              </AppText>
            </View>
          ) : count > items.length ? (
            <AppText size={13} color={colors.muted} align="center">
              + {count - items.length} more in this stage
            </AppText>
          ) : null}
        </>
      )}
    </Screen>
  );
}

/* One software: its stages, and the approvals waiting in the chosen one —
   as a pile of cards to swipe (view "cards") or as a list (view "list") */
export default function SoftwareScreen({ route, navigation }) {
  const sw = findSoftware(route.params.swId);
  const cards = route.params.view === 'cards';
  const { store, gone, startVisit, reload, clearToast } = useHub();
  // Until a tab is picked, show the first stage that has something pending
  const [picked, setPicked] = useState(null);

  // The page opens at once, as shimmering shapes, and asks for a fresh list;
  // the real cards replace the shapes when the answer is in. The
  // confirmation strip belongs to this visit only.
  const [fetching, setFetching] = useState(sw.connected);
  useFocusEffect(
    useCallback(() => {
      if (!sw.connected) return clearToast;
      let live = true;
      const began = Date.now();
      setFetching(true);
      startVisit(sw.id);
      Promise.resolve(reload(sw.id))
        .catch(() => {})
        .then(() => {
          const wait = Math.max(SHIMMER_MIN_MS - (Date.now() - began), 0);
          setTimeout(() => live && setFetching(false), wait);
        });
      return () => {
        live = false;
        clearToast();
      };
    }, [startVisit, reload, clearToast, sw.id, sw.connected]),
  );

  const goHome = () => navigation.goBack();
  if (!sw.connected) return <NotConnected sw={sw} onHome={goHome} />;

  const stageKey = picked || defaultStage(store, sw);
  const stage = sw.stages.find(x => x.key === stageKey) || sw.stages[0];
  const shared = {
    sw,
    stage,
    fetching,
    tabs: sw.stages.map(st => ({
      key: st.key,
      label: st.short,
      count: waitingCount(store, sw, st, gone),
    })),
    onStage: key => {
      setPicked(key);
      clearToast();
    },
    onBack: goHome,
  };
  const show = view => () => navigation.setParams({ view });

  return cards ? (
    <ReviewView {...shared} onList={show('list')} />
  ) : (
    <ListView {...shared} onCards={show('cards')} />
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  shrink: { flexShrink: 1 },
  pressed: { opacity: 0.8 },
  state: { marginTop: mvs(46) },

  // background shapes
  discTop: { right: -s(150), top: -ms(170) },
  discLow: { left: -s(60), top: '66%' },

  // not connected
  linkCard: { alignItems: 'center', gap: mvs(12), paddingTop: mvs(28) },
  linkArt: { width: ms(220), height: ms(130) },
  linkTile: { position: 'absolute', top: ms(35), width: ms(84), height: ms(60) },
  linkLeft: { left: 0 },
  linkRight: { right: 0 },
  linkLine: { position: 'absolute', left: ms(84), top: ms(57) },
  linkPlug: {
    position: 'absolute',
    left: ms(88),
    top: ms(43),
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planned: { gap: mvs(10) },
  plannedHead: { marginTop: mvs(4), marginHorizontal: s(4) },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: ms(24),
    paddingVertical: ms(12),
    paddingHorizontal: s(14),
  },
  planIcon: {
    width: ms(42),
    height: ms(42),
    borderRadius: ms(21),
    backgroundColor: colors.yellowSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // view switch
  switch: {
    flexDirection: 'row',
    backgroundColor: colors.mint,
    borderRadius: ms(23),
    padding: ms(4),
  },
  switchSide: {
    width: ms(40),
    height: ms(38),
    borderRadius: ms(19),
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: colors.teal },

  // swipe review
  page: { flex: 1, backgroundColor: colors.white, overflow: 'hidden' },
  reviewTop: { paddingHorizontal: s(18), gap: mvs(14) },
  reviewState: { flex: 1, paddingHorizontal: s(18) },
  progress: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  progressTrack: {
    flex: 1,
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: colors.mint,
    overflow: 'hidden',
  },
  progressFill: {
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: colors.yellow,
  },
  deckArea: {
    flex: 1,
    maxHeight: ms(480),
    marginHorizontal: s(18),
    marginTop: mvs(22),
    // room for the edges of the cards underneath
    marginBottom: mvs(48),
  },
  deckActions: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: s(28),
  },
  deckAction: { alignItems: 'center', gap: mvs(7) },

  // list
  bulk: {
    height: ms(56),
    borderRadius: ms(28),
    borderWidth: 2,
    borderColor: colors.teal,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: s(20),
    paddingRight: ms(7),
  },
  bulkCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  bulkArrow: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: mvs(4),
    paddingHorizontal: s(4),
  },
  drawing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    paddingVertical: mvs(8),
  },
});
