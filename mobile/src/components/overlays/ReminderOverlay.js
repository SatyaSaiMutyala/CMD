import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { REGISTRY } from '../../data/registry';
import { useHub } from '../../store/HubProvider';
import { swPending, totalPending } from '../../store/selectors';
import { colors, ms, mvs, s } from '../../theme';
import { clockTime } from '../../utils/format';
import { AppText, Button, Eyebrow } from '../common';

const RING = ms(170);

/* Brand-coloured glow behind the count, fading to the darker shade */
function Glow() {
  const { width, height } = useWindowDimensions();
  const cy = height * 0.28;
  const radius = 0.62 * Math.hypot(width / 2, height - cy);
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient
          id="glow"
          gradientUnits="userSpaceOnUse"
          cx={width / 2}
          cy={cy}
          r={radius}
        >
          <Stop offset="0" stopColor={colors.brand} />
          <Stop offset="1" stopColor={colors.brandDark} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#glow)" />
    </Svg>
  );
}

/* A ring that pulses outwards; two are shown, half a cycle apart */
function PulseRing({ delay, still }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (still) return undefined;
    // The second ring starts half a cycle later, so one ring is always in view
    const loop = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ]);
    loop.start();
    return () => loop.stop();
  }, [delay, still, pulse]);

  return (
    <Animated.View
      style={[
        styles.pulse,
        still
          ? styles.pulseStill
          : {
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 0],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1.25],
                  }),
                },
              ],
            },
      ]}
    />
  );
}

/* Full-screen reminder every 15 minutes of what is still pending */
export default function ReminderOverlay() {
  const { remindOpen, store, reviewNow, snoozeReminder, dismissReminder } =
    useHub();
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (!remindOpen) return undefined;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      dismissReminder();
      return true;
    });
    return () => back.remove();
  }, [remindOpen, fade, dismissReminder]);

  if (!remindOpen) return null;

  const total = totalPending(store);
  let rows = REGISTRY.filter(sw => sw.connected && swPending(store, sw) > 0);
  if (!rows.length) rows = REGISTRY.filter(sw => sw.connected);

  return (
    <Animated.View
      style={[styles.host, { opacity: fade }]}
      accessibilityViewIsModal
    >
      <Glow />
      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: mvs(48) + insets.top,
            paddingBottom: mvs(28) + insets.bottom,
          },
        ]}
      >
        <AppText size={14} color={colors.onBrandSoft} spacing={0.5}>
          {clockTime(new Date())}
        </AppText>
        <Eyebrow
          size={12}
          spacing={1.6}
          color={colors.onBrand}
          style={styles.head}
        >
          APPROVALS PENDING
        </Eyebrow>

        <View style={styles.ring}>
          <PulseRing delay={0} still={reduceMotion} />
          {reduceMotion ? null : <PulseRing delay={1200} />}
          <AppText display size={96} lh={1} color={colors.onBrand}>
            {total}
          </AppText>
        </View>

        <AppText
          display
          weight={600}
          size={22}
          color={colors.white}
          align="center"
          style={styles.label}
        >
          {total === 1 ? 'approval is' : 'approvals are'} waiting for you
        </AppText>

        <View style={styles.list}>
          {rows.map((sw, i) => (
            <View key={sw.id} style={[styles.row, i ? styles.rowLine : null]}>
              <AppText size={16} color={colors.white}>
                {sw.name}
              </AppText>
              <AppText display size={18} color={colors.onBrand}>
                {swPending(store, sw) || 0}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />

        <Button
          variant="light"
          size="xl"
          label="Review now"
          onPress={reviewNow}
          style={styles.review}
        />
        <Button
          variant="glass"
          size="xl"
          height={50}
          fontSize={15}
          label="Remind me in 15 minutes"
          onPress={snoozeReminder}
          style={styles.snooze}
        />
        <AppText
          size={14}
          color={colors.onBrandSoft}
          underline
          accessibilityRole="button"
          onPress={dismissReminder}
          style={styles.dismiss}
        >
          Dismiss
        </AppText>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.brandDark,
    zIndex: 30,
    elevation: 30,
  },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: s(24) },
  head: { marginTop: mvs(6) },
  ring: {
    width: RING,
    height: RING,
    marginTop: mvs(34),
    marginBottom: mvs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    ...StyleSheet.absoluteFill,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: colors.onBrand,
  },
  pulseStill: { opacity: 0.5 },
  label: { marginBottom: mvs(24) },
  list: {
    alignSelf: 'stretch',
    backgroundColor: colors.glassSoft,
    borderRadius: ms(16),
    paddingVertical: mvs(4),
    paddingHorizontal: s(16),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: s(12),
    paddingVertical: mvs(13),
  },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.glassLine },
  spacer: { flexGrow: 1, minHeight: mvs(24) },
  review: { alignSelf: 'stretch' },
  snooze: { alignSelf: 'stretch', marginTop: mvs(12) },
  dismiss: { marginTop: mvs(14), padding: ms(8) },
});
