import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthProvider';
import { colors, ms, mvs, s } from '../../theme';
import { AppText, Button, KeyboardAvoider, TextField } from '../common';

/* Full-screen form to change the sign-in password: the current one, then the
   new one typed twice. Every other phone and browser is signed out. */
export default function PasswordModal({ visible, onClose }) {
  const { user, changePassword } = useAuth();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setCurrent('');
    setNext('');
    setAgain('');
    setError(null);
    setDone(false);
    onClose();
  };

  const submit = async () => {
    setDone(false);
    if (next !== again) {
      setError('The two new passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setAgain('');
      setDone(true);
    } catch (e) {
      setError(e.message || 'Could not change the password. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={close}
      presentationStyle="pageSheet"
    >
      <KeyboardAvoider
        style={styles.screen}
      >
        <ScrollView
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: mvs(24) + insets.bottom },
          ]}
        >
          <View style={styles.head}>
            <AppText display size={24} accessibilityRole="header">
              Change password
            </AppText>
            <AppText
              size={15}
              weight={600}
              color={colors.brandDark}
              accessibilityRole="button"
              onPress={close}
              suppressHighlighting
            >
              Close
            </AppText>
          </View>

          <AppText size={14} lh={1.5} color={colors.muted}>
            Signed in as {user ? user.email : ''}. Changing the password signs
            out every other phone and browser.
          </AppText>
          <TextField
            label="Current password"
            secure
            value={current}
            onChangeText={setCurrent}
            autoCapitalize="none"
            editable={!busy}
          />
          <TextField
            label="New password"
            secure
            value={next}
            onChangeText={setNext}
            placeholder="At least 8 characters"
            autoCapitalize="none"
            editable={!busy}
          />
          <TextField
            label="New password again"
            secure
            value={again}
            onChangeText={setAgain}
            autoCapitalize="none"
            editable={!busy}
          />
          {error ? <Line bad text={error} /> : null}
          {done ? <Line text="Password changed." /> : null}
          <Button
            size="lg"
            label={busy ? 'Saving…' : 'Change password'}
            disabled={busy || !current || !next || !again}
            onPress={submit}
          />
        </ScrollView>
      </KeyboardAvoider>
    </Modal>
  );
}

function Line({ text, bad }) {
  return (
    <View style={[styles.line, bad ? styles.lineBad : styles.lineOk]}>
      <AppText
        size={13.5}
        weight={500}
        color={bad ? colors.badTintText : colors.okTintText}
        accessibilityRole={bad ? 'alert' : undefined}
      >
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { padding: s(20), paddingTop: mvs(24), gap: mvs(14) },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: mvs(4),
  },
  line: {
    borderRadius: ms(10),
    paddingVertical: mvs(10),
    paddingHorizontal: s(12),
  },
  lineOk: { backgroundColor: colors.okTint },
  lineBad: { backgroundColor: colors.badTint },
});
