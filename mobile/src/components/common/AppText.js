import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, fontStyle, fs } from '../../theme';

/* The one text component. Sizes are given in design pixels and scaled here
   (theme/metrics.js: fs).
   display  Bricolage Grotesque instead of Inter (titles, amounts, counts)
   lh       line height as a multiple of the font size (e.g. 1.4)
   track    letter spacing as a multiple of the font size (e.g. 0.09)       */
export default function AppText({
  size = 14,
  weight = 400,
  display = false,
  color = colors.ink,
  lh,
  track,
  align,
  underline,
  style,
  ...rest
}) {
  const fontSize = fs(size);
  return (
    <Text
      // The same size on every phone, whatever its text-size setting: the
      // layout is drawn tightly and the two platforms scale text differently
      allowFontScaling={false}
      {...rest}
      style={[
        styles.base,
        fontStyle(display, weight),
        { fontSize, color },
        // Never tighter than the glyphs themselves: tall digits would be cut
        lh ? { lineHeight: fontSize * Math.max(lh, 1) } : null,
        track != null ? { letterSpacing: fontSize * track } : null,
        align ? { textAlign: align } : null,
        underline ? styles.underline : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
  underline: { textDecorationLine: 'underline' },
});
