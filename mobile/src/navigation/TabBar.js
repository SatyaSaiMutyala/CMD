import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/common';
import { Icon } from '../components/icons';
import { useHub } from '../store/HubProvider';
import { totalPending } from '../store/selectors';
import { colors, hairline, ms, s, shadows } from '../theme';
import { openHome } from './navigationRef';
import { ROUTES, TAB_BAR_BOTTOM, TAB_BAR_HEIGHT } from './routes';

const TABS = [
  { name: ROUTES.approvals, label: 'Approvals', icon: 'inbox' },
  { name: ROUTES.history, label: 'History', icon: 'history' },
  { name: ROUTES.alerts, label: 'Alerts', icon: 'bell' },
];

// The swipe review and the Notifications page use the whole screen: no tab
// bar there (nor on the reminder setup page, which is not a tab)
const onSwipeReview = route => {
  const nested = route.state
    ? route.state.routes[route.state.index]
    : route.params && route.params.screen
    ? { name: route.params.screen, params: route.params.params }
    : null;
  if (!nested) return false;
  // Notifications is a page of its own, over the tabs
  if (nested.name === ROUTES.notifications) return true;
  return !!(
    nested.name === ROUTES.software &&
    nested.params &&
    nested.params.view === 'cards'
  );
};

/* The floating tab bar. The tab you are on is a teal pill with its name;
   the others are an icon over a small label. Approvals carries the count. */
export default function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { store } = useHub();
  const pending = totalPending(store);
  const route = state.routes[state.index];
  if (route.name === ROUTES.reminderSetup || onSwipeReview(route)) return null;

  return (
    <View
      style={[styles.bar, { bottom: ms(TAB_BAR_BOTTOM) + insets.bottom }]}
    >
      {TABS.map(({ name, label, icon }) => {
        const on = route.name === name;
        const badge = name === ROUTES.approvals && pending > 0 ? pending : null;
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={badge ? `${label}, ${badge} pending` : label}
            // Approvals always returns to the home page
            onPress={() =>
              name === ROUTES.approvals ? openHome() : navigation.navigate(name)
            }
            style={
              on
                ? [styles.on, badge ? styles.onWithBadge : null]
                : [styles.off, name === ROUTES.approvals ? styles.offWide : null]
            }
          >
            {on ? (
              <>
                <Icon name={icon} size={20} stroke={2.2} color={colors.white} />
                <AppText size={14} weight={800} color={colors.white}>
                  {label}
                </AppText>
                {badge ? (
                  <View style={styles.badgeOn}>
                    <AppText size={12} weight={800}>
                      {badge}
                    </AppText>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <View>
                  <Icon name={icon} size={22} stroke={2} color={colors.muted} />
                  {badge ? (
                    <View style={styles.badgeOff}>
                      <AppText size={10.5} weight={800}>
                        {badge}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText size={11} weight={700} color={colors.muted}>
                  {label}
                </AppText>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: s(20),
    right: s(20),
    height: ms(TAB_BAR_HEIGHT),
    borderRadius: ms(TAB_BAR_HEIGHT / 2),
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(8),
    boxShadow: shadows.tabBar,
  },
  on: {
    height: ms(54),
    borderRadius: ms(27),
    paddingHorizontal: s(20),
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  onWithBadge: { paddingLeft: s(18), paddingRight: s(16) },
  off: {
    width: s(72),
    height: ms(54),
    borderRadius: ms(27),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  offWide: { width: s(84) },
  badgeOn: {
    minWidth: ms(26),
    height: ms(24),
    borderRadius: ms(12),
    paddingHorizontal: ms(7),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOff: {
    position: 'absolute',
    top: -ms(8),
    left: ms(14),
    minWidth: ms(22),
    height: ms(18),
    borderRadius: ms(9),
    paddingHorizontal: ms(5),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
