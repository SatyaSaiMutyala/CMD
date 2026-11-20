import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fontFor, ms, mvs, s } from '../../theme';
import { EyeIcon, EyeOffIcon } from '../icons';
import AppText from './AppText';

/* Labelled text input with an optional icon on the left. `secure` adds the
   show / hide password button. Other props go straight to TextInput. */
const TextField = forwardRef(function TextField(
  { label, icon: Icon, secure, style, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const tint = focused ? colors.brand : colors.faint;

  return (
    <View style={style}>
      <AppText size={12} weight={600} color={colors.muted} style={styles.label}>
        {label}
      </AppText>
      <View style={[styles.box, focused ? styles.boxFocused : null]}>
        {Icon ? <Icon size={20} color={tint} /> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.faint}
          selectionColor={colors.brand}
          secureTextEntry={secure ? hidden : false}
          maxFontSizeMultiplier={1.3}
          {...rest}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={10}
            onPress={() => setHidden(v => !v)}
          >
            {hidden ? (
              <EyeIcon size={20} color={colors.faint} />
            ) : (
              <EyeOffIcon size={20} color={colors.faint} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  label: { marginBottom: mvs(6), letterSpacing: 0.4 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    minHeight: ms(50),
    paddingHorizontal: s(14),
    borderRadius: ms(12),
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  boxFocused: { borderColor: colors.brand },
  input: {
    flex: 1,
    paddingVertical: mvs(10),
    fontFamily: fontFor(false, 500),
    fontSize: ms(15),
    color: colors.ink,
  },
});
