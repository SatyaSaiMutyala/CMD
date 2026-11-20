import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, mvs, s } from '../../theme';
import { Icon } from '../icons';
import AppText from './AppText';
import Toggle from './Toggle';

/* One alert switch on the Alerts tab: a teal tile with an icon, the switch,
   a title and one line about it. Two sit side by side. */
export default function SettingRow({ icon, title, text, value, onChange }) {
  return (
    <View style={styles.tile}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Icon name={icon} size={20} stroke={2.2} />
        </View>
        <Toggle value={value} label={title} onChange={onChange} />
      </View>
      <AppText
        size={15}
        lh={1.25}
        weight={800}
        color={colors.white}
        style={styles.title}
      >
        {title}
      </AppText>
      <AppText size={12} lh={1.35} weight={600} color={colors.white}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: ms(170),
    backgroundColor: colors.teal,
    borderRadius: ms(28),
    padding: s(16),
    gap: mvs(12),
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  icon: {
    width: ms(42),
    height: ms(42),
    borderRadius: ms(21),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 'auto' },
});
