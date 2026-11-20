import React from 'react';
import { View } from 'react-native';
import { colors, ms } from '../../theme';
import AppText from './AppText';

/* The two-letter mark of a software ("LT") on a rounded tile */
export default function Mono({
  label,
  size = 48,
  radius = 16,
  bg = colors.teal,
  color = colors.white,
  fontSize = 17,
  display = true,
  style,
  children,
}) {
  const px = ms(size);
  return (
    <View
      style={[
        {
          width: px,
          height: px,
          borderRadius: ms(radius),
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <AppText display={display} size={fontSize} weight={800} color={color}>
        {label}
      </AppText>
      {children}
    </View>
  );
}
