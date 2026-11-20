import React, { forwardRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fontStyle, fs, ms, mvs, s } from '../../theme';
import { Icon } from '../icons';
import AppText from './AppText';
import { useRevealField } from './KeyboardScroll';

/* A labelled text field.
   variant "pill"   the sign-in fields: mint, with an icon; teal ring when in use
   variant "plain"  the white fields on a tinted card (change password)
   secure           a password: hidden, with a button to show it (pill only)
   invalid          teal ring, to go with an error line under the field       */
const TextField = forwardRef(function TextField(
  { label, icon, secure, variant = 'pill', invalid, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const input = useRef(null);
  // On a page that scrolls: brings this field above the keyboard
  const reveal = useRevealField();
  const [shown, setShown] = useState(false);
  const pill = variant === 'pill';
  const ring = focused || invalid;

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <AppText size={13} weight={700} style={pill ? styles.pillLabel : null}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          pill ? styles.pill : styles.plain,
          {
            backgroundColor: pill && !ring ? colors.mint : colors.white,
            borderColor: ring ? colors.teal : pill ? colors.mint : colors.white,
          },
          pill && secure ? styles.withEye : null,
        ]}
      >
        {icon ? (
          <Icon name={icon} size={19} stroke={2.1} color={colors.muted} />
        ) : null}
        <TextInput
          ref={node => {
            input.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.teal}
          secureTextEntry={!!secure && !shown}
          allowFontScaling={false}
          {...rest}
          onFocus={e => {
            setFocused(true);
            if (reveal) reveal(input.current);
            if (onFocus) onFocus(e);
          }}
          onBlur={e => {
            setFocused(false);
            if (onBlur) onBlur(e);
          }}
          style={[styles.input, { fontSize: fs(pill ? 15.5 : 15) }]}
        />
        {pill && secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Hide password' : 'Show password'}
            onPress={() => setShown(v => !v)}
            style={[
              styles.eye,
              { backgroundColor: ring ? colors.mint : colors.white },
            ]}
          >
            <Icon name="eye" size={19} stroke={2.1} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  wrap: { gap: mvs(7) },
  pillLabel: { paddingLeft: s(6) },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    height: ms(58),
    borderRadius: ms(29),
    borderWidth: 2,
    paddingHorizontal: s(18),
  },
  withEye: { paddingRight: ms(5) },
  plain: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(52),
    borderRadius: ms(26),
    borderWidth: 2,
    paddingHorizontal: s(16),
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    padding: 0,
    ...fontStyle(false, 400),
    color: colors.ink,
  },
  eye: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
