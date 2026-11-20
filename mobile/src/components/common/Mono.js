import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms } from '../../theme';
import AppText from './AppText';

/* Two-letter software monogram. `inverted` is the white version used on brand-coloured headers. */
export default function Mono({
  label,
  size = 44,
  radius = 12,
  fontSize = 15,
  inverted,
}) {
  const px = ms(size);
  return (
    <View
      style={[
        styles.box,
        {
          width: px,
          height: px,
          borderRadius: ms(radius),
          backgroundColor: inverted ? colors.onBrand : colors.brand,
        },
      ]}
    >
      <AppText
        display
        size={fontSize}
        color={inverted ? colors.brandDark : colors.onBrand}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
