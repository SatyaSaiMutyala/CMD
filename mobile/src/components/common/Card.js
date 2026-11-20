import React from 'react';
import { View } from 'react-native';
import { colors, hairline, ms, s } from '../../theme';

/* A rounded surface. White with a border by default; give `bg` for a tint. */
export default function Card({
  children,
  bg = colors.white,
  radius = 28,
  pad = 18,
  border = bg === colors.white,
  shadow,
  style,
  ...rest
}) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: bg,
          borderRadius: ms(radius),
          padding: s(pad),
          borderWidth: border ? hairline : 0,
          borderColor: colors.line,
        },
        shadow ? { boxShadow: shadow } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
