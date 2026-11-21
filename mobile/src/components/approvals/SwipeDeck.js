import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors, hairline, ms, mvs, s, shadows } from '../../theme';
import { AppText, Eyebrow, Pill, Shimmer } from '../common';
import { Icon } from '../icons';

// How far the card must be dragged before letting go decides, and where it
// flies to once decided (design pixels; a phone is 390 wide)
const DECIDE = 110;
const AWAY = 460;
// How far up (or down) it must be dragged to move on to another card
const SKIP = 90;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

/* What is printed on the card for one approval */
function Face({ item, sw, stage, left, more }) {
  const amount = item.decides || item.balance || item.amount;
  const sub = item.balance
    ? `Balance of a ${item.amount} invoice`
    : item.note || item.type;
  return (
    <>
      <View style={styles.head}>
        <View style={styles.headTop}>
          <Pill label={`${sw.mono} · ${stage.label}`} style={styles.shrink} />
          {item.due ? (
            <Pill
              label={item.due}
              icon={item.overdue ? 'alert' : 'clock'}
              bg={item.overdue ? colors.yellow : colors.mint}
            />
          ) : null}
        </View>
        <AppText size={12.5} weight={700} track={0.03} color={colors.white}>
          {item.ref || item.id}
        </AppText>
        <AppText
          display
          size={20}
          lh={1.22}
          weight={700}
          color={colors.white}
          numberOfLines={3}
        >
          {item.party}
        </AppText>
      </View>

      <View style={styles.body}>
        <Eyebrow size={11.5}>
          {item.eyebrow ||
            (stage.key === 'rel' ? 'AMOUNT TO RELEASE' : 'AMOUNT TO APPROVE')}
        </Eyebrow>
        <AppText
          display
          size={52}
          lh={1}
          weight={800}
          track={-0.02}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {amount}
        </AppText>
        {sub ? (
          <AppText size={13.5} weight={500} color={colors.muted} numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
        {item.tags.length ? (
          <View style={styles.tags}>
            {item.tags.map(tag => (
              <Pill
                key={tag}
                label={tag}
                height={26}
                radius={9}
                pad={10}
                size={11}
                track={0.06}
                bg={colors.yellowSoft}
              />
            ))}
          </View>
        ) : null}
        {item.auto ? (
          <View style={styles.note}>
            <Icon name="info" size={14} stroke={2} color={colors.muted} />
            <AppText
              size={12.5}
              weight={500}
              color={colors.muted}
              numberOfLines={2}
              style={styles.shrink}
            >
              {item.auto}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.hints}>
        <View style={styles.hint}>
          <Icon name="chevronsLeft" size={14} stroke={2.4} color={colors.muted} />
          <AppText size={12} weight={700} color={colors.muted}>
            {left === 'reject' ? item.rejectLabel || 'Reject' : 'Send back'}
          </AppText>
        </View>
        {more ? (
          <View style={styles.hint}>
            <Icon name="chevronsUp" size={14} stroke={2.4} color={colors.muted} />
            <AppText size={12} weight={700} color={colors.muted}>
              Next
            </AppText>
          </View>
        ) : null}
        <View style={styles.hint}>
          <AppText size={12} weight={700} color={colors.muted}>
            {stage.key === 'rel' ? 'Release' : 'Approve'}
          </AppText>
          <Icon name="chevronsRight" size={14} stroke={2.4} color={colors.muted} />
        </View>
      </View>
    </>
  );
}

/* The swipe review: the approval on top of the pile as a card to drag.
   Right decides "approve", left decides `left` ("reject" where the stage
   allows it, otherwise "back"). Deciding only opens the confirm sheet —
   nothing is sent from here.

   Up moves on to the next approval without deciding this one, and down goes
   back to the one before; nothing is sent or changed by either.

     item / sw / stage   what the top card shows
     behind              how many more wait under it (draws up to two edges)
     flown               null, or the decision whose sheet is open: the card
                         stays off to that side until the sheet is closed
     onDecide(action)    'approve' | 'reject' | 'back'
     onSkip(step)        +1 = show the next card, -1 = the one before
     onOpen()            the card was tapped: show its details                */
export default function SwipeDeck({
  item,
  sw,
  stage,
  behind,
  left,
  flown,
  onDecide,
  onSkip,
  onOpen,
}) {
  const { height } = useWindowDimensions();
  const dx = useRef(new Animated.Value(0)).current;
  const dy = useRef(new Animated.Value(0)).current;
  // Which way the current drag goes ('x' | 'y'), and where the card that is
  // about to appear should come in from (+1 below, -1 above, 0 nowhere)
  const drag = useRef({ axis: null, enter: 0 });
  const live = useRef({});
  const more = behind > 0 && !!onSkip;
  live.current = { left, flown, onDecide, onSkip, more, height };
  const away = ms(AWAY);
  const decide = ms(DECIDE);

  const glide = to =>
    Animated.timing(dx, {
      toValue: to,
      duration: 380,
      easing: EASE,
      useNativeDriver: true,
    }).start();

  const rise = to =>
    Animated.timing(dy, {
      toValue: to,
      duration: 260,
      easing: EASE,
      useNativeDriver: true,
    });

  // A new card on top starts in the middle. After a skip it comes in from the
  // side the last one did not leave by.
  useLayoutEffect(() => {
    dx.stopAnimation();
    dx.setValue(0);
    dy.stopAnimation();
    const from = drag.current.enter;
    drag.current.enter = 0;
    if (from) {
      dy.setValue(from * ms(70));
      rise(0).start();
    } else {
      dy.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, dx, dy]);

  // Sheet open: the card is away on the side of the decision. Closed without
  // deciding: it comes back.
  useEffect(() => {
    glide(flown ? (flown === 'approve' ? away : -away) : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flown]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // A real drag, not a tap. It is sideways (decide) or up and down
        // (another card), whichever it starts as, and stays that for its length.
        onMoveShouldSetPanResponder: (_, g) => {
          const now = live.current;
          if (now.flown) return false;
          const sideways = Math.abs(g.dx) > Math.abs(g.dy);
          if (sideways ? Math.abs(g.dx) <= 8 : Math.abs(g.dy) <= 8) return false;
          if (!sideways && !now.more) return false;
          drag.current.axis = sideways ? 'x' : 'y';
          return true;
        },
        onPanResponderGrant: () => {
          dx.stopAnimation();
          dy.stopAnimation();
        },
        onPanResponderMove: (_, g) => {
          if (drag.current.axis === 'x') dx.setValue(g.dx);
          else dy.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          const now = live.current;
          if (drag.current.axis === 'x') {
            if (g.dx > decide) now.onDecide('approve');
            else if (g.dx < -decide) now.onDecide(now.left);
            else glide(0);
            return;
          }
          const far = ms(SKIP);
          if (Math.abs(g.dy) > far) {
            // Up: the card leaves by the top and the next comes from below
            const step = g.dy < 0 ? 1 : -1;
            rise(-step * now.height).start(() => {
              drag.current.enter = step;
              now.onSkip(step);
            });
          } else {
            rise(0).start();
          }
        },
        onPanResponderTerminate: () => {
          glide(0);
          rise(0).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dx],
  );

  const fade = (from, to, max) =>
    dx.interpolate({
      inputRange: from < to ? [from, to] : [to, from],
      outputRange: from < to ? [0, max] : [max, 0],
      extrapolate: 'clamp',
    });

  return (
    <View style={styles.deck}>
      {behind > 1 ? <View style={[styles.under, styles.under2]} /> : null}
      {behind > 0 ? <View style={[styles.under, styles.under1]} /> : null}

      <Animated.View
        {...responder.panHandlers}
        style={[
          styles.card,
          {
            transform: [
              { translateX: dx },
              { translateY: dy },
              {
                rotate: dx.interpolate({
                  inputRange: [-away, away],
                  outputRange: [`${-AWAY / 16}deg`, `${AWAY / 16}deg`],
                }),
              },
            ],
          },
        ]}
      >
        {/* A tap (not a drag) opens the approval's details and documents */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.ref || item.id}, ${item.party}. Details`}
          onPress={onOpen}
          style={styles.face}
        >
          <Face item={item} sw={sw} stage={stage} left={left} more={more} />
        </Pressable>

        {/* The tint and the stamp that grow as the card is dragged */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wash,
            {
              backgroundColor: colors.yellow,
              opacity: fade(0, ms(112), 0.35),
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wash,
            { backgroundColor: colors.mint, opacity: fade(0, -ms(120), 0.6) },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.stamp,
            styles.stampApprove,
            { opacity: fade(0, decide, 1) },
          ]}
        >
          <AppText display size={30} weight={800} track={0.04}>
            {stage.key === 'rel' ? 'RELEASE' : 'APPROVE'}
          </AppText>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.stamp,
            styles.stampReject,
            { opacity: fade(0, -decide, 1) },
          ]}
        >
          <AppText display size={left === 'reject' ? 30 : 26} weight={800} track={0.04}>
            {left === 'reject'
              ? (item.rejectLabel || 'Reject').toUpperCase()
              : 'SEND BACK'}
          </AppText>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/* The same pile, shimmering, while the list is being fetched */
export function DeckSkeleton() {
  return (
    <View style={styles.deck} accessibilityLabel="Loading approvals">
      <View style={[styles.under, styles.under2]} />
      <View style={[styles.under, styles.under1, styles.skeletonUnder]} />
      <View style={[styles.card, styles.skeleton]}>
        <Shimmer width="100%" height={170} radius={26} tone="teal" />
        <Shimmer width={120} height={12} style={styles.bone} />
        <Shimmer width={200} height={40} radius={12} style={styles.bone} />
        <Shimmer width={160} height={12} style={styles.bone} />
        <View style={styles.loading}>
          <Icon name="spinner" size={18} stroke={2.8} color={colors.teal} />
          <AppText size={13} weight={700} color={colors.muted}>
            Loading approvals
          </AppText>
        </View>
      </View>
    </View>
  );
}

const RADIUS = ms(34);

const styles = StyleSheet.create({
  deck: { flex: 1 },
  face: { flex: 1 },
  shrink: { flexShrink: 1 },
  under: {
    ...StyleSheet.absoluteFill,
    borderRadius: RADIUS,
  },
  under1: {
    backgroundColor: colors.mintMid,
    transform: [{ translateY: ms(15) }, { scale: 0.93 }],
  },
  under2: {
    backgroundColor: colors.mint,
    transform: [{ translateY: ms(30) }, { scale: 0.86 }],
  },
  card: {
    ...StyleSheet.absoluteFill,
    borderRadius: RADIUS,
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
    padding: ms(10),
    boxShadow: shadows.deck,
  },
  head: {
    backgroundColor: colors.teal,
    borderRadius: ms(26),
    paddingTop: ms(16),
    paddingHorizontal: ms(16),
    paddingBottom: ms(18),
    gap: mvs(12),
  },
  headTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(8),
  },
  body: {
    paddingTop: mvs(18),
    paddingHorizontal: ms(10),
    gap: mvs(10),
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: ms(6), marginTop: 2 },
  note: { flexDirection: 'row', alignItems: 'center', gap: s(7) },
  hints: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: ms(6),
    paddingBottom: ms(6),
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wash: { ...StyleSheet.absoluteFill, borderRadius: RADIUS },
  stamp: {
    position: 'absolute',
    top: '47%',
    paddingVertical: ms(8),
    paddingHorizontal: ms(16),
    borderRadius: ms(16),
    borderWidth: 3,
    boxShadow: shadows.stamp,
  },
  stampApprove: {
    left: ms(22),
    backgroundColor: colors.yellow,
    borderColor: colors.white,
    transform: [{ rotate: '-12deg' }],
  },
  stampReject: {
    right: ms(22),
    backgroundColor: colors.white,
    borderColor: colors.teal,
    transform: [{ rotate: '12deg' }],
  },

  skeleton: { gap: mvs(16), boxShadow: undefined },
  skeletonUnder: { backgroundColor: colors.line },
  bone: { marginLeft: ms(10) },
  loading: {
    marginTop: 'auto',
    marginBottom: ms(20),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
});
