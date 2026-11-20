import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { APP_VERSION } from '../../update/appVersion';
import { colors, ms, mvs, s, shadows } from '../../theme';
import { useForceUpdate } from '../../update/useForceUpdate';
import { AppText, Button, Eyebrow } from '../common';
import { Icon } from '../icons';

/* A blocking "Update required" box: no close, the back button does nothing,
   and the only way on is the store. Shown when this build is too old (see
   update/useForceUpdate.js for who decides that). */
export default function ForceUpdateDialog() {
  const { updateRequired, storeVersion, openStore } = useForceUpdate();
  if (!updateRequired) return null;
  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={() => {}}
    >
      {/* Plain flex centring: absolute layers inside a transparent Modal
          come out zero-sized on iOS. */}
      <View style={styles.scrim}>
        <View accessibilityRole="alert" style={styles.card}>
          <View style={styles.halo}>
            <View style={styles.disc}>
              <Icon name="arrowUp" size={40} stroke={2.4} />
            </View>
          </View>
          <Eyebrow>UPDATE REQUIRED</Eyebrow>
          <AppText display size={26} lh={1.1} weight={800} align="center">
            A new version is ready
          </AppText>
          <AppText size={14} lh={1.5} color={colors.muted} align="center">
            Version {storeVersion} of CMD Approval Hub is available. This
            version ({APP_VERSION}) can no longer be used. Please update to
            continue.
          </AppText>
          <Button
            variant="yellow"
            height={58}
            fontSize={16}
            trail="arrowRight"
            label="Update now"
            onPress={openStore}
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(22),
  },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: ms(36),
    paddingTop: mvs(28),
    paddingHorizontal: s(22),
    paddingBottom: mvs(22),
    gap: mvs(10),
    boxShadow: shadows.inkCard,
  },
  halo: {
    width: ms(120),
    height: ms(120),
    borderRadius: ms(60),
    backgroundColor: colors.yellowSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: mvs(6),
  },
  disc: {
    width: ms(92),
    height: ms(92),
    borderRadius: ms(46),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: { alignSelf: 'stretch', marginTop: mvs(10) },
});
