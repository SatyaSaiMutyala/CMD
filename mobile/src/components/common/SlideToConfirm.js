import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { colors, ms, shadows } from '../../theme';
import { Icon } from '../icons';
import AppText from './AppText';

// track, the part behind the knob, the knob and its icon
const TONES = {
  approve: [colors.yellowSoft, colors.yellow, colors.teal, colors.white],
  return: [colors.mint, colors.mintMid, colors.yellow, colors.ink],
  // on the details page, where the knob itself is yellow
  page: [colors.yellowSoft, colors.yellow, colors.yellow, colors.ink],
  // on the teal card of the home page: a yellow bar with a white knob
  hero: [colors.yellow, colors.yellowMid, colors.white, colors.ink],
};

const PAD = ms(5);
// [height of the track, size of the knob]
const SIZES = { regular: [ms(64), ms(54)], compact: [ms(52), ms(42)] };

// The knob must really travel: a touch that moves less than this is a tap
const TAP = ms(24);

/* Slide the knob to the end to confirm. A tap does nothing at all: the knob
   has to be dragged along the track, it follows the finger, and it only
   confirms when it is let go past 85% of the way. Let go earlier and it
   springs back.

     label       the words in the track; they fade as the knob moves
     tone        "approve" (yellow track, teal knob) | "return" (mint track,
                 yellow knob) | "page" (yellow track, yellow knob) |
                 "hero" (yellow bar, white knob)
     compact     a lower track with a smaller knob
     labelSide   "center" (default) | "right": where the words sit
     icon        the knob's icon
     canStart()  return false to refuse the slide (e.g. a reason is missing)
     onComplete  called once, when the knob is let go past 85% of the way
     holdKey     change it to send the knob back to the start (after a
                 failure, so the slide can be tried again)
     busy        the thing slid for is under way (a request is out). The bar
                 says so instead of looking stuck: the knob turns into a
                 spinner at the end of the track and `busyLabel` shows
     busyLabel   the words meanwhile ("Approving…")
     disabled    the knob cannot be moved

   With a screen reader on (VoiceOver / TalkBack), where dragging is not
   possible, activating the knob confirms instead. */
export default function SlideToConfirm({
  label,
  tone = 'approve',
  icon = 'arrowRight',
  compact,
  labelSide = 'center',
  canStart,
  onComplete,
  holdKey,
  busy,
  busyLabel = 'Please wait…',
  disabled,
  style,
}) {
  const sx = useRef(new Animated.Value(0)).current;
  const [HEIGHT, KNOB] = compact ? SIZES.compact : SIZES.regular;
  const track = useRef(null);
  const [width, setWidth] = useState(0);
  const [reader, setReader] = useState(false);
  // Slid to the end and let go: from that instant the bar shows "working",
  // without waiting for the caller to say it is busy
  const [sent, setSent] = useState(false);
  const working = !!busy || sent;
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  // What the gesture needs, always current (the responder is made once)
  const live = useRef({ max: 0 });
  const travel = w => Math.max(w - live.current.knob - PAD * 2, 0);
  live.current.knob = KNOB;
  live.current = {
    knob: KNOB,
    max: travel(width) || live.current.max,
    canStart,
    onComplete: () => {
      setSent(true);
      if (onComplete) onComplete();
    },
    disabled: disabled || working,
    reader,
  };

  useEffect(() => {
    let on = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then(value => on && setReader(!!value))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      value => setReader(!!value),
    );
    return () => {
      on = false;
      if (sub && sub.remove) sub.remove();
    };
  }, []);

  const glide = (to, then) =>
    Animated.timing(sx, {
      toValue: to,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start(then);

  // Back to the start when asked
  useEffect(() => {
    setSent(false);
    sx.stopAnimation();
    glide(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdKey]);

  // Busy without having been slid here (the slide happened elsewhere): the
  // knob still goes to the end, so the bar reads as "under way"
  useEffect(() => {
    if (busy && live.current.max > 0) glide(live.current.max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, width]);

  // While working: the spinner turns and the bar breathes
  useEffect(() => {
    if (!working) return undefined;
    spin.setValue(0);
    pulse.setValue(0);
    const turning = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    turning.start();
    breathing.start();
    return () => {
      turning.stop();
      breathing.stop();
    };
  }, [working, spin, pulse]);

  // Only for a screen reader: a touch never comes this way
  const finish = () => {
    const now = live.current;
    if (!now.reader || now.disabled) return;
    if (now.canStart && now.canStart() === false) return;
    glide(now.max, () => now.onComplete && now.onComplete());
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => {
          const now = live.current;
          if (now.disabled) return false;
          return !(now.canStart && now.canStart() === false);
        },
        // Once the knob is held, nothing around it (a scrolling sheet, the
        // page behind) may take the drag away
        onStartShouldSetPanResponderCapture: () => !live.current.disabled,
        onMoveShouldSetPanResponderCapture: () => !live.current.disabled,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          sx.stopAnimation();
          // The track's real width, read again as the drag begins
          if (track.current && track.current.measure) {
            track.current.measure((x, y, w) => {
              if (w) live.current.max = travel(w);
            });
          }
        },
        onPanResponderMove: (_, g) => {
          sx.setValue(Math.max(0, Math.min(live.current.max, g.dx)));
        },
        onPanResponderRelease: (_, g) => {
          const now = live.current;
          const dragged = g.dx > TAP && now.max > 0;
          if (dragged && g.dx >= now.max * 0.85) {
            glide(now.max, () => now.onComplete && now.onComplete());
          } else {
            glide(0);
          }
        },
        onPanResponderTerminate: () => glide(0),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sx],
  );

  const [trackBg, fillBg, knobBg, knobIcon] = TONES[tone] || TONES.approve;
  return (
    <View
      ref={track}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.track,
        { height: HEIGHT, borderRadius: HEIGHT / 2, backgroundColor: trackBg },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            borderRadius: HEIGHT / 2,
            backgroundColor: fillBg,
            width: Animated.add(sx, KNOB + PAD * 2),
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.label,
          { paddingLeft: KNOB + PAD },
          labelSide === 'right' ? styles.labelRight : null,
          {
            opacity: sx.interpolate({
              inputRange: [0, 160],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <AppText size={15} weight={800} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </AppText>
      </Animated.View>
      {/* What is happening, over the filled bar, while it is under way */}
      {working ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.label,
            styles.working,
            { paddingRight: KNOB + PAD },
            {
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.55],
              }),
            },
          ]}
        >
          <AppText size={15} weight={800} numberOfLines={1} adjustsFontSizeToFit>
            {busyLabel}
          </AppText>
        </Animated.View>
      ) : null}
      <Animated.View
        {...responder.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled, busy: working }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={e => {
          if (e.nativeEvent.actionName === 'activate') finish();
        }}
        style={[
          styles.knob,
          {
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            backgroundColor: knobBg,
            transform: [{ translateX: sx }],
          },
        ]}
      >
        {working ? (
          <Animated.View
            style={{
              transform: [
                {
                  rotate: spin.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            }}
          >
            <Icon
              name="spinner"
              size={compact ? 20 : 24}
              stroke={2.8}
              color={knobIcon}
            />
          </Animated.View>
        ) : (
          <Icon
            name={icon}
            size={compact ? 20 : 24}
            stroke={compact ? 2.4 : 2.6}
            color={knobIcon}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  label: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: ms(12),
  },
  labelRight: { alignItems: 'flex-end', paddingRight: ms(24) },
  working: { paddingLeft: ms(12) },
  knob: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.knob,
  },
});
