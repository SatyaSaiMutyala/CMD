import React from 'react';
import { View } from 'react-native';
import { ms } from '../../theme';

/* The soft circles and rings the design draws behind its pages.
   Position them with `style` (left / right / top / bottom, in design pixels
   passed through ms()). They never take touches. */

export function Disc({ size, color, style }) {
  const px = ms(size);
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: px,
          height: px,
          borderRadius: px / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function Ring({ size, color, width = 2, opacity = 1, style }) {
  const px = ms(size);
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: px,
          height: px,
          borderRadius: px / 2,
          borderWidth: ms(width),
          borderColor: color,
          opacity,
        },
        style,
      ]}
    />
  );
}
