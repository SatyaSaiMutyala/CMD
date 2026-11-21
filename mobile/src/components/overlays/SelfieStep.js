import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { takeSelfie } from '../../services/selfie';
import { colors, ms, mvs, s } from '../../theme';
import { AppText, Button, Eyebrow, FieldError } from '../common';
import { Icon } from '../icons';

/* "Selfie verification" on the sheet that signs a Sales Pulse contract, the
   way its own review window asks for it:

     Take selfie  ->  the camera  ->  the photo, with Retake

   `value` is the photo (an image data URL) or null; `onChange` is given the
   new one. `missing` shows the reminder when signing was tried without it. */
export default function SelfieStep({ value, onChange, disabled, missing }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const take = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const shot = await takeSelfie();
    setBusy(false);
    if (shot.photo) onChange(shot.photo);
    else if (shot.error) setError(shot.error);
  };

  return (
    <View style={styles.box}>
      <View style={styles.title}>
        <Icon name="camera" size={15} stroke={2.4} />
        <Eyebrow size={11} track={0.07}>
          SELFIE VERIFICATION · REQUIRED
        </Eyebrow>
      </View>
      {value ? (
        <View style={styles.taken}>
          <Image
            source={{ uri: value }}
            accessibilityLabel="Captured selfie"
            style={styles.photo}
          />
          <View style={styles.takenCopy}>
            <View style={styles.ok}>
              <Icon name="check" size={15} stroke={3} />
              <AppText size={13} weight={800}>
                Selfie captured
              </AppText>
            </View>
            <Button
              label="Retake"
              variant="outline"
              height={38}
              fontSize={13}
              disabled={disabled || busy}
              onPress={take}
            />
          </View>
        </View>
      ) : (
        <>
          <Button
            label={busy ? 'Opening camera…' : 'Take selfie'}
            icon="camera"
            variant="outlineTeal"
            height={46}
            fontSize={14}
            disabled={disabled || busy}
            onPress={take}
          />
          <AppText size={11.5} color={colors.muted}>
            Allow camera access when prompted.
          </AppText>
        </>
      )}
      {error ? <FieldError text={error} /> : null}
      {missing && !value && !error ? (
        <FieldError text="Take your selfie before approving." />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: mvs(8),
    padding: ms(12),
    borderWidth: 2,
    borderColor: colors.mintMid,
    borderRadius: ms(16),
    backgroundColor: colors.white,
  },
  title: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  taken: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  photo: {
    width: ms(84),
    height: ms(84),
    borderRadius: ms(14),
    borderWidth: 2,
    borderColor: colors.teal,
    backgroundColor: colors.mint,
  },
  takenCopy: { flex: 1, gap: mvs(8) },
  ok: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
});
