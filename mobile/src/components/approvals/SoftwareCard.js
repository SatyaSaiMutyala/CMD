import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, hairline, ms, mvs, s } from '../../theme';
import { AppText, Mono } from '../common';

/* One software on the home screen. `pending` is null when it is not connected yet. */
export default function SoftwareCard({ sw, pending, onPress }) {
  const active = pending > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${sw.name}, ${
        pending === null ? 'not connected' : `${pending} pending`
      }`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.left}>
        <Mono label={sw.mono} />
        <View style={styles.names}>
          <AppText display size={18} lh={1.2} numberOfLines={1}>
            {sw.name}
          </AppText>
          <AppText size={12} color={colors.muted} numberOfLines={1}>
            {sw.sub}
          </AppText>
        </View>
      </View>
      <View
        style={[
          styles.badge,
          { backgroundColor: active ? colors.brand : colors.line2 },
        ]}
      >
        <AppText
          display
          size={18}
          color={active ? colors.onBrand : colors.muted}
        >
          {pending === null ? '—' : pending}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
    minHeight: ms(72),
    backgroundColor: colors.card,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: ms(18),
    paddingVertical: mvs(14),
    paddingHorizontal: s(16),
  },
  pressed: { backgroundColor: colors.pressed },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(12) },
  names: { flex: 1 },
  badge: {
    minWidth: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    paddingHorizontal: s(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
