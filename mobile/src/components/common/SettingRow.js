import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, mvs, s } from '../../theme';
import AppText from './AppText';
import Card from './Card';

/* A titled row with a short explanation and one control on the right */
export default function SettingRow({ title, text, children }) {
  return (
    <Card radius={14} style={styles.row}>
      <View style={styles.copy}>
        <AppText size={14.5} weight={700}>
          {title}
        </AppText>
        <AppText size={12.5} lh={1.4} color={colors.muted} style={styles.text}>
          {text}
        </AppText>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(14),
    paddingVertical: mvs(14),
    paddingHorizontal: s(16),
  },
  copy: { flex: 1 },
  text: { marginTop: mvs(2) },
});
