import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, ms, s } from '../../theme';
import { Icon } from '../icons';
import AppText from './AppText';

const VARIANTS = {
  yellow: { bg: colors.yellow, fg: colors.ink },
  teal: { bg: colors.teal, fg: colors.white },
  white: { bg: colors.white, fg: colors.ink },
  mint: { bg: colors.mint, fg: colors.ink },
  outline: { bg: colors.white, fg: colors.ink, border: colors.line },
  outlineTeal: { bg: colors.white, fg: colors.ink, border: colors.teal },
  text: { bg: 'transparent', fg: colors.ink },
};

/* The pill button of the design.
   icon / iconRight  an icon before or after the label
   trail             an icon inside a white circle at the right end; the label
                     then sits at the left ("Sign in →")
   lead              the same circle at the left end, the label at the right
                     ("» Start swipe review")                                   */
export default function Button({
  label,
  onPress,
  variant = 'teal',
  height = 56,
  fontSize = 15,
  weight = 800,
  icon,
  iconRight,
  iconSize = 18,
  iconStroke = 2.4,
  trail,
  lead,
  underline,
  shadow,
  disabled,
  style,
  ...rest
}) {
  const look = VARIANTS[variant];
  const h = ms(height);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      {...rest}
      style={({ pressed }) => [
        styles.button,
        {
          height: h,
          borderRadius: h / 2,
          backgroundColor: look.bg,
          borderWidth: look.border ? 2 : 0,
          borderColor: look.border,
        },
        trail ? styles.withTrail : null,
        lead ? styles.withLead : null,
        shadow ? { boxShadow: shadow } : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {lead ? (
        <View style={[styles.trail, { width: h - ms(14), height: h - ms(14) }]}>
          <Icon name={lead} size={20} stroke={2.4} color={colors.ink} />
        </View>
      ) : null}
      {icon ? (
        <Icon name={icon} size={iconSize} stroke={iconStroke} color={look.fg} />
      ) : null}
      <AppText
        size={fontSize}
        weight={weight}
        color={look.fg}
        underline={underline}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {iconRight ? (
        <Icon
          name={iconRight}
          size={iconSize}
          stroke={iconStroke}
          color={look.fg}
        />
      ) : null}
      {trail ? (
        <View style={styles.trail}>
          <Icon name={trail} size={20} stroke={2.4} color={colors.ink} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(9),
    paddingHorizontal: s(18),
  },
  withTrail: {
    justifyContent: 'space-between',
    paddingLeft: s(24),
    paddingRight: ms(7),
  },
  withLead: {
    justifyContent: 'space-between',
    paddingLeft: ms(7),
    paddingRight: s(24),
  },
  trail: {
    width: ms(46),
    height: ms(46),
    borderRadius: ms(23),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
});
