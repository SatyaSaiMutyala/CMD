import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, ms, mvs, s, shadows } from '../../theme';
import { AppText, Eyebrow, Ring, SlideToConfirm } from '../common';

const R = 64;
const STROKE = 18;
const AROUND = 2 * Math.PI * R;
export const SEGMENT_COLORS = [
  colors.yellow,
  colors.white,
  colors.yellowMid,
  colors.mintMid,
];

// The legend never grows past this many rows, so the card keeps one height
// however many systems are connected and however much is waiting
const MAX_ROWS = 4;

/* What the legend and the ring show: every system when they fit; otherwise
   the ones with the most waiting, and the rest added up in a last row. */
function rowsOf(segments) {
  if (segments.length <= MAX_ROWS) return segments;
  const byCount = [...segments].sort((a, b) => b.count - a.count);
  const kept = byCount.slice(0, MAX_ROWS - 1);
  const rest = byCount.slice(MAX_ROWS - 1);
  return [
    ...kept,
    {
      label: `${rest.length} other systems`,
      count: rest.reduce((n, seg) => n + seg.count, 0),
    },
  ].map((seg, i) => ({ ...seg, color: SEGMENT_COLORS[i] }));
}

/* The ring: one arc per system, sized by how many are waiting in it */
function Donut({ segments, total, size = 116 }) {
  const px = ms(size);
  const shown = segments.filter(seg => seg.count > 0);
  // The arcs meet edge to edge and together go all the way round: no gaps
  // and no rounded ends, so the ring always reads as one complete circle
  let run = 0;
  const arcs = shown.map(seg => {
    const length = (seg.count / total) * AROUND;
    const start = run;
    run += length;
    return { color: seg.color, length, offset: -start };
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
          strokeLinecap="butt"
          strokeDasharray={`${arc.length} ${AROUND - arc.length}`}
          strokeDashoffset={arc.offset}
        />
      ))}
    </Svg>
  );
}

/* The teal card at the top of the home page: how many approvals are waiting,
   split by system, and the button into the swipe review. The card is the same
   size whatever the numbers are.
     total     number, or null while the first answer is on its way
     segments  [{ label, count, color }], one per connected system
     onStart   the knob at the bottom was slid across
     resetKey  change it to put that knob back at the start                  */
export default function HomeHero({ total, segments, onStart, resetKey }) {
  const known = total !== null;
  const rows = rowsOf(segments);
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
          <Donut segments={rows} total={total || 0} />
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
          {rows.map(seg => (
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
              <AppText
                size={15}
                weight={800}
                color={colors.white}
                style={styles.legendCount}
              >
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
  legend: { flex: 1, gap: mvs(9) },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  legendLabel: { flex: 1 },
  // the numbers line up in a column, whatever their width
  legendCount: { minWidth: ms(26), textAlign: 'right' },
  swatch: { width: ms(12), height: ms(12), borderRadius: ms(4) },
});
