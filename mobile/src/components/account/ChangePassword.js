import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../store/AuthProvider';
import { colors, mvs } from '../../theme';
import {
  AppText,
  Button,
  Card,
  FieldError,
  Notice,
  TextField,
} from '../common';

/* The "Change password" section of the Alerts tab: the new password, typed
   twice. The current one is not asked for — being signed in is enough.
   Every other phone and browser is signed out. */
export default function ChangePassword() {
  const { changePassword } = useAuth();
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // Said as soon as the second copy stops matching, not only on submit
  const mismatch = !!again && next !== again;

  const submit = async () => {
    setDone(false);
    if (next !== again) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(next);
      setNext('');
      setAgain('');
      setDone(true);
    } catch (e) {
      setError(e.message || 'Could not change the password. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const field = { variant: 'plain', secure: true, autoCapitalize: 'none', editable: !busy };

  return (
    <Card bg={colors.mint} style={styles.card}>
      <AppText display size={19} weight={800} accessibilityRole="header">
        Change password
      </AppText>
      <TextField
        {...field}
        label="New password"
        value={next}
        onChangeText={setNext}
        placeholder="At least 8 characters"
        autoComplete="new-password"
      />
      <View style={styles.again}>
        <TextField
          {...field}
          label="Confirm password"
          value={again}
          onChangeText={setAgain}
          invalid={mismatch}
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        {mismatch ? <FieldError text="Passwords do not match." /> : null}
      </View>
      {error ? <FieldError text={error} /> : null}
      {done ? <Notice tone="ok" text="Password changed." /> : null}
      <Button
        variant="teal"
        height={54}
        label={busy ? 'Saving…' : 'Update password'}
        disabled={busy || !next || !again || mismatch}
        onPress={submit}
      />
      <AppText size={12.5} lh={1.45} color={colors.muted}>
        Changing it signs you out of every other phone and browser.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: mvs(12) },
  again: { gap: mvs(6) },
});
