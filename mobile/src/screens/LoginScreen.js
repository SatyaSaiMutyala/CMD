import React, { useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  Button,
  KeyboardAvoider,
  TextField,
} from '../components/common';
import { LockIcon, UserIcon } from '../components/icons';
import { useAuth } from '../store/AuthProvider';
import { colors, hairline, ms, mvs, s } from '../theme';

const logo = require('../assets/images/trustlab-logo.png');

/* Sign-in: brand header with the Trustlab mark, and the form on a white card */
export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (e) {
      setError(e.message || 'Could not sign in. Try again.');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoider
      style={styles.screen}
    >
      <ScrollView
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={[styles.brand, { paddingTop: mvs(36) + insets.top }]}>
          <View style={styles.logoTile}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>
          <AppText display size={26} color={colors.onBrand} align="center">
            CMD Approval Hub
          </AppText>
          <AppText
            size={13}
            lh={1.5}
            color={colors.onBrandSoft}
            align="center"
            style={styles.tagline}
          >
            One inbox for every CMD-level approval across Trustlab software.
          </AppText>
        </View>

        <View style={[styles.card, { marginBottom: mvs(24) + insets.bottom }]}>
          <AppText display size={24} accessibilityRole="header">
            Sign In
          </AppText>
          <AppText size={13} color={colors.muted} style={styles.help}>
            Use the email and password your admin gave you.
          </AppText>

          <TextField
            label="Email"
            icon={UserIcon}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            style={styles.field}
          />
          <TextField
            ref={passwordRef}
            label="Password"
            icon={LockIcon}
            secure
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            style={styles.field}
          />

          {error ? (
            <View accessibilityRole="alert" style={styles.error}>
              <AppText size={13} color={colors.badTintText}>
                {error}
              </AppText>
            </View>
          ) : null}

          <Button
            size="xl"
            radius={12}
            label={busy ? 'Signing in…' : 'Sign In'}
            disabled={busy}
            onPress={submit}
            style={styles.submit}
          />

          <View style={styles.footer}>
            <LockIcon size={13} color={colors.faint} />
            <AppText size={11} color={colors.faint}>
              Authorized access only · CMD Approval Hub
            </AppText>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { flexGrow: 1 },
  brand: {
    alignItems: 'center',
    backgroundColor: colors.brand,
    paddingHorizontal: s(28),
    // the card below overlaps this by the same amount
    paddingBottom: mvs(36) + ms(40),
  },
  logoTile: {
    width: ms(104),
    height: ms(104),
    borderRadius: ms(26),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: mvs(18),
  },
  logo: { width: '80%', height: '80%' },
  tagline: { marginTop: mvs(8), maxWidth: s(280) },
  card: {
    marginTop: -ms(40),
    marginHorizontal: s(16),
    padding: ms(22),
    borderRadius: ms(22),
    backgroundColor: colors.card,
    borderWidth: hairline,
    borderColor: colors.line,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  help: { marginTop: mvs(4), marginBottom: mvs(6) },
  field: { marginTop: mvs(14) },
  error: {
    marginTop: mvs(14),
    paddingVertical: mvs(10),
    paddingHorizontal: s(14),
    borderRadius: ms(12),
    backgroundColor: colors.badTint,
  },
  submit: { marginTop: mvs(20) },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    marginTop: mvs(18),
  },
});
