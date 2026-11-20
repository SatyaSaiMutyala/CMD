import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHub } from '../../store/HubProvider';
import { colors, hairline, ms, mvs, s } from '../../theme';
import { AppText, Mono } from '../common';
import { TAB_BAR_HEIGHT } from '../../navigation/routes';

/* Snackbar that slides up above the tab bar when a new approval arrives; tap to open it */
export default function ArrivalBanner() {
  const { banner, openBanner } = useHub();
  const insets = useSafeAreaInsets();
  const drop = useRef(new Animated.Value(0)).current;
  const shown = !!banner;

  useEffect(() => {
    if (!shown) return;
    drop.setValue(0);
    Animated.timing(drop, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [shown, drop]);

  if (!banner) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        { bottom: ms(TAB_BAR_HEIGHT) + insets.bottom + mvs(10) },
        {
          opacity: drop,
          transform: [
            {
              translateY: drop.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={openBanner}
        style={styles.card}
      >
        <Mono label={banner.mono} size={38} radius={10} fontSize={14} />
        <View style={styles.copy}>
          <AppText size={14} weight={700} numberOfLines={1}>
            {banner.title}
          </AppText>
          <AppText size={12.5} color={colors.muted} numberOfLines={1}>
            {banner.sub}
          </AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: s(12),
    right: s(12),
    zIndex: 25,
    elevation: 12,
    borderRadius: ms(16),
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    borderWidth: hairline,
    borderColor: colors.brand,
    borderRadius: ms(16),
    paddingVertical: mvs(12),
    paddingHorizontal: s(14),
  },
  copy: { flex: 1 },
});
