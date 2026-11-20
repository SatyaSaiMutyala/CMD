import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/common';
import { ApprovalsIcon, BellIcon, HistoryIcon } from '../components/icons';
import { useHub } from '../store/HubProvider';
import { totalPending } from '../store/selectors';
import { colors, ms } from '../theme';
import { openHome } from './navigationRef';
import { ROUTES, TAB_BAR_HEIGHT } from './routes';

const TABS = [
  { name: ROUTES.approvals, label: 'Approvals', Icon: ApprovalsIcon },
  { name: ROUTES.history, label: 'History', Icon: HistoryIcon },
  { name: ROUTES.alerts, label: 'Alerts', Icon: BellIcon },
];

/* Bottom tab bar with the pending count on Approvals */
export default function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { store } = useHub();
  const pending = totalPending(store);
  const current = state.routes[state.index].name;

  return (
    <View
      style={[
        styles.bar,
        {
          height: ms(TAB_BAR_HEIGHT) + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {TABS.map(({ name, label, Icon }) => {
        const on = current === name;
        const color = on ? colors.brand : colors.muted;
        const badge = name === ROUTES.approvals && pending > 0 ? pending : null;
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={badge ? `${label}, ${badge} pending` : label}
            // Approvals always returns to the software list, as in the design
            onPress={() =>
              name === ROUTES.approvals ? openHome() : navigation.navigate(name)
            }
            style={styles.tab}
          >
            <View>
              <Icon color={color} />
              {badge ? (
                <View style={styles.dot}>
                  <AppText size={11} weight={700} color={colors.white}>
                    {badge}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText size={11.5} weight={on ? 700 : 500} color={color}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: ms(4) },
  dot: {
    position: 'absolute',
    top: -ms(4),
    left: ms(20),
    minWidth: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    paddingHorizontal: ms(5),
    backgroundColor: colors.bad,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
