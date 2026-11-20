import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, ms } from '../../theme';

/* A grey-green block with a band of light sweeping across it: the shape of
   something that is still being fetched. Build a "skeleton" of a card out of
   a few of these, the same sizes as the real thing.

   Every block on screen shares one clock, so the light crosses them together
   and a page full of them costs no more than one animation. */

const sweep = new Animated.Value(0);
let users = 0;
let loop = null;

const start = () => {
  users += 1;
  if (loop) return;
  sweep.setValue(0);
  loop = Animated.loop(
    Animated.timing(sweep, {
      toValue: 1,
      duration: 1150,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }),
  );
  loop.start();
};

const stop = () => {
  users -= 1;
  if (users > 0 || !loop) return;
  loop.stop();
  loop = null;
};

/* width / height in design pixels (or a '%' string for width); `radius`
   rounds it; `tone` "mint" (on white) or "teal" (on a teal header). */
export default function Shimmer({
  width,
  height = 12,
  radius = 6,
  tone = 'mint',
  style,
}) {
  useEffect(() => {
    start();
    return stop;
  }, []);

  return (
    <View
      style={[
        styles.block,
        {
          width: typeof width === 'number' ? ms(width) : width,
          height: ms(height),
          borderRadius: ms(radius),
          backgroundColor: tone === 'teal' ? colors.tealLight : colors.mint,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.band,
          {
            transform: [
              {
                translateX: sweep.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-ms(140), ms(420)],
                }),
              },
              { skewX: '-18deg' },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { overflow: 'hidden' },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: ms(90),
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
});
