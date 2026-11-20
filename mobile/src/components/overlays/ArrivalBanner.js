import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHub } from '../../store/HubProvider';
import { BANNER_MS } from '../../store/hubThunks';
import { colors, ms, mvs, s, shadows } from '../../theme';
import { AppText } from '../common';
import { Icon } from '../icons';

/* The teal card that drops in from the top when a new approval arrives.
   Tap it to open the software it is about; it leaves by itself, and the
   yellow line along its bottom shows how long it has left. */
export default function ArrivalBanner() {
  const { banner, openBanner } = useHub();
  const insets = useSafeAreaInsets();
  const drop = useRef(new Animated.Value(0)).current;
  const left = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!banner) return undefined;
    drop.setValue(0);
    left.setValue(1);
    Animated.timing(drop, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const countdown = Animated.timing(left, {
      toValue: 0,
      duration: BANNER_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    countdown.start();
    return () => countdown.stop();
  }, [banner, drop, left]);

  if (!banner) return null;

  // "New approval · ₹7,662": the amount is picked out in yellow
  const [lead, ...rest] = String(banner.title).split(' · ');
  const amount = rest.find(part => part.startsWith('₹'));

  return (
    <Animated.View
      style={[
        styles.wrap,
        { top: insets.top + mvs(8) },
        {
          opacity: drop,
          transform: [
            {
              translateY: drop.interpolate({
                inputRange: [0, 1],
                outputRange: [-ms(90), 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${banner.title}. ${banner.sub}`}
        onPress={openBanner}
        style={styles.card}
      >
        <View style={styles.mono}>
          <AppText display size={17} weight={800}>
            {banner.mono}
          </AppText>
          <View style={styles.dot} />
        </View>
        <View style={styles.copy}>
          <View style={styles.title}>
            <AppText size={15.5} weight={800} color={colors.white} numberOfLines={1}>
              {amount ? `${lead} · ` : banner.title}
            </AppText>
            {amount ? (
              <View style={styles.amount}>
                <AppText size={15.5} weight={800}>
                  {amount}
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText
            size={12.5}
            lh={1.35}
            weight={600}
            color={colors.white}
            numberOfLines={1}
          >
            {banner.sub}
          </AppText>
        </View>
        <Icon name="chevronRight" size={20} stroke={2.4} color={colors.white} />
        <View style={styles.track}>
          <Animated.View
            style={[styles.left, { transform: [{ scaleX: left }] }]}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: s(12), right: s(12) },
  card: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    backgroundColor: colors.teal,
    borderRadius: ms(30),
    paddingTop: ms(14),
    paddingHorizontal: ms(14),
    paddingBottom: ms(20),
    boxShadow: shadows.banner,
  },
  mono: {
    width: ms(52),
    height: ms(52),
    borderRadius: ms(26),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: ms(16),
    height: ms(16),
    borderRadius: ms(8),
    backgroundColor: colors.yellow,
    borderWidth: 3,
    borderColor: colors.teal,
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  title: { flexDirection: 'row', alignItems: 'center' },
  amount: {
    paddingVertical: 1,
    paddingHorizontal: ms(7),
    borderRadius: ms(8),
    backgroundColor: colors.yellow,
  },
  track: {
    position: 'absolute',
    left: ms(24),
    right: ms(24),
    bottom: ms(9),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: colors.tealLight,
    overflow: 'hidden',
  },
  left: {
    flex: 1,
    borderRadius: ms(2),
    backgroundColor: colors.yellow,
    transformOrigin: 'left',
  },
});
