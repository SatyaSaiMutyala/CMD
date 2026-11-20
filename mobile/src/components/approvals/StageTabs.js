import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, gutter, hairline, ms, mvs, s } from '../../theme';
import { AppText } from '../common';

/* Horizontal stage chips with a count each. `tabs` = [{ key, label, count }] (count null = "—") */
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
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(tab.key)}
            style={[styles.tab, on ? styles.tabOn : null]}
          >
            <AppText
              size={14}
              weight={600}
              color={on ? colors.white : colors.ink}
            >
              {tab.label}
            </AppText>
            <View style={[styles.count, on ? styles.countOn : null]}>
              <AppText size={13} weight={700}>
                {tab.count === null ? '—' : tab.count}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: {
    gap: s(8),
    paddingHorizontal: gutter,
    paddingTop: mvs(14),
    paddingBottom: mvs(12),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    minHeight: ms(47),
    paddingHorizontal: s(14),
    borderRadius: ms(12),
    backgroundColor: colors.card,
    borderWidth: hairline,
    borderColor: colors.line,
  },
  tabOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  count: {
    backgroundColor: colors.line2,
    borderRadius: 999,
    paddingVertical: ms(2),
    paddingHorizontal: s(9),
  },
  countOn: { backgroundColor: colors.white },
});
