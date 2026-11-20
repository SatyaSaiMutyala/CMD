import React from 'react';
import { colors } from '../../theme';
import AppText from './AppText';

/* Small spaced capitals above a block: "WAITING FOR YOU", "REFERENCE" */
export default function Eyebrow({
  children,
  size = 12,
  track = 0.09,
  color = colors.muted,
  ...rest
}) {
  return (
    <AppText size={size} weight={800} track={track} color={color} {...rest}>
      {children}
    </AppText>
  );
}
