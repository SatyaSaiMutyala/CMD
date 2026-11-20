import React, { useRef, useState } from 'react';
import { Image, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  KeyboardAvoider,
  KeyboardScroll,
  Ring,
  SlideToConfirm,
  TextField,
} from '../components/common';
import { Icon } from '../components/icons';
import { useAuth } from '../store/AuthProvider';
import { colors, ms, mvs, s, shadows } from '../theme';

const logo = require('../assets/images/trustlab-logo.png');

/* The picture on the teal panel: an approval card with its yellow tick */
function CardArt() {
  return (
    <>
      <View style={styles.artBack} />
      <View style={styles.artCard}>
        <View style={[styles.artBar, { width: ms(80), backgroundColor: colors.mintMid }]} />
        <AppText display size={28} weight={800}>
          ₹79,414
        </AppText>
        <View style={styles.artRow}>
          <View style={[styles.artBar, { width: ms(100), backgroundColor: colors.mint }]} />
          <View style={styles.artTick}>
            <Icon name="check" size={18} stroke={3} />
          </View>
        </View>
      </View>
    </>
  );
}

/* Sign-in: the teal panel with the Trustlab mark and the app's name, then the
   email and password fields and the yellow slide-to-sign-in bar */
export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Changing this sends the slide knob back to its start
  const [attempt, setAttempt] = useState(0);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      setAttempt(n => n + 1);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (e) {
      setError(e.message || 'Could not sign in. Try again.');
      setBusy(false);
      setAttempt(n => n + 1);
    }
  };

  return (
    <KeyboardAvoider style={styles.screen}>
      <StatusBar barStyle="light-content" />
      {/* Room is left under the field in use for the slide-to-sign-in bar */}
      <KeyboardScroll clear={150} contentContainerStyle={styles.content}>
        <View style={[styles.panel, { height: ms(310) + insets.top }]}>
          <Ring
            size={296}
            color={colors.white}
            opacity={0.35}
            style={styles.ringThin}
          />
          <Ring size={146} width={22} color={colors.yellow} style={styles.ringThick} />
          <View style={[styles.logo, { top: insets.top + mvs(10) }]}>
            <Image source={logo} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View style={[styles.art, { top: insets.top }]}>
            <CardArt />
          </View>
          <View style={styles.name}>
            <AppText
              display
              size={40}
              lh={1}
              weight={800}
              track={-0.02}
              color={colors.white}
              accessibilityRole="header"
            >
              CMD{'\n'}Approval Hub
            </AppText>
            <AppText
              size={14.5}
              lh={1.4}
              weight={600}
              color={colors.white}
              style={styles.tagline}
            >
              One inbox for every CMD-level approval.
            </AppText>
          </View>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TextField
            ref={passwordRef}
            label="Password"
            icon="lock"
            secure
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error ? (
            <View accessibilityRole="alert" style={styles.error}>
              <View style={styles.errorMark}>
                <Icon name="alertBare" size={14} stroke={2.8} />
              </View>
              <AppText size={13} lh={1.4} weight={600} style={styles.errorText}>
                {error}
              </AppText>
            </View>
          ) : null}

          {/* Slide the white knob across to sign in (the keyboard's "go"
              key does the same). It comes back if signing in fails. */}
          <SlideToConfirm
            tone="hero"
            labelSide="right"
            label="Slide to sign in"
            holdKey={attempt}
            busy={busy}
            busyLabel="Signing in…"
            onComplete={submit}
            style={styles.submit}
          />
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + mvs(24) }]}>
          <Icon name="shield" size={15} stroke={2.2} color={colors.muted} />
          <AppText size={12.5} weight={600} color={colors.muted}>
            Authorized access only
          </AppText>
        </View>
      </KeyboardScroll>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1 },
  panel: {
    overflow: 'hidden',
    backgroundColor: colors.teal,
    borderBottomLeftRadius: ms(48),
    borderBottomRightRadius: ms(48),
  },
  ringThin: { left: -s(58), top: -ms(78) },
  ringThick: { right: -s(23), bottom: -ms(33) },
  logo: {
    position: 'absolute',
    left: s(24),
    width: ms(58),
    height: ms(58),
    borderRadius: ms(29),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: ms(42), height: ms(42) },
  art: { position: 'absolute', left: 0, right: 0, height: ms(240) },
  artBack: {
    position: 'absolute',
    left: s(150),
    top: ms(24),
    width: s(200),
    height: ms(120),
    borderRadius: ms(26),
    backgroundColor: colors.mint,
    transform: [{ rotate: '9deg' }],
  },
  artCard: {
    position: 'absolute',
    left: s(128),
    top: ms(46),
    width: s(210),
    borderRadius: ms(26),
    backgroundColor: colors.white,
    padding: ms(14),
    gap: mvs(8),
    transform: [{ rotate: '-5deg' }],
    boxShadow: '0px 20px 40px rgba(5,58,50,0.18)',
  },
  artBar: { height: ms(8), borderRadius: ms(4) },
  artRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  artTick: {
    width: ms(38),
    height: ms(38),
    borderRadius: ms(19),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { position: 'absolute', left: s(24), bottom: ms(34), gap: mvs(8) },
  tagline: { maxWidth: s(240) },

  form: {
    flex: 1,
    paddingTop: mvs(28),
    paddingHorizontal: s(22),
    gap: mvs(14),
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    backgroundColor: colors.yellowSoft,
    borderRadius: ms(20),
    paddingVertical: ms(11),
    paddingHorizontal: s(14),
  },
  errorMark: {
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { flex: 1 },
  submit: { boxShadow: shadows.yellowSoft },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(7),
    paddingTop: mvs(24),
    paddingHorizontal: s(24),
  },
});
