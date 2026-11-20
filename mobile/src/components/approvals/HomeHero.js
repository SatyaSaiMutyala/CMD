import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, ms, mvs, s, shadows } from '../../theme';
import { AppText, Eyebrow, Ring, SlideToConfirm } from '../common';

const R = 64;
const STROKE = 18;
const AROUND = 2 * Math.PI * R;
// Each arc stops short of the next so their round ends do not overlap
const GAP = 12;
export const SEGMENT_COLORS = [
  colors.yellow,
  colors.white,
  colors.yellowMid,
  colors.mintMid,
];

/* The ring: one arc per stage, sized by how many are waiting in it */
function Donut({ segments, total, size = 116 }) {
  const px = ms(size);
  const shown = segments.filter(seg => seg.count > 0);
  let run = 0;
  const arcs = shown.map((seg, i) => {
    const share = (seg.count / total) * AROUND;
    const start = run;
    run += share;
    const alone = shown.length === 1;
    const length = alone ? AROUND : Math.max(share - (i ? GAP : GAP / 2), 1);
    return {
      color: seg.color,
      length,
      offset: alone || !i ? 0 : -(start + GAP / 2),
    };
  });
  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 156 156"
      style={styles.donut}
      accessibilityLabel={`${total} pending`}
    >
      <Circle
        cx="78"
        cy="78"
        r={R}
        fill="none"
        stroke={colors.tealLight}
        strokeWidth={STROKE}
      />
      {arcs.map((arc, i) => (
        <Circle
          key={i}
          cx="78"
          cy="78"
          r={R}
          fill="none"
          stroke={arc.color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${arc.length} ${AROUND - arc.length}`}
          strokeDashoffset={arc.offset}
        />
      ))}
    </Svg>
  );
}

/* The teal card at the top of the home page: how many approvals are waiting,
   split by stage, and the button into the swipe review.
     total     number, or null while the first answer is on its way
     segments  [{ label, count, color }]
     onStart   the knob at the bottom was slid across
     resetKey  change it to put that knob back at the start                  */
export default function HomeHero({ total, segments, onStart, resetKey }) {
  const known = total !== null;
  return (
    <View style={styles.card}>
      <Ring
        size={230}
        color={colors.white}
        opacity={0.35}
        style={styles.ring}
      />
      <View style={styles.head}>
        <Eyebrow size={12.5} color={colors.white}>
          WAITING FOR YOU
        </Eyebrow>
        <View style={styles.live}>
          <View style={styles.liveHalo}>
            <View style={styles.liveDot} />
          </View>
          <AppText size={11.5} weight={800}>
            Live
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.donutBox}>
          <Donut segments={segments} total={total || 0} />
          <View style={styles.count}>
            <AppText
              display
              size={40}
              lh={1}
              weight={800}
              color={colors.white}
              track={-0.03}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {known ? total : '—'}
            </AppText>
            <AppText size={11} weight={700} color={colors.white}>
              pending
            </AppText>
          </View>
        </View>
        <View style={styles.legend}>
          {segments.map(seg => (
            <View key={seg.label} style={styles.legendRow}>
              <View style={[styles.swatch, { backgroundColor: seg.color }]} />
              <AppText
                size={13.5}
                weight={600}
                color={colors.white}
                numberOfLines={1}
                style={styles.legendLabel}
              >
                {seg.label}
              </AppText>
              <AppText size={15} weight={800} color={colors.white}>
                {known ? seg.count : '—'}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      {/* Slide the white knob to the right to begin the swipe review */}
      <SlideToConfirm
        compact
        tone="hero"
        icon="chevronsRight"
        labelSide="right"
        label="Start swipe review"
        holdKey={resetKey}
        busyLabel="Opening…"
        onComplete={onStart}
        style={styles.start}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: colors.teal,
    borderRadius: ms(36),
    paddingTop: mvs(16),
    paddingHorizontal: s(18),
    paddingBottom: mvs(14),
    gap: mvs(12),
    boxShadow: shadows.hero,
  },
  ring: { right: -ms(70), bottom: -ms(90) },
  start: { boxShadow: shadows.ink },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    height: ms(26),
    borderRadius: ms(13),
    paddingHorizontal: s(10),
    backgroundColor: colors.white,
  },
  liveHalo: {
    width: ms(13),
    height: ms(13),
    borderRadius: ms(7),
    backgroundColor: colors.mintMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: ms(7),
    height: ms(7),
    borderRadius: ms(4),
    backgroundColor: colors.teal,
  },
  body: { flexDirection: 'row', alignItems: 'center', gap: s(18) },
  donutBox: { width: ms(116), height: ms(116) },
  donut: { transform: [{ rotate: '-90deg' }] },
  count: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(24),
  },
  legend: { flex: 1, gap: mvs(7) },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  legendLabel: { flex: 1 },
  swatch: { width: ms(12), height: ms(12), borderRadius: ms(4) },
});
