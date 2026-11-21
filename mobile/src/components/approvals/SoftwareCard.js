import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, hairline, ms, mvs, s, shadows } from '../../theme';
import { AppText, Mono } from '../common';
import { Icon } from '../icons';

/* A connected software on the home page: its mark and name, how many are
   waiting, and the count at each of its stages.
     stages  [{ key, label, name, count }]   pending / count are null while
             loading; `label` is the short name, `name` the full one

   How the stages are laid out depends on how many there are, so every card
   looks finished:
     1     one line across the card: the stage's full name, its count
     2-3   tiles side by side, joined by arrows (they are steps in order)
     4+    tiles two to a row                                              */
export default function SoftwareCard({ sw, pending, stages, onPress }) {
  const show = n => (n === null ? '—' : n);
  const only = stages.length === 1 ? stages[0] : null;
  const grid = stages.length > 3;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${sw.name}, ${
        pending === null ? 'loading' : `${pending} pending`
      }`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.top}>
        <Mono label={sw.mono} />
        <View style={styles.names}>
          <AppText size={16.5} weight={800} numberOfLines={1}>
            {sw.name}
          </AppText>
          <AppText size={12.5} color={colors.muted} numberOfLines={1}>
            {sw.sub}
          </AppText>
        </View>
        <View style={styles.count}>
          <AppText size={15} weight={800}>
            {show(pending)}
          </AppText>
        </View>
      </View>
      {only ? (
        // A lone tile stretched across the card looked half empty: one stage
        // reads better as a single line
        <View style={styles.single}>
          <AppText
            size={13}
            weight={700}
            color={colors.muted}
            numberOfLines={1}
            style={styles.singleLabel}
          >
            {only.name || only.label}
          </AppText>
          <AppText display size={20} weight={800}>
            {show(only.count)}
          </AppText>
          <Icon name="chevronRight" size={14} stroke={3} color={colors.teal} />
        </View>
      ) : (
        <View style={[styles.stages, grid ? styles.stagesGrid : null]}>
          {stages.map((st, i) => (
            <React.Fragment key={st.key}>
              {i && !grid ? (
                <Icon
                  name="chevronRight"
                  size={14}
                  stroke={3}
                  color={colors.teal}
                />
              ) : null}
              <View style={[styles.stage, grid ? styles.stageGrid : null]}>
                <AppText display size={20} weight={800}>
                  {show(st.count)}
                </AppText>
                <AppText
                  size={11}
                  weight={700}
                  color={colors.muted}
                  numberOfLines={1}
                >
                  {st.label}
                </AppText>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}
    </Pressable>
  );
}

/* A software that is not connected yet: a small dashed card */
export function ComingCard({ sw, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sw.name}, not connected`}
      onPress={onPress}
      style={({ pressed }) => [styles.coming, pressed ? styles.pressed : null]}
    >
      <Mono
        label={sw.mono}
        size={38}
        radius={12}
        bg={colors.mint}
        color={colors.ink}
        fontSize={13}
        display={false}
      />
      <AppText size={13.5} lh={1.2} weight={700} numberOfLines={2}>
        {sw.name}
      </AppText>
      <AppText size={11.5} color={colors.muted} numberOfLines={1}>
        Not connected · —
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: ms(30),
    padding: s(16),
    gap: mvs(14),
    boxShadow: shadows.card,
  },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  names: { flex: 1, gap: 2 },
  count: {
    minWidth: ms(44),
    height: ms(34),
    borderRadius: ms(17),
    paddingHorizontal: s(10),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stages: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  // four or more: two to a row
  stagesGrid: { flexWrap: 'wrap', gap: s(8) },
  stageGrid: { flexGrow: 1, flexBasis: '46%' },
  single: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    backgroundColor: colors.mint,
    borderRadius: ms(16),
    paddingVertical: ms(10),
    paddingHorizontal: s(14),
  },
  singleLabel: { flex: 1 },
  stage: {
    flex: 1,
    backgroundColor: colors.mint,
    borderRadius: ms(16),
    paddingVertical: ms(9),
    paddingHorizontal: s(10),
    gap: 1,
  },
  coming: {
    width: s(118),
    borderWidth: hairline,
    borderStyle: 'dashed',
    borderColor: colors.mintMid,
    borderRadius: ms(24),
    padding: s(14),
    gap: mvs(10),
  },
});
