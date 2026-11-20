import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { colors, ms } from '../../theme';

const W = ms(52);
const H = ms(32);
const KNOB = ms(26);
const PAD = ms(3);

/* On/off switch: yellow when on */
export default function Toggle({ value, onChange, label }) {
  const at = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(at, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [value, at]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: !!value }}
      accessibilityLabel={label}
      onPress={onChange}
      hitSlop={8}
      style={[
        styles.track,
        { backgroundColor: value ? colors.yellow : colors.tealLight },
      ]}
    >
      <Animated.View
        style={[
          styles.knob,
          {
            transform: [
              {
                translateX: at.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, W - KNOB - PAD * 2],
                }),
              },
            ],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2 },
  knob: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.white,
  },
});
