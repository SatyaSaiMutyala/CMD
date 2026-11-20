import React from 'react';
import { colors } from '../../theme';
import AppText from './AppText';

/* Small capital section label */
export default function Eyebrow({
  children,
  color = colors.muted,
  spacing = 1.3,
  size = 11,
  style,
}) {
  return (
    <AppText
      size={size}
      weight={700}
      color={color}
      spacing={spacing}
      style={style}
    >
      {children}
    </AppText>
  );
}
