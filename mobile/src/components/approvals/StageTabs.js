import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, gutter, hairline, ms, s } from '../../theme';
import { AppText } from '../common';

/* The stage chips of a software, each with its count.
   `tabs` = [{ key, label, count }] (count null = still loading: "—") */
export default function StageTabs({ tabs, current, onSelect }) {
  return (
    <ScrollView
      horizontal
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {tabs.map(tab => {
        const on = tab.key === current;
        const count = tab.count === null ? '—' : tab.count;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${tab.label}, ${count}`}
            onPress={() => onSelect(tab.key)}
            style={[styles.tab, on ? styles.tabOn : styles.tabOff]}
          >
            <AppText
              size={13.5}
              weight={on ? 800 : 700}
              color={on ? colors.white : colors.ink}
            >
              {tab.label}
            </AppText>
            {on ? (
              <View style={styles.count}>
                <AppText size={12} weight={800}>
                  {count}
                </AppText>
              </View>
            ) : (
              <AppText size={13.5} weight={800} color={colors.muted}>
                {count}
              </AppText>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Chips may run off the right edge of the page on a small phone
  scroll: { flexGrow: 0, marginHorizontal: -gutter },
  row: { gap: s(8), paddingHorizontal: gutter },
  tab: {
    height: ms(40),
    borderRadius: ms(20),
    paddingHorizontal: s(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(7),
  },
  tabOn: { backgroundColor: colors.teal },
  tabOff: {
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
  },
  count: {
    minWidth: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    paddingHorizontal: ms(6),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
