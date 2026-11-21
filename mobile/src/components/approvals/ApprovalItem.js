import React, { memo, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { colors, hairline, ms, mvs, s, shadows } from '../../theme';
import { AppText, CircleButton, Pill } from '../common';
import { Icon } from '../icons';

// Drag right this far and let go: approve. The card follows up to PEEK.
const APPROVE_AT = ms(90);
const PEEK = ms(132);
// Drag left past OPEN_AT and the actions stay open
const OPEN_AT = ms(60);
const ACTION_W = ms(64);

/* One approval in the list. Buttons on the right approve it or open its
   details; the row can also be swiped:
     right  shows "Approve ₹…" underneath and opens the approve sheet
     left   slides open to Send back (and Reject, where the item allows it)
   Every decision still goes through the confirm sheet.

     onAction(type, id)  type = 'approve' | 'back' | 'reject' | 'verify'
     onDetails(id)

   Both are given the item's id, so the same two functions serve every row
   and a row is only drawn again when its own item changes (it is memoised:
   a long list must not redraw in full for every change on the page).        */
function ApprovalItem({ item, onAction, onDetails: showDetails }) {
  const onApprove = () => onAction('approve', item.id);
  // Not every software has a "send back" (eDOS only approves or rejects)
  const onSendBack =
    item.canSendBack === false ? undefined : () => onAction('back', item.id);
  const ref = item.ref || item.id;
  const onReject = item.canReject
    ? () => onAction('reject', item.id)
    : undefined;
  // AIMS: an item still at its first sign-off can be verified only
  const onVerify = item.canVerify
    ? () => onAction('verify', item.id)
    : undefined;
  const onDetails = () => showDetails(item.id);
  const dx = useRef(new Animated.Value(0)).current;
  const open = useRef(false);
  const amount = item.decides || item.balance || item.amount;
  // Room the left swipe uncovers: the buttons, the gap between and around them
  const actions = [onSendBack, onReject, onVerify].filter(Boolean).length || 1;
  const reveal =
    ACTION_W * actions + ms(10) * (actions - 1) + ms(14) + ms(8);
  const live = useRef({});
  live.current = { onApprove, reveal };

  const settle = to => {
    open.current = to !== 0;
    Animated.spring(dx, {
      toValue: to,
      bounciness: 0,
      speed: 18,
      useNativeDriver: true,
    }).start();
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderGrant: () => dx.stopAnimation(),
        onPanResponderMove: (_, g) => {
          const from = open.current ? -live.current.reveal : 0;
          dx.setValue(
            Math.max(-live.current.reveal, Math.min(PEEK, from + g.dx)),
          );
        },
        onPanResponderRelease: (_, g) => {
          const now = live.current;
          const at = (open.current ? -now.reveal : 0) + g.dx;
          if (at > APPROVE_AT) {
            settle(0);
            now.onApprove();
          } else if (at < -OPEN_AT) {
            settle(-now.reveal);
          } else {
            settle(0);
          }
        },
        onPanResponderTerminate: () => settle(open.current ? -live.current.reveal : 0),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dx],
  );

  // An action was picked: close the row, then do it
  const pick = action => () => {
    settle(0);
    action();
  };

  return (
    <View style={styles.row}>
      {/* Under the card: yellow while going right, mint while going left */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.under,
          styles.underApprove,
          {
            opacity: dx.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <View style={styles.approveMark}>
          <Icon name="check" size={22} stroke={2.8} />
        </View>
        <AppText size={13} lh={1.25} weight={800}>
          {item.approve.split(' ')[0]}
          {'\n'}
          {amount}
        </AppText>
      </Animated.View>
      <Animated.View
        style={[
          styles.under,
          styles.underActions,
          {
            opacity: dx.interpolate({
              inputRange: [-1, 0],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        {onSendBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Send back ${ref}`}
            onPress={pick(onSendBack)}
            style={[styles.action, styles.actionBack]}
          >
            <Icon name="undo" size={20} stroke={2.4} />
            <AppText size={11.5} weight={800}>
              Send back
            </AppText>
          </Pressable>
        ) : null}
        {onVerify ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Verify ${ref}`}
            onPress={pick(onVerify)}
            style={[styles.action, styles.actionBack]}
          >
            <Icon name="shield" size={20} stroke={2.4} />
            <AppText size={11.5} weight={800}>
              Verify
            </AppText>
          </Pressable>
        ) : null}
        {onReject ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Reject ${ref}`}
            onPress={pick(onReject)}
            style={[styles.action, styles.actionReject]}
          >
            <Icon name="x" size={20} stroke={2.6} color={colors.white} />
            <AppText size={11.5} weight={800} color={colors.white}>
              Reject
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>

      <Animated.View
        {...responder.panHandlers}
        style={[styles.card, { transform: [{ translateX: dx }] }]}
      >
        <Pressable
          style={styles.copy}
          // A tap on an open row closes it
          onPress={() => (open.current ? settle(0) : onDetails())}
          accessibilityRole="button"
          accessibilityLabel={`${ref}, ${item.party}, ${amount}. Details`}
        >
          <View style={styles.top}>
            <AppText size={12} weight={700} color={colors.muted}>
              {ref}
            </AppText>
            {item.due ? (
              <Pill
                label={item.due}
                height={22}
                pad={8}
                size={11}
                bg={item.overdue ? colors.yellow : colors.mint}
              />
            ) : null}
          </View>
          <AppText size={14.5} lh={1.3} weight={700} numberOfLines={2}>
            {item.party}
          </AppText>
          <View style={styles.money}>
            <AppText display size={24} weight={800}>
              {amount}
            </AppText>
            {item.tags.map(tag => (
              <Pill
                key={tag}
                label={tag}
                height={22}
                radius={7}
                pad={8}
                size={10.5}
                track={0.05}
                bg={colors.yellowSoft}
              />
            ))}
          </View>
          {item.balance ? (
            <AppText size={12} weight={500} color={colors.muted}>
              Balance of a {item.amount} invoice
            </AppText>
          ) : null}
          {item.auto ? (
            <View style={styles.auto}>
              <Icon name="refresh" size={13} stroke={2.2} color={colors.muted} />
              <AppText
                size={12}
                weight={500}
                color={colors.muted}
                style={styles.autoText}
              >
                {item.auto}
              </AppText>
            </View>
          ) : null}
        </Pressable>
        <View style={styles.buttons}>
          <CircleButton
            icon="check"
            size={48}
            stroke={2.8}
            bg={colors.yellow}
            border={null}
            label={`${item.approve.split(' ')[0]} ${amount}, ${ref}`}
            onPress={onApprove}
          />
          <CircleButton
            icon="doc"
            size={48}
            iconSize={19}
            label={`Details and documents, ${ref}`}
            onPress={onDetails}
          />
        </View>
      </Animated.View>
    </View>
  );
}

export default memo(ApprovalItem);

const RADIUS = ms(26);

const styles = StyleSheet.create({
  row: { borderRadius: RADIUS },
  under: {
    ...StyleSheet.absoluteFill,
    borderRadius: RADIUS,
  },
  underApprove: {
    backgroundColor: colors.yellow,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: mvs(6),
    paddingLeft: s(20),
  },
  approveMark: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  underActions: {
    backgroundColor: colors.mint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: ms(10),
    paddingRight: ms(14),
  },
  action: {
    width: ACTION_W,
    height: ms(76),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
    gap: mvs(6),
  },
  actionBack: { backgroundColor: colors.white },
  actionReject: { backgroundColor: colors.teal },
  card: {
    flexDirection: 'row',
    gap: s(12),
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: RADIUS,
    paddingVertical: ms(14),
    paddingRight: ms(14),
    paddingLeft: ms(16),
    boxShadow: shadows.row,
  },
  copy: { flex: 1, minWidth: 0, gap: mvs(7) },
  top: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  money: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: s(8),
  },
  auto: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  autoText: { flexShrink: 1 },
  buttons: { justifyContent: 'center', gap: mvs(8) },
});
