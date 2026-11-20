import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { findSoftware } from '../../data/registry';
import { useHub } from '../../store/HubProvider';
import { stageCount, visibleItems } from '../../store/selectors';
import { colors, ms, mvs, s } from '../../theme';
import {
  AppText,
  Button,
  Eyebrow,
  KeyboardAvoider,
  TextField,
} from '../common';

function Headline({ eyebrow, amount, line }) {
  return (
    <>
      <Eyebrow style={styles.eyebrow}>{eyebrow}</Eyebrow>
      <View>
        <AppText
          display
          size={44}
          lh={1}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {amount}
        </AppText>
        <AppText display size={18} style={styles.line}>
          {line}
        </AppText>
      </View>
    </>
  );
}

function Fact({ label, value }) {
  return (
    <View style={styles.fact}>
      <AppText size={14} color={colors.muted}>
        {label}
      </AppText>
      <AppText size={14} weight={700} align="right" style={styles.factValue}>
        {value}
      </AppText>
    </View>
  );
}

function Fine({ children }) {
  return (
    <AppText size={12.5} lh={1.45} color={colors.muted}>
      {children}
    </AppText>
  );
}

function ErrorLine({ text }) {
  return (
    <AppText size={13} weight={600} color={colors.bad} accessibilityRole="alert">
      {text}
    </AppText>
  );
}

/* Sheet titles and wording for each kind of single-item decision */
const KINDS = {
  approve: stage => ({
    eyebrow: stage.approveTitle || 'APPROVE',
    toLabel: 'Next stage',
    to: stage.next || 'Next stage',
    fine: sw =>
      `Your decision is sent to ${sw.name} and logged against your name.`,
    button: stage.confirm || 'Confirm approval',
    variant: 'approve',
    reason: null,
  }),
  back: stage => ({
    eyebrow: 'SEND BACK',
    toLabel: 'Returns to',
    to: stage.back || 'Previous stage',
    fine: () =>
      'The item goes back one stage for correction. It is logged against your name.',
    button: 'Confirm send back',
    variant: 'danger',
    reason: { label: 'Reason (optional)', required: false },
  }),
  reject: () => ({
    eyebrow: 'REJECT',
    toLabel: 'Returns to',
    to: 'Registered',
    fine: () =>
      'The item goes all the way back to the desk that registered it, with your reason shown to them. It is logged against your name.',
    button: 'Confirm rejection',
    variant: 'danger',
    reason: { label: 'Reason for rejection', required: true },
  }),
};

/* Bottom sheet that confirms an approve, a send-back, a rejection or a
   "move all". Nothing is sent until the confirm button is pressed. */
export default function ConfirmSheet() {
  const {
    sheet,
    sheetBusy,
    sheetError,
    store,
    closeSheet,
    confirmSheet,
  } = useHub();
  const insets = useSafeAreaInsets();
  const rise = useRef(new Animated.Value(0)).current;
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  const open = !!sheet;
  const sheetKey = sheet ? `${sheet.type}:${sheet.id || sheet.stage}` : null;

  useEffect(() => {
    if (!open) return undefined;
    setReason('');
    setMissing(false);
    rise.setValue(0);
    Animated.timing(rise, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSheet();
      return true;
    });
    return () => back.remove();
  }, [open, sheetKey, rise, closeSheet]);

  if (!sheet) return null;
  const sw = findSoftware(sheet.swId);
  const stage = sw.stages.find(x => x.key === sheet.stage);

  let body;
  if (sheet.type === 'bulk') {
    const n = stageCount(store, sw, stage) || 0;
    body = (
      <>
        <Headline
          eyebrow="MOVE ALL"
          amount={`${n} items`}
          line={`to ${stage.next}`}
        />
        <Fine>
          All {n} items waiting in {stage.label} are approved together and
          sent to {sw.name}. This is logged against your name.
        </Fine>
        {sheetError ? <ErrorLine text={sheetError} /> : null}
        <Button
          variant="primary"
          size="lg"
          label={sheetBusy ? 'Moving…' : `Move all ${n}`}
          disabled={sheetBusy}
          onPress={() => confirmSheet()}
        />
      </>
    );
  } else {
    const item = visibleItems(store, sw, stage).find(i => i.id === sheet.id);
    if (!item) return null;
    const kind = KINDS[sheet.type](stage);
    const submit = () => {
      const text = reason.trim();
      if (kind.reason && kind.reason.required && !text) {
        setMissing(true);
        return;
      }
      Keyboard.dismiss();
      confirmSheet(text);
    };
    body = (
      <>
        <Headline
          eyebrow={kind.eyebrow}
          amount={item.decides || item.balance || item.amount}
          line={item.party}
        />
        <View style={styles.facts}>
          <Fact label="Reference" value={item.id} />
          <Fact label="Type" value={item.type || ''} />
          <Fact label="Due" value={item.dueLong || item.due} />
          <Fact label={kind.toLabel} value={kind.to} />
        </View>
        {kind.reason ? (
          <TextField
            label={kind.reason.label}
            value={reason}
            onChangeText={text => {
              setReason(text);
              setMissing(false);
            }}
            placeholder="What should be corrected?"
            maxLength={300}
            returnKeyType="done"
            editable={!sheetBusy}
          />
        ) : null}
        {missing ? <ErrorLine text="Give a reason for the rejection." /> : null}
        <Fine>{kind.fine(sw)}</Fine>
        {sheetError ? <ErrorLine text={sheetError} /> : null}
        <Button
          variant={kind.variant}
          size="lg"
          label={sheetBusy ? 'Sending…' : kind.button}
          disabled={sheetBusy}
          onPress={submit}
        />
      </>
    );
  }

  return (
    <KeyboardAvoider
      style={styles.host}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.scrim}
        onPress={closeSheet}
        accessibilityLabel="Cancel"
        accessibilityRole="button"
      />
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: mvs(24) + insets.bottom },
          {
            opacity: rise.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 1],
            }),
            transform: [
              {
                translateY: rise.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.grab} />
        {body}
        <Button
          variant="ghost"
          label="Cancel"
          weight={600}
          disabled={sheetBusy}
          onPress={closeSheet}
        />
      </Animated.View>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 10,
    elevation: 10,
  },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: ms(26),
    borderTopRightRadius: ms(26),
    paddingTop: mvs(12),
    paddingHorizontal: s(20),
    gap: mvs(14),
  },
  grab: {
    width: s(44),
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
    alignSelf: 'center',
  },
  eyebrow: { marginTop: mvs(6) },
  line: { marginTop: mvs(6) },
  facts: { borderTopWidth: 1, borderTopColor: colors.line2 },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: s(12),
    paddingVertical: mvs(11),
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  factValue: { flex: 1 },
});
