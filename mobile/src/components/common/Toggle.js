import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { colors, ms } from '../../theme';

const WIDTH = ms(52);
const HEIGHT = ms(32);
const KNOB = ms(26);
const PAD = ms(3);

/* On/off switch drawn to match the design (the platform switch looks different on each OS) */
export default function Toggle({ value, onChange, label }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(x, {
      toValue: value ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [value, x]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={onChange}
      hitSlop={8}
      style={[
        styles.track,
        { backgroundColor: value ? colors.brand : colors.switchOff },
      ]}
    >
      <Animated.View
        style={[
          styles.knob,
          {
            transform: [
              {
                translateX: x.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, WIDTH - KNOB - PAD * 2],
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
  track: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    padding: PAD,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
