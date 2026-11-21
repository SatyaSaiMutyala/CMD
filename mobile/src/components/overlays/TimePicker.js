import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, ms, mvs, s, shadows } from '../../theme';
import { AppText, Button, Eyebrow } from '../common';
import { Icon } from '../icons';

/* Picks a time of day: hour, minute and am / pm, each stepped with its own
   pair of arrows. Used for the two ends of the quiet hours.

     value     "22:00" (24-hour), what it opens on
     title     what is being set ("Quiet from")
     onDone    given the new "HH:MM" when Set is pressed
     onClose   closed without a change                                       */

const pad = n => String(n).padStart(2, '0');
// Minutes move five at a time: nobody sets a reminder to stop at 10:03
const STEP = 5;

function Wheel({ label, shown, onUp, onDown }) {
  return (
    <View style={styles.wheel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} up`}
        hitSlop={8}
        onPress={onUp}
        style={({ pressed }) => [styles.arrow, pressed ? styles.pressed : null]}
      >
        <View style={styles.up}>
          <Icon name="chevronRight" size={20} stroke={2.8} />
        </View>
      </Pressable>
      <AppText
        display
        size={40}
        lh={1.05}
        weight={800}
        accessibilityLabel={`${label} ${shown}`}
      >
        {shown}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} down`}
        hitSlop={8}
        onPress={onDown}
        style={({ pressed }) => [styles.arrow, pressed ? styles.pressed : null]}
      >
        <View style={styles.down}>
          <Icon name="chevronRight" size={20} stroke={2.8} />
        </View>
      </Pressable>
    </View>
  );
}

export default function TimePicker({ open, value, title, onDone, onClose }) {
  const [hour, setHour] = useState(22); // 0..23
  const [minute, setMinute] = useState(0);

  // Opens on the time it was given, each time
  useEffect(() => {
    if (!open) return;
    setHour(Number(String(value).slice(0, 2)) || 0);
    setMinute(Number(String(value).slice(3, 5)) || 0);
  }, [open, value]);

  const pm = hour >= 12;
  const turn = (by, of, size) => (((of + by) % size) + size) % size;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.host}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          onPress={onClose}
        />
        <View style={styles.card}>
          <Eyebrow>{title}</Eyebrow>
          <View style={styles.wheels}>
            <Wheel
              label="Hour"
              shown={String(hour % 12 || 12)}
              onUp={() => setHour(h => turn(1, h, 24))}
              onDown={() => setHour(h => turn(-1, h, 24))}
            />
            <AppText display size={36} weight={800} color={colors.muted}>
              :
            </AppText>
            <Wheel
              label="Minute"
              shown={pad(minute)}
              onUp={() => setMinute(m => turn(STEP, m - (m % STEP), 60))}
              onDown={() =>
                setMinute(m => turn(m % STEP ? -(m % STEP) : -STEP, m, 60))
              }
            />
            <View style={styles.halves}>
              {['am', 'pm'].map(half => {
                const on = (half === 'pm') === pm;
                return (
                  <Pressable
                    key={half}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={
                      half === 'am' ? 'Morning' : 'Afternoon and night'
                    }
                    onPress={() => (on ? null : setHour(h => turn(12, h, 24)))}
                    style={[styles.half, on ? styles.halfOn : null]}
                  >
                    <AppText
                      size={14}
                      weight={800}
                      color={on ? colors.white : colors.ink}
                    >
                      {half}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.buttons}>
            <Button
              variant="outline"
              height={50}
              fontSize={14}
              label="Cancel"
              onPress={onClose}
              style={styles.button}
            />
            <Button
              variant="teal"
              height={50}
              fontSize={14}
              label="Set"
              onPress={() => onDone(`${pad(hour)}:${pad(minute)}`)}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(24),
    backgroundColor: 'rgba(5,58,50,0.55)',
  },
  card: {
    width: '100%',
    maxWidth: s(340),
    borderRadius: ms(30),
    backgroundColor: colors.white,
    padding: s(22),
    gap: mvs(18),
    boxShadow: shadows.card,
  },
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(10),
  },
  wheel: { alignItems: 'center', gap: mvs(6), minWidth: ms(72) },
  arrow: {
    width: ms(44),
    height: ms(36),
    borderRadius: ms(14),
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // one arrow, turned to point up and down
  up: { transform: [{ rotate: '-90deg' }] },
  down: { transform: [{ rotate: '90deg' }] },
  pressed: { opacity: 0.6 },
  halves: { gap: mvs(8), marginLeft: s(6) },
  half: {
    width: ms(54),
    height: ms(40),
    borderRadius: ms(14),
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfOn: { backgroundColor: colors.teal },
  buttons: { flexDirection: 'row', gap: s(10) },
  button: { flex: 1 },
});
