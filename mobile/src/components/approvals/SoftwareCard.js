import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, hairline, ms, mvs, s, shadows } from '../../theme';
import { AppText, Mono } from '../common';
import { Icon } from '../icons';

/* A connected software on the home page: its mark and name, how many are
   waiting, and the count at each of its stages in order.
     stages  [{ key, label, count }]   pending / count are null while loading */
export default function SoftwareCard({ sw, pending, stages, onPress }) {
  const show = n => (n === null ? '—' : n);
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
      <View style={styles.stages}>
        {stages.map((st, i) => (
          <React.Fragment key={st.key}>
            {i ? (
              <Icon
                name="chevronRight"
                size={14}
                stroke={3}
                color={colors.teal}
              />
            ) : null}
            <View style={styles.stage}>
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
