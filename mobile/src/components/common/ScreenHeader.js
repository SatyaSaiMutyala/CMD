import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, mvs, s } from '../../theme';
import AppText from './AppText';
import CircleButton from './CircleButton';

/* The top of a page.
   With `onBack`: a round back button, the title and a line under it, and
   whatever `right` holds (a view switch, a status pill).
   `large`: the big page title of a tab (History, Alerts). */
export default function ScreenHeader({
  title,
  sub,
  onBack,
  backLabel = 'Back',
  right,
  large,
  style,
}) {
  if (large) {
    return (
      <View style={[styles.large, style]}>
        <AppText display size={36} lh={1.05} weight={800} accessibilityRole="header">
          {title}
        </AppText>
        {sub ? (
          <AppText size={14} weight={500} color={colors.muted}>
            {sub}
          </AppText>
        ) : null}
      </View>
    );
  }
  return (
    <View style={[styles.row, style]}>
      {onBack ? (
        <CircleButton icon="back" label={backLabel} onPress={onBack} />
      ) : null}
      <View style={styles.copy}>
        <AppText
          display
          size={24}
          lh={1.1}
          weight={800}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </AppText>
        {sub ? (
          <AppText size={12.5} weight={600} color={colors.muted} numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  copy: { flex: 1, gap: 1 },
  large: { gap: mvs(4), paddingHorizontal: s(4) },
});
