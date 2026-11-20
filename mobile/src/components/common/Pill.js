import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, s } from '../../theme';
import AppText from './AppText';

const TONES = {
  ok: [colors.okTint, colors.okTintText],
  bad: [colors.badTint, colors.badTintText],
  gold: [colors.goldTint, colors.goldTintText],
};

/* Small status label. shape="tag" gives the squarer corners used on approval cards. */
export default function Pill({ label, tone = 'gold', shape = 'pill', style }) {
  const [bg, fg] = TONES[tone];
  return (
    <View
      style={[
        shape === 'tag' ? styles.tag : styles.pill,
        { backgroundColor: bg },
        style,
      ]}
    >
      <AppText size={12} weight={700} color={fg} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingVertical: ms(3), paddingHorizontal: s(10) },
  tag: { borderRadius: ms(6), paddingVertical: ms(3), paddingHorizontal: s(8) },
});
