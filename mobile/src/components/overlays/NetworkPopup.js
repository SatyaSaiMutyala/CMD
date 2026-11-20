import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { checkHub, watchPhone } from '../../services/network';
import { selectToken } from '../../store/authSlice';
import { reloadAll, reloadHistory } from '../../store/hubThunks';
import { netPopupHidden, netStatusSet } from '../../store/netSlice';
import { colors, ms, mvs, s, shadows } from '../../theme';
import { AppText, Button, Eyebrow } from '../common';
import { Icon } from '../icons';

// How often the hub is asked "are you there?" while the app is open
const EVERY_MS = 25000;
// ...and while something is wrong, so the pop-up closes soon after it is fixed
const EVERY_MS_WHEN_DOWN = 6000;

const WORDS = {
  offline: {
    eyebrow: 'NO CONNECTION',
    title: 'You are offline',
    text: 'This phone has no Wi-Fi or mobile data. What you see may be out of date, and nothing can be approved until you are back online.',
    icon: 'wifiOff',
  },
  unreachable: {
    eyebrow: 'NO CONNECTION',
    title: "Can't reach the hub",
    text: 'The hub is not answering. Check your connection. What you see may be out of date, and nothing can be approved until it answers again.',
    icon: 'wifiOff',
  },
  slow: {
    eyebrow: 'SLOW CONNECTION',
    title: 'The connection is slow',
    text: 'The hub is taking longer than usual to answer. Lists may load slowly, and a decision can take a moment to go through.',
    icon: 'clock',
  },
};

/* Keeps an eye on the connection and says so, over whatever is open, when it
   is lost or slow. The pop-up closes by itself once things are back to
   normal; closed by hand, it stays closed until the connection changes again.

   Signed out, only the phone's own "no network" is watched (the hub is not
   asked anything before sign-in). */
export default function NetworkPopup() {
  const dispatch = useDispatch();
  const signedIn = !!useSelector(selectToken);
  const { status, hidden } = useSelector(state => state.net);
  const [checking, setChecking] = useState(false);
  // What the phone itself last said: false = definitely no network
  const phoneOnline = useRef(true);
  const last = useRef('online');
  const slowRuns = useRef(0);

  const settle = useCallback(
    next => {
      const before = last.current;
      last.current = next;
      dispatch(netStatusSet(next));
      // Back after an outage: catch up on what was missed
      if (signedIn && next === 'online' && before !== 'online' && before !== 'slow') {
        dispatch(reloadAll());
        dispatch(reloadHistory());
      }
    },
    [dispatch, signedIn],
  );

  const check = useCallback(async () => {
    if (!phoneOnline.current) {
      settle('offline');
      return;
    }
    if (!signedIn) {
      settle('online');
      return;
    }
    const found = await checkHub();
    // One slow answer can be a blip: it is "slow" when two in a row are
    slowRuns.current = found === 'slow' ? slowRuns.current + 1 : 0;
    settle(found === 'slow' && slowRuns.current < 2 ? last.current : found);
  }, [settle, signedIn]);

  // The phone says the moment its network goes or comes back
  useEffect(
    () =>
      watchPhone(online => {
        phoneOnline.current = online;
        check();
      }),
    [check],
  );

  // The hub is asked regularly while the app is in front
  useEffect(() => {
    if (!signedIn) return undefined;
    let timer = null;
    let stopped = false;
    const loop = async () => {
      if (stopped) return;
      if (AppState.currentState === 'active') await check();
      if (stopped) return;
      timer = setTimeout(
        loop,
        last.current === 'online' ? EVERY_MS : EVERY_MS_WHEN_DOWN,
      );
    };
    loop();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
      sub.remove();
    };
  }, [signedIn, check]);

  const words = WORDS[status];
  if (!words || hidden) return null;
  const lost = status !== 'slow';
  const close = () => dispatch(netPopupHidden());

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.scrim}>
        <View accessibilityRole="alert" style={styles.card}>
          <View style={[styles.halo, lost ? null : styles.haloSlow]}>
            <View style={[styles.disc, lost ? null : styles.discSlow]}>
              <Icon
                name={words.icon}
                size={40}
                stroke={2}
                color={lost ? colors.ink : colors.white}
              />
            </View>
          </View>
          <Eyebrow>{words.eyebrow}</Eyebrow>
          <AppText display size={26} lh={1.1} weight={800} align="center">
            {words.title}
          </AppText>
          <AppText size={14} lh={1.5} color={colors.muted} align="center">
            {words.text}
          </AppText>
          {lost ? (
            <Button
              variant="teal"
              height={56}
              fontSize={16}
              icon="refresh"
              iconSize={19}
              label={checking ? 'Checking…' : 'Try again'}
              disabled={checking}
              onPress={async () => {
                setChecking(true);
                await check();
                setChecking(false);
              }}
              style={styles.button}
            />
          ) : null}
          <Button
            variant={lost ? 'text' : 'yellow'}
            height={lost ? 44 : 56}
            fontSize={lost ? 15 : 16}
            weight={lost ? 700 : 800}
            label={lost ? 'Dismiss' : 'OK'}
            onPress={close}
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(22),
  },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: ms(36),
    paddingTop: mvs(26),
    paddingHorizontal: s(22),
    paddingBottom: mvs(18),
    gap: mvs(10),
    boxShadow: shadows.deck,
  },
  halo: {
    width: ms(120),
    height: ms(120),
    borderRadius: ms(60),
    backgroundColor: colors.yellowSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: mvs(6),
  },
  haloSlow: { backgroundColor: colors.mint },
  disc: {
    width: ms(92),
    height: ms(92),
    borderRadius: ms(46),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discSlow: { backgroundColor: colors.teal },
  button: { alignSelf: 'stretch', marginTop: mvs(6) },
});
