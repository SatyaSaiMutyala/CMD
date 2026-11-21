import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, hairline, ms, mvs, s } from '../../theme';
import { clockUpper } from '../../utils/format';
import { AppText } from '../common';
import { Icon } from '../icons';

// How each kind of decision is marked on the timeline
const MARKS = {
  Approved: { style: 'yellow', icon: 'check', stroke: 2.8, size: 20 },
  // AIMS's first sign-off; marked as an approval
  Verified: { style: 'yellow', icon: 'check', stroke: 2.8, size: 20 },
  Released: { style: 'teal', rupee: true },
  Moved: { style: 'ring', icon: 'layers', stroke: 2.2, size: 19 },
  'Sent back': { style: 'mint', icon: 'undo', stroke: 2.4, size: 19 },
  Rejected: { style: 'dashed', icon: 'x', stroke: 2.8, size: 19 },
};

/* One decision on the History timeline: its mark, joined to the next by a
   line (not after the `last` of a day), and a card with what was decided. */
export default function HistoryRow({ entry, last }) {
  const mark = MARKS[entry.verb] || MARKS.Approved;
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.mark, styles[mark.style]]}>
          {mark.rupee ? (
            <AppText size={19} weight={800} color={colors.white}>
              ₹
            </AppText>
          ) : (
            <Icon name={mark.icon} size={mark.size} stroke={mark.stroke} />
          )}
        </View>
        {last ? null : <View style={styles.line} />}
      </View>
      <View style={[styles.card, last ? null : styles.cardGap]}>
        <View style={styles.top}>
          <AppText size={11.5} weight={800} track={0.06} style={styles.verb}>
            {entry.verb.toUpperCase()} · {clockUpper(entry.ts)}
          </AppText>
          <AppText size={15} weight={800}>
            {entry.amount}
          </AppText>
        </View>
        <AppText size={14} weight={700} numberOfLines={1}>
          {entry.party}
        </AppText>
        <AppText size={12} color={colors.muted} numberOfLines={1}>
          {entry.sw} · {entry.id}
        </AppText>
        {entry.reason ? (
          <AppText size={12} lh={1.4} color={colors.muted}>
            Reason: {entry.reason}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: s(12) },
  rail: { width: ms(44), alignItems: 'center' },
  mark: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  yellow: { backgroundColor: colors.yellow },
  teal: { backgroundColor: colors.teal },
  mint: { backgroundColor: colors.mint },
  ring: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.teal,
  },
  dashed: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.teal,
  },
  line: { flex: 1, width: 2, backgroundColor: colors.line },
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: ms(22),
    paddingVertical: ms(12),
    paddingHorizontal: s(14),
    gap: mvs(5),
  },
  cardGap: { marginBottom: mvs(10) },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: s(10) },
  verb: { flexShrink: 1 },
});
