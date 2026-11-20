import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gutter, ms, mvs, s } from '../../theme';
import { BackIcon } from '../icons';
import AppText from './AppText';
import Mono from './Mono';

/* Dark page header: optional "Hub" back link, optional monogram, title and sub-line */
export default function ScreenHeader({ title, sub, mono, onBack }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: mvs(10) + insets.top }]}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to hub"
          onPress={onBack}
          hitSlop={8}
          style={styles.back}
        >
          <BackIcon color={colors.onBrand} />
          <AppText size={14} weight={600} color={colors.onBrand}>
            Hub
          </AppText>
        </Pressable>
      ) : null}
      <View
        style={[styles.titleRow, onBack ? styles.afterBack : styles.noBack]}
      >
        {mono ? <Mono label={mono} inverted /> : null}
        <View style={styles.titles}>
          <AppText
            display
            size={22}
            lh={1.15}
            color={colors.onBrand}
            accessibilityRole="header"
          >
            {title}
          </AppText>
          <AppText size={12} color={colors.onBrandSoft}>
            {sub}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.brand,
    paddingHorizontal: gutter,
    paddingBottom: mvs(16),
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: s(6),
    minHeight: ms(44),
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  afterBack: { marginTop: mvs(2) },
  noBack: { marginTop: mvs(14) },
  titles: { flex: 1 },
});
