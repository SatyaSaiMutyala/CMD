import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ms, mvs, s } from '../../theme';
import { longDate } from '../../utils/format';
import { AppText } from '../common';
import { HexIcon } from '../icons';

/* Dark header of the home screen: brand, date and the big pending count */
export default function HomeHero({ total, userName }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { paddingTop: mvs(18) + insets.top }]}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <HexIcon />
          <AppText display size={16} color={colors.onBrand}>
            CMD Approval Hub
          </AppText>
        </View>
        <View style={styles.avatar}>
          <AppText size={14} weight={700} color={colors.onBrand}>
            {(userName || '?').charAt(0).toUpperCase()}
          </AppText>
        </View>
      </View>
      <AppText size={13} color={colors.onBrandSoft} style={styles.date}>
        {longDate(new Date())}
      </AppText>
      <View
        style={styles.big}
        accessible
        accessibilityLabel={`${total} ${
          total === 1 ? 'item needs' : 'items need'
        } your decision`}
      >
        <AppText display size={60} lh={1} color={colors.onBrand}>
          {total}
        </AppText>
        <AppText size={16} lh={1.3} color={colors.onBrand}>
          {total === 1 ? 'item needs' : 'items need'}
          {'\n'}your decision
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.brand,
    paddingHorizontal: s(20),
    paddingBottom: mvs(26),
    borderBottomLeftRadius: ms(26),
    borderBottomRightRadius: ms(26),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  avatar: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: colors.brandDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: { marginTop: mvs(22) },
  big: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: s(12),
    marginTop: mvs(4),
  },
});
