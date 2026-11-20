import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, hairline, ms } from '../../theme';

/* White bordered surface used for every card and row in the app */
export default function Card({
  radius = 16,
  borderColor = colors.line,
  dashed,
  style,
  children,
  ...rest
}) {
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { borderRadius: ms(radius), borderColor },
        dashed ? styles.dashed : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: hairline },
  dashed: { borderStyle: 'dashed' },
});
