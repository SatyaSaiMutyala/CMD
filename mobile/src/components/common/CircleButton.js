import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, ms } from '../../theme';
import { Icon } from '../icons';

/* A round icon button: back, close, approve, details… */
export default function CircleButton({
  icon,
  label,
  onPress,
  size = 46,
  iconSize = 22,
  stroke = 2.2,
  bg = colors.white,
  border = colors.line,
  borderWidth = 1.5,
  color = colors.ink,
  shadow,
  disabled,
  style,
  children,
}) {
  const px = ms(size);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        {
          width: px,
          height: px,
          borderRadius: px / 2,
          backgroundColor: bg,
          borderWidth: border ? borderWidth : 0,
          borderColor: border || 'transparent',
        },
        shadow ? { boxShadow: shadow } : null,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      {children || (
        <Icon name={icon} size={iconSize} stroke={stroke} color={color} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
