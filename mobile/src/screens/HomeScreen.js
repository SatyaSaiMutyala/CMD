import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Ellipse } from 'react-native-svg';
import {
  ComingCard,
  HomeHero,
  SEGMENT_COLORS,
  SoftwareCard,
} from '../components/approvals';
import { AppText, CircleButton, Screen } from '../components/common';
import { Icon } from '../components/icons';
import { REGISTRY } from '../data/registry';
import { ROUTES } from '../navigation/routes';
import { useAuth } from '../store/AuthProvider';
import { useHub } from '../store/HubProvider';
import {
  isLoaded,
  stageCount,
  swPending,
  totalPending,
  unseenNotifications,
} from '../store/selectors';
import { colors, gutter, hairline, ms, mvs, s } from '../theme';
import { greeting, isToday } from '../utils/format';

const logo = require('../assets/images/trustlab-logo.png');

const CONNECTED = REGISTRY.filter(sw => sw.connected);
const COMING = REGISTRY.filter(sw => !sw.connected);

/* The soft mint shape behind the top of the page */
function Backdrop() {
  return (
    <Svg
      width={s(520)}
      height={ms(460)}
      viewBox="0 0 520 460"
      preserveAspectRatio="none"
      style={styles.backdrop}
    >
      <Ellipse cx="260" cy="230" rx="300" ry="230" fill={colors.mint} />
    </Svg>
  );
}

/* One of the two small tiles under the hero */
function Tile({ icon, value, of, label, bg, iconBg, onPress }) {
  const body = (
    <>
      {/* The icon and the number side by side keep the tile low */}
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={17} stroke={2.2} />
        </View>
        <AppText display size={28} lh={1} weight={800}>
          {value}
          {of ? (
            <AppText display size={17} weight={800} color={colors.muted}>
              {of}
            </AppText>
          ) : null}
        </AppText>
      </View>
      <AppText size={12.5} weight={700} color={colors.muted}>
        {label}
      </AppText>
    </>
  );
  const style = [styles.tile, { backgroundColor: bg }];
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      onPress={onPress}
      style={style}
    >
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}

/* Home: who is signed in, how much is waiting (and the way into the swipe
   review), each connected software, and the ones still to come */
export default function HomeScreen({ navigation }) {
  const { store } = useHub();
  const { user } = useAuth();
  // Each time the page comes back into view the slide knob is at its start
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit(n => n + 1), []));

  // A dash, not a 0, until the first answer has arrived
  const known = CONNECTED.some(sw => isLoaded(store, sw));
  const total = known ? totalPending(store) : null;
  const segments = CONNECTED.flatMap(sw =>
    sw.stages.map(st => ({
      label: CONNECTED.length > 1 ? `${sw.mono} · ${st.short}` : st.short,
      count: stageCount(store, sw, st) || 0,
    })),
  ).map((seg, i) => ({
    ...seg,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));
  const today = store.history.filter(entry => isToday(entry.ts)).length;
  // The yellow dot on the bell: there are unread notifications
  const unseen = unseenNotifications(store);

  const open = (sw, view) =>
    navigation.navigate(ROUTES.software, { swId: sw.id, view });
  // The swipe review starts where something is waiting
  const startReview = () =>
    open(CONNECTED.find(sw => swPending(store, sw) > 0) || CONNECTED[0], 'cards');

  return (
    <Screen backdrop={<Backdrop />} top={10} gap={18}>
      <View style={styles.top}>
        <View style={styles.logo}>
          <Image source={logo} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={styles.who}>
          <AppText size={13.5} weight={600} color={colors.muted}>
            {greeting(new Date())}
          </AppText>
          <AppText display size={22} lh={1.1} weight={800} numberOfLines={1}>
            {user.name}
          </AppText>
        </View>
        <CircleButton
          icon="bell"
          size={48}
          iconSize={21}
          stroke={2.1}
          label={unseen ? `Notifications, ${unseen} new` : 'Notifications'}
          onPress={() => navigation.navigate(ROUTES.notifications)}
        >
          <Icon name="bell" size={21} stroke={2.1} />
          {unseen ? <View style={styles.bellDot} /> : null}
        </CircleButton>
      </View>

      <HomeHero
        total={total}
        segments={segments}
        resetKey={visit}
        onStart={startReview}
      />

      <View style={styles.tiles}>
        <Tile
          icon="plug"
          value={CONNECTED.length}
          of={`/${REGISTRY.length}`}
          label="Systems connected"
          bg={colors.yellowSoft}
          iconBg={colors.yellow}
        />
        <Tile
          icon="history"
          value={today}
          label="Decisions logged today"
          bg={colors.mint}
          iconBg={colors.white}
          onPress={() => navigation.navigate(ROUTES.history)}
        />
      </View>

      {CONNECTED.map(sw => (
        <SoftwareCard
          key={sw.id}
          sw={sw}
          pending={swPending(store, sw)}
          stages={sw.stages.map(st => ({
            key: st.key,
            label: st.short,
            count: stageCount(store, sw, st),
          }))}
          onPress={() => open(sw, 'list')}
        />
      ))}

      <View style={styles.comingHead}>
        <AppText display size={19} weight={800} accessibilityRole="header">
          Coming to the hub
        </AppText>
        <AppText size={12.5} weight={600} color={colors.muted}>
          {COMING.length} systems
        </AppText>
      </View>
      <ScrollView
        horizontal
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        style={styles.comingScroll}
        contentContainerStyle={styles.comingRow}
      >
        {COMING.map(sw => (
          <ComingCard key={sw.id} sw={sw} onPress={() => open(sw, 'list')} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: -s(120), top: -ms(210) },
  top: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  logo: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    backgroundColor: colors.white,
    borderWidth: hairline,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: ms(34), height: ms(34) },
  who: { flex: 1, gap: 1 },
  bellDot: {
    position: 'absolute',
    top: ms(9),
    right: ms(11),
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    backgroundColor: colors.yellow,
    borderWidth: 2,
    borderColor: colors.white,
  },
  tiles: { flexDirection: 'row', gap: s(12) },
  tile: {
    flex: 1,
    borderRadius: ms(24),
    paddingVertical: mvs(12),
    paddingHorizontal: s(14),
    gap: mvs(6),
  },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  tileIcon: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: mvs(4),
    paddingHorizontal: 2,
  },
  comingScroll: { flexGrow: 0, marginHorizontal: -gutter },
  comingRow: { gap: s(10), paddingHorizontal: gutter },
});
