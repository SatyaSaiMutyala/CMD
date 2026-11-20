import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { HistoryRow, HistorySkeleton } from '../components/approvals';
import {
  AppText,
  Disc,
  EmptyState,
  Screen,
  ScreenHeader,
} from '../components/common';
import { useHub } from '../store/HubProvider';
import { colors, gutter, hairline, ms, mvs, s } from '../theme';
import { dayLabel } from '../utils/format';

const FILTERS = ['All', 'Approved', 'Released', 'Moved', 'Sent back', 'Rejected'];

/* Decisions made so far, newest first: a timeline, one heading per day, and
   chips to show one kind of decision only */
export default function HistoryScreen() {
  const { store } = useHub();
  const [filter, setFilter] = useState('All');
  const shown = store.history.filter(
    entry => filter === 'All' || entry.verb === filter,
  );

  // Newest first already: a new heading whenever the day changes
  const days = [];
  shown.forEach(entry => {
    const label = dayLabel(entry.ts);
    const day = days[days.length - 1];
    if (day && day.label === label) day.entries.push(entry);
    else days.push({ label, entries: [entry] });
  });

  return (
    <Screen
      top={12}
      backdrop={<Disc size={380} color={colors.mint} style={styles.disc} />}
    >
      <ScreenHeader
        large
        title="History"
        sub="Your decisions in the hub · same on every device"
      />
      <ScrollView
        horizontal
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        style={styles.chipScroll}
        contentContainerStyle={styles.chips}
      >
        {FILTERS.map(name => {
          const on = name === filter;
          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(name)}
              style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
            >
              <AppText
                size={13}
                weight={on ? 800 : 700}
                color={on ? colors.white : colors.ink}
              >
                {name}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {!store.historyLoaded ? (
        <HistorySkeleton />
      ) : days.length ? (
        days.map((day, d) => (
          <View key={day.label}>
            <AppText
              display
              size={18}
              weight={800}
              accessibilityRole="header"
              style={[styles.day, d ? styles.dayNext : null]}
            >
              {day.label}
            </AppText>
            {day.entries.map((entry, i) => (
              <HistoryRow
                key={`${entry.ts}-${entry.id}-${entry.verb}`}
                entry={entry}
                last={i === day.entries.length - 1}
              />
            ))}
          </View>
        ))
      ) : (
        <EmptyState
          title={filter === 'All' ? 'No decisions yet' : `Nothing ${filter.toLowerCase()} yet`}
          text="Every approval, release, send-back and rejection you make in the hub is listed here."
          style={styles.empty}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  disc: { right: -s(150), top: -ms(170) },
  chipScroll: { flexGrow: 0, marginHorizontal: -gutter },
  chips: { gap: s(8), paddingHorizontal: gutter },
  chip: {
    height: ms(38),
    borderRadius: ms(19),
    paddingHorizontal: s(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.teal },
  chipOff: {
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
  },
  day: { marginTop: mvs(8), marginHorizontal: s(4), marginBottom: mvs(14) },
  dayNext: { marginTop: mvs(12) },
  empty: { marginTop: mvs(40) },
});
