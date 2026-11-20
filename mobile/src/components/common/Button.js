import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, hairline, ms, s } from '../../theme';
import AppText from './AppText';

const VARIANTS = {
  approve: { bg: colors.ok, fg: colors.white },
  danger: { bg: colors.bad, fg: colors.white },
  dangerOutline: { bg: colors.white, fg: colors.bad, border: colors.bad },
  primary: { bg: colors.brand, fg: colors.onBrand },
  ghost: { bg: colors.white, fg: colors.ink, border: colors.line },
  light: { bg: colors.white, fg: colors.brandDark },
  glass: { bg: colors.glass, fg: colors.white },
};

const SIZES = {
  mini: { height: 40, font: 13.5, radius: 10, weight: 600, padX: 14 },
  md: { height: 48, font: 15, radius: 12, weight: 700, padX: 12 },
  lg: { height: 54, font: 16, radius: 12, weight: 700, padX: 12 },
  xl: { height: 56, font: 17, radius: 16, weight: 700, padX: 12 },
};

/* variant: colour scheme (see VARIANTS)   size: mini | md | lg | xl
   `height`, `fontSize`, `weight` and `radius` override single values of a size. */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  height,
  fontSize,
  weight,
  radius,
  style,
  ...rest
}) {
  const v = VARIANTS[variant];
  const z = SIZES[size];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: ms(height || z.height),
          borderRadius: ms(radius || z.radius),
          paddingHorizontal: s(z.padX),
          backgroundColor: v.bg,
          borderColor: v.border || 'transparent',
          borderWidth: v.border ? hairline : 0,
          opacity: rest.disabled ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <AppText
        size={fontSize || z.font}
        weight={weight || z.weight}
        color={v.fg}
        align="center"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
