import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, fontFor, ms } from '../../theme';

/* The one text component. Sizes are given in design pixels and scaled here.
   display  use Space Grotesk instead of Inter
   lh       line height as a multiple of the font size (e.g. 1.4)
   spacing  letter spacing in points                                        */
export default function AppText({
  size = 14,
  weight = 400,
  display = false,
  color = colors.ink,
  lh,
  spacing,
  align,
  underline,
  style,
  ...rest
}) {
  const fontSize = ms(size);
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[
        { fontFamily: fontFor(display, weight), fontSize, color },
        lh ? { lineHeight: fontSize * lh } : null,
        spacing != null ? { letterSpacing: spacing } : null,
        align ? { textAlign: align } : null,
        underline ? styles.underline : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  underline: { textDecorationLine: 'underline' },
});
