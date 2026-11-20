import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, gutter, hairline, ms, mvs, s } from '../../theme';
import { Shimmer } from '../common';

/* The shapes of the app's cards, shimmering, shown while their data is being
   fetched. Each matches the size of the real card, so nothing jumps when the
   data arrives. */

/* One row of the approvals list */
function RowSkeleton() {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <View style={styles.line}>
          <Shimmer width={96} height={12} />
          <Shimmer width={70} height={22} radius={11} />
        </View>
        <Shimmer width="85%" height={14} />
        <Shimmer width={130} height={24} radius={8} />
        <Shimmer width="60%" height={11} />
      </View>
      <View style={styles.rowButtons}>
        <Shimmer width={48} height={48} radius={24} />
        <Shimmer width={48} height={48} radius={24} />
      </View>
    </View>
  );
}

/* The approvals list: the "move all" bar and a few rows */
export function ListSkeleton({ rows = 4 }) {
  return (
    <View accessibilityLabel="Loading approvals" style={styles.stack}>
      <Shimmer width="100%" height={56} radius={28} />
      <Shimmer width={190} height={12} style={styles.hint} />
      {Array.from({ length: rows }, (_, i) => (
        <RowSkeleton key={i} />
      ))}
    </View>
  );
}

/* A day of the History timeline */
export function HistorySkeleton({ rows = 4 }) {
  return (
    <View accessibilityLabel="Loading history" style={styles.stack}>
      <Shimmer width={90} height={18} style={styles.hint} />
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.history}>
          <Shimmer width={44} height={44} radius={22} />
          <View style={styles.historyCard}>
            <View style={styles.line}>
              <Shimmer width={120} height={11} />
              <Shimmer width={60} height={14} />
            </View>
            <Shimmer width="80%" height={13} />
            <Shimmer width="55%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

/* Rows of the Notifications page (they run the full width of the screen) */
export function NotificationsSkeleton({ rows = 6 }) {
  return (
    <View accessibilityLabel="Loading notifications" style={styles.bleed}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.note}>
          <Shimmer width={46} height={46} radius={23} />
          <View style={styles.noteCopy}>
            <View style={styles.line}>
              <Shimmer width={150} height={13} />
              <Shimmer width={48} height={11} />
            </View>
            <Shimmer width="90%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

/* The body of the details page: the document cards, then two panels */
export function DetailsSkeleton() {
  return (
    <View accessibilityLabel="Loading the details">
      <View style={styles.docs}>
        {[0, 1].map(i => (
          <View key={i} style={styles.doc}>
            <Shimmer width="100%" height={96} radius={14} />
            <Shimmer width="70%" height={13} />
            <Shimmer width="90%" height={11} />
          </View>
        ))}
      </View>
      <View style={styles.panels}>
        {[5, 3].map((lines, p) => (
          <View key={p} style={styles.panel}>
            <Shimmer width={110} height={18} />
            {Array.from({ length: lines }, (_, i) => (
              <View key={i} style={styles.line}>
                <Shimmer width={130} height={12} />
                <Shimmer width={90} height={12} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: mvs(14) },
  hint: { marginHorizontal: s(4) },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(8),
  },
  row: {
    flexDirection: 'row',
    gap: s(12),
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: ms(26),
    paddingVertical: ms(14),
    paddingRight: ms(14),
    paddingLeft: ms(16),
  },
  rowCopy: { flex: 1, gap: mvs(9) },
  rowButtons: { justifyContent: 'center', gap: mvs(8) },

  history: { flexDirection: 'row', gap: s(12) },
  historyCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: ms(22),
    paddingVertical: ms(12),
    paddingHorizontal: s(14),
    gap: mvs(8),
  },

  bleed: { marginHorizontal: -gutter },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    borderTopWidth: hairline,
    borderTopColor: colors.line,
    paddingVertical: ms(14),
    paddingHorizontal: gutter,
  },
  noteCopy: { flex: 1, gap: mvs(8) },

  docs: {
    flexDirection: 'row',
    gap: s(12),
    paddingHorizontal: s(20),
    marginTop: -ms(86),
  },
  doc: {
    width: s(148),
    borderRadius: ms(24),
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
    padding: ms(12),
    gap: mvs(8),
  },
  panels: { paddingTop: mvs(22), paddingHorizontal: s(16), gap: mvs(14) },
  panel: {
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: ms(28),
    padding: s(18),
    gap: mvs(14),
  },
});
