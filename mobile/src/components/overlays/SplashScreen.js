import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ms, mvs, s } from '../../theme';
import { AppText, Eyebrow } from '../common';
import { Icon } from '../icons';

const logo = require('../../assets/images/trustlab-logo.png');

// The opening plays for at least this long, even when the app is ready sooner
const SHOW_MS = 2400;
const LEAVE_MS = 420;
const OUT = Easing.out(Easing.cubic);

/* One piece of the opening: fades in and settles into place.
   `at` is when it starts (ms); `from` is where it starts from. */
function Arrive({ clock, at, length = 520, from = {}, style, children }) {
  const t = clock.interpolate({
    inputRange: [at, at + length],
    outputRange: [0, 1],
    extrapolate: 'clamp',
    easing: OUT,
  });
  const span = (a, b) => t.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const transform = [];
  if (from.y != null) transform.push({ translateY: span(from.y, 0) });
  if (from.x != null) transform.push({ translateX: span(from.x, 0) });
  if (from.scale != null) transform.push({ scale: span(from.scale, 1) });
  if (from.rotate != null) {
    transform.push({ rotate: span(`${from.rotate}deg`, `${from.to || 0}deg`) });
  }
  return (
    <Animated.View style={[style, { opacity: from.solid ? 1 : t, transform }]}>
      {children}
    </Animated.View>
  );
}

/* The opening screen, in the app's own picture language: teal, the rings, an
   approval card that lands and gets its yellow tick, then the name.

   It covers the app while the saved sign-in is being read, plays for a
   moment, and lifts away once `ready` is true. `onDone` is called when it
   has gone. */
export default function SplashScreen({ ready, onDone }) {
  const insets = useSafeAreaInsets();
  // One clock, in milliseconds, drives every piece
  const clock = useRef(new Animated.Value(0)).current;
  const leave = useRef(new Animated.Value(0)).current;
  const tick = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const run = Animated.timing(clock, {
      toValue: SHOW_MS,
      duration: SHOW_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    run.start(({ finished }) => finished && setPlayed(true));
    // The tick pops in with a little bounce once the card has landed
    const pop = Animated.sequence([
      Animated.delay(1050),
      Animated.spring(tick, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: true,
      }),
    ]);
    pop.start();
    // The card breathes gently while the app finishes starting
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    breathe.start();
    return () => {
      run.stop();
      pop.stop();
      breathe.stop();
    };
  }, [clock, tick, float]);

  // Played through and the app is ready: lift away
  useEffect(() => {
    if (!played || !ready) return undefined;
    const out = Animated.timing(leave, {
      toValue: 1,
      duration: LEAVE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    out.start(({ finished }) => finished && onDone());
    return () => out.stop();
  }, [played, ready, leave, onDone]);

  const bar = clock.interpolate({
    inputRange: [600, SHOW_MS - 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      accessibilityLabel="CMD Approval Hub is starting"
      style={[
        styles.host,
        {
          opacity: leave.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            {
              scale: leave.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.12],
              }),
            },
          ],
        },
      ]}
    >
      <StatusBar barStyle="light-content" />

      {/* The rings open out from the corners */}
      <Arrive clock={clock} at={0} length={900} from={{ scale: 0.4 }} style={styles.ringThinBox}>
        <View style={styles.ringThin} />
      </Arrive>
      <Arrive clock={clock} at={150} length={900} from={{ scale: 0.4 }} style={styles.ringWideBox}>
        <View style={styles.ringWide} />
      </Arrive>
      <Arrive clock={clock} at={250} length={800} from={{ scale: 0 }} style={styles.ringYellowBox}>
        <View style={styles.ringYellow} />
      </Arrive>

      <View style={styles.middle}>
        <Arrive clock={clock} at={100} from={{ scale: 0.3 }} style={styles.logo}>
          <Image source={logo} style={styles.logoImage} resizeMode="contain" />
        </Arrive>

        {/* The approval card lands, tilted, over the one behind it */}
        <Animated.View
          style={[
            styles.art,
            {
              transform: [
                {
                  translateY: float.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -ms(6)],
                  }),
                },
              ],
            },
          ]}
        >
          <Arrive
            clock={clock}
            at={350}
            from={{ y: ms(50), rotate: 0, to: 9 }}
            style={styles.cardBack}
          />
          <Arrive
            clock={clock}
            at={500}
            length={600}
            from={{ y: ms(70), rotate: -16, to: -5 }}
            style={styles.card}
          >
            <View style={[styles.line, { width: ms(84), backgroundColor: colors.mintMid }]} />
            <View style={[styles.line, styles.lineBig]} />
            <View style={styles.cardRow}>
              <View style={[styles.line, { width: ms(104), backgroundColor: colors.mint }]} />
              <Animated.View style={[styles.tick, { transform: [{ scale: tick }] }]}>
                <Icon name="check" size={20} stroke={3} />
              </Animated.View>
            </View>
          </Arrive>
        </Animated.View>

        <Arrive clock={clock} at={850} from={{ y: ms(22) }}>
          <AppText
            display
            size={38}
            lh={1.02}
            weight={800}
            track={-0.02}
            color={colors.white}
            align="center"
          >
            CMD{'\n'}Approval Hub
          </AppText>
        </Arrive>
        <Arrive clock={clock} at={1050} from={{ y: ms(14) }}>
          <AppText size={14.5} lh={1.4} weight={600} color={colors.white} align="center">
            One inbox for every CMD-level approval.
          </AppText>
        </Arrive>
      </View>

      <Arrive
        clock={clock}
        at={600}
        style={[styles.foot, { paddingBottom: insets.bottom + mvs(34) }]}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { transform: [{ scaleX: bar }] }]} />
        </View>
        <Eyebrow size={11} color={colors.white}>
          TRUSTLAB
        </Eyebrow>
      </Arrive>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.teal,
    overflow: 'hidden',
  },
  ringThinBox: { position: 'absolute', left: -s(90), top: -ms(110) },
  ringThin: {
    width: ms(340),
    height: ms(340),
    borderRadius: ms(170),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  ringWideBox: { position: 'absolute', right: -s(190), bottom: -ms(150) },
  ringWide: {
    width: ms(460),
    height: ms(460),
    borderRadius: ms(230),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  ringYellowBox: { position: 'absolute', right: -s(50), bottom: ms(70) },
  ringYellow: {
    width: ms(170),
    height: ms(170),
    borderRadius: ms(85),
    borderWidth: ms(24),
    borderColor: colors.yellow,
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(28),
    gap: mvs(14),
  },
  logo: {
    width: ms(76),
    height: ms(76),
    borderRadius: ms(38),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 14px 30px rgba(5,58,50,0.18)',
  },
  logoImage: { width: ms(54), height: ms(54) },
  art: {
    width: ms(250),
    height: ms(170),
    marginTop: mvs(10),
    marginBottom: mvs(6),
  },
  cardBack: {
    position: 'absolute',
    left: ms(34),
    top: ms(14),
    width: ms(200),
    height: ms(120),
    borderRadius: ms(26),
    backgroundColor: colors.mint,
  },
  card: {
    position: 'absolute',
    left: ms(16),
    top: ms(30),
    width: ms(214),
    borderRadius: ms(26),
    backgroundColor: colors.white,
    padding: ms(16),
    gap: mvs(12),
    boxShadow: '0px 20px 40px rgba(5,58,50,0.2)',
  },
  line: { height: ms(8), borderRadius: ms(4) },
  lineBig: {
    width: ms(130),
    height: ms(22),
    borderRadius: ms(8),
    backgroundColor: colors.ink,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tick: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foot: { alignItems: 'center', gap: mvs(14) },
  track: {
    width: s(120),
    height: ms(5),
    borderRadius: ms(3),
    backgroundColor: colors.tealLight,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    borderRadius: ms(3),
    backgroundColor: colors.yellow,
    transformOrigin: 'left',
  },
});
