import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, mvs, s } from '../../theme';
import { shortStamp } from '../../utils/format';
import { AppText, Card, Pill } from '../common';

const TONE = {
  Approved: 'ok',
  Released: 'ok',
  'Sent back': 'bad',
  Rejected: 'bad',
  Moved: 'gold',
};

/* One past decision */
export default function HistoryRow({ entry }) {
  return (
    <Card radius={14} style={styles.row}>
      <View style={styles.copy}>
        <AppText size={14} weight={600}>
          {entry.party} · {entry.amount}
        </AppText>
        <AppText size={12} color={colors.muted}>
          {entry.sw} · {entry.id} · {shortStamp(entry.ts)}
        </AppText>
      </View>
      <Pill tone={TONE[entry.verb] || 'gold'} label={entry.verb} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(12),
    paddingVertical: mvs(14),
    paddingHorizontal: s(16),
  },
  copy: { flex: 1 },
});
