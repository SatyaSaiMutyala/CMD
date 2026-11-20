import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, gutter, ms, mvs, s } from '../../theme';
import AppText from './AppText';

/* Green confirmation strip shown after a decision */
export default function Notice({ text }) {
  return (
    <View accessibilityRole="alert" style={styles.box}>
      <AppText size={13.5} weight={500} color={colors.okTintText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: gutter,
    marginBottom: mvs(14),
    backgroundColor: colors.okTint,
    borderWidth: 1,
    borderColor: colors.okTintLine,
    borderRadius: ms(10),
    paddingVertical: mvs(10),
    paddingHorizontal: s(14),
  },
});
