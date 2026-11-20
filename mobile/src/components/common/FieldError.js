import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, s } from '../../theme';
import { Icon } from '../icons';
import AppText from './AppText';

/* The yellow line under a field that needs correcting */
export default function FieldError({ text, style }) {
  return (
    <View accessibilityRole="alert" style={[styles.line, style]}>
      <Icon name="alert" size={14} stroke={2.6} />
      <AppText size={12.5} weight={700} style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    paddingVertical: ms(6),
    paddingHorizontal: s(10),
    borderRadius: ms(10),
    backgroundColor: colors.yellow,
  },
  text: { flexShrink: 1 },
});
