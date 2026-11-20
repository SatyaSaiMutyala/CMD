import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, s } from '../../theme';
import { Icon } from '../icons';
import AppText from './AppText';

/* A small rounded label: stage, due date, tag, status */
export default function Pill({
  label,
  icon,
  height = 28,
  bg = colors.white,
  color = colors.ink,
  size = 12,
  weight = 800,
  radius,
  pad = 11,
  track,
  iconSize = 13,
  iconStroke = 2.6,
  border,
  dashed,
  style,
}) {
  const h = ms(height);
  return (
    <View
      style={[
        styles.pill,
        {
          height: h,
          borderRadius: radius != null ? ms(radius) : h / 2,
          paddingHorizontal: s(pad),
          backgroundColor: bg,
        },
        border
          ? {
              borderWidth: 1.5,
              borderColor: border,
              borderStyle: dashed ? 'dashed' : 'solid',
            }
          : null,
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={iconSize} stroke={iconStroke} color={color} />
      ) : null}
      <AppText
        size={size}
        weight={weight}
        color={color}
        track={track}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: s(5),
  },
});
