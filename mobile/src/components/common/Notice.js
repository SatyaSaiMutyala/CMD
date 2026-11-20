import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, ms, s } from '../../theme';
import { Icon } from '../icons';
import AppText from './AppText';

/* One-line status strip under the stage tabs.
   tone "ok"    a decision went through: yellow tick, can be dismissed
   tone "info"  something to know (already actioned elsewhere, a hint)
   tone "warn"  a refresh failed: with a button to try again
   `bold` is the part of the text to set in bold (the reference).           */
export default function Notice({
  tone = 'ok',
  text,
  bold,
  icon,
  onDismiss,
  actionLabel,
  onAction,
  style,
}) {
  const at = bold ? text.indexOf(bold) : -1;
  const body =
    at < 0 ? (
      text
    ) : (
      <>
        {text.slice(0, at)}
        <AppText size={13} weight={800}>
          {bold}
        </AppText>
        {text.slice(at + bold.length)}
      </>
    );

  if (tone === 'ok') {
    return (
      <View accessibilityRole="alert" style={[styles.ok, style]}>
        <View style={styles.tick}>
          <Icon name="check" size={17} stroke={2.8} />
        </View>
        <AppText size={13} lh={1.35} weight={600} style={styles.text}>
          {body}
        </AppText>
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss message"
            onPress={onDismiss}
            style={styles.dismiss}
          >
            <Icon name="x" size={18} stroke={2.2} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (tone === 'warn') {
    return (
      <View accessibilityRole="alert" style={[styles.warn, style]}>
        <AppText size={13} lh={1.35} weight={700} style={styles.text}>
          {body}
        </AppText>
        {actionLabel ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            style={styles.action}
          >
            <AppText size={13} weight={800}>
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View accessibilityRole="alert" style={[styles.info, style]}>
      <Icon name={icon || 'info'} size={18} stroke={2} />
      <AppText size={13} lh={1.4} weight={500} style={styles.text}>
        {body}
      </AppText>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          onPress={onDismiss}
          hitSlop={10}
        >
          <Icon name="x" size={18} stroke={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { flex: 1 },
  ok: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    backgroundColor: colors.yellowSoft,
    borderRadius: ms(20),
    paddingVertical: ms(6),
    paddingRight: ms(6),
    paddingLeft: ms(8),
  },
  tick: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(17),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismiss: {
    width: ms(44),
    height: ms(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    backgroundColor: colors.yellowSoft,
    borderRadius: ms(22),
    paddingVertical: ms(8),
    paddingRight: ms(8),
    paddingLeft: s(14),
  },
  action: {
    height: ms(42),
    borderRadius: ms(21),
    paddingHorizontal: s(16),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    backgroundColor: colors.mint,
    borderRadius: ms(22),
    paddingVertical: ms(12),
    paddingHorizontal: s(14),
  },
});
