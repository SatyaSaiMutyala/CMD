import React from 'react';
import { StyleSheet } from 'react-native';
import { colors, gutter, mvs, s } from '../../theme';
import AppText from './AppText';
import Card from './Card';

/* Message card for "nothing here". `dashed` is the left-aligned placeholder style. */
export default function EmptyState({ title, text, dashed, style }) {
  const align = dashed ? 'left' : 'center';
  return (
    <Card
      radius={18}
      dashed={dashed}
      borderColor={dashed ? colors.dashedLine : colors.line}
      style={[styles.card, dashed ? styles.dashed : styles.solid, style]}
    >
      <AppText display size={20} align={align} style={styles.title}>
        {title}
      </AppText>
      <AppText size={14.5} lh={1.55} color={colors.muted} align={align}>
        {text}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: gutter,
    marginVertical: mvs(8),
    paddingHorizontal: s(22),
  },
  solid: { paddingVertical: mvs(36) },
  dashed: { paddingVertical: mvs(28) },
  title: { marginBottom: mvs(8) },
});
