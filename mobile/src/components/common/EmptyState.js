import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, ms, mvs, s } from '../../theme';
import { Icon } from '../icons';
import AppText from './AppText';
import Button from './Button';

/* The big tick with confetti dots: nothing is waiting */
function ClearArt() {
  return (
    <View style={styles.clear}>
      <View style={[styles.dot, styles.dot1]} />
      <View style={[styles.dot, styles.dot2]} />
      <View style={[styles.dot, styles.dot3]} />
      <View style={[styles.dot, styles.dot4]} />
      <View style={styles.clearHalo}>
        <View style={styles.clearDisc}>
          <Icon name="check" size={54} stroke={2.6} color={colors.white} />
        </View>
      </View>
    </View>
  );
}

/* The no-connection mark inside a dashed ring: it could not be loaded */
function FailedArt() {
  const px = ms(150);
  return (
    <View style={[styles.failed, { width: px, height: px }]}>
      <Svg width={px} height={px} viewBox="0 0 150 150" style={styles.fill}>
        <Circle
          cx="75"
          cy="75"
          r="73"
          fill="none"
          stroke={colors.teal}
          strokeWidth="2"
          strokeDasharray="6 9"
        />
      </Svg>
      <View style={styles.failedDisc}>
        <Icon name="wifiOff" size={46} stroke={1.9} />
      </View>
    </View>
  );
}

/* Centred message for an empty or failed page.
   kind "clear" | "failed"; an optional button below the text. */
export default function EmptyState({
  kind = 'clear',
  title,
  text,
  actionLabel,
  onAction,
  style,
}) {
  return (
    <View
      accessibilityRole={kind === 'failed' ? 'alert' : undefined}
      style={[styles.wrap, style]}
    >
      {kind === 'failed' ? <FailedArt /> : <ClearArt />}
      <AppText
        display
        size={kind === 'failed' ? 24 : 26}
        weight={800}
        align="center"
        style={styles.title}
      >
        {title}
      </AppText>
      <AppText
        size={14}
        lh={1.5}
        color={colors.muted}
        align="center"
        style={styles.text}
      >
        {text}
      </AppText>
      {actionLabel ? (
        <Button
          variant="teal"
          height={60}
          fontSize={16}
          icon="refresh"
          iconSize={19}
          label={actionLabel}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: mvs(12), paddingHorizontal: s(10) },
  fill: { position: 'absolute', left: 0, top: 0 },
  title: { marginTop: mvs(8) },
  text: { maxWidth: s(300) },
  action: { alignSelf: 'stretch', marginTop: mvs(14) },

  clear: { width: ms(200), height: ms(170) },
  clearHalo: {
    position: 'absolute',
    left: ms(24),
    top: ms(9),
    width: ms(152),
    height: ms(152),
    borderRadius: ms(76),
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearDisc: {
    width: ms(120),
    height: ms(120),
    borderRadius: ms(60),
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { position: 'absolute', borderRadius: 99 },
  dot1: {
    left: ms(30),
    top: ms(10),
    width: ms(14),
    height: ms(14),
    backgroundColor: colors.yellow,
  },
  dot2: {
    right: ms(24),
    top: ms(30),
    width: ms(10),
    height: ms(10),
    backgroundColor: colors.teal,
  },
  dot3: {
    left: ms(12),
    bottom: ms(30),
    width: ms(8),
    height: ms(8),
    backgroundColor: colors.teal,
  },
  dot4: {
    right: ms(12),
    bottom: ms(14),
    width: ms(16),
    height: ms(16),
    backgroundColor: colors.yellowMid,
  },

  failed: { alignItems: 'center', justifyContent: 'center' },
  failedDisc: {
    width: ms(108),
    height: ms(108),
    borderRadius: ms(54),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
