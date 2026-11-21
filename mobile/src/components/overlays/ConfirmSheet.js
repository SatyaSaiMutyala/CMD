import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { findSoftware } from '../../data/registry';
import { useHub } from '../../store/HubProvider';
import { waitingCount } from '../../store/selectors';
import { colors, fontStyle, fs, ms, mvs, s, shadows } from '../../theme';
import {
  AppText,
  Button,
  Eyebrow,
  FieldError,
  KeyboardAvoider,
  SlideToConfirm,
  useKeyboardHeight,
} from '../common';
import { Icon } from '../icons';
import SelfieStep from './SelfieStep';

/* How each single-item decision reads on the sheet */
const KINDS = {
  approve: (stage, item) => {
    const release = stage.key === 'rel';
    const what = stage.key === 'inv' ? 'invoice' : 'payment';
    return {
      eyebrow: stage.approveTitle || 'APPROVE',
      mark: { icon: 'check', size: 26, stroke: 2.8, style: 'markApprove' },
      toLabel: 'NEXT STAGE',
      to: stage.next,
      fine:
        stage.approveFine ||
        (release
          ? `Releases this payment and moves it to ${stage.next}. Logged against your name.`
          : `Sends this ${what} on to ${stage.next}. Logged against your name.`),
      // a stage's own words for going forward ("Slide to publish")
      slide: item.plainSlide
        ? stage.approveSlide || 'Slide to approve'
        : `Slide to ${release ? 'release' : 'approve'} ${item.amountNow}`,
      busy: stage.approveBusy || (release ? 'Releasing…' : 'Approving…'),
      tone: 'approve',
    };
  },
  // AIMS only: the first of its two sign-offs
  verify: stage => ({
    eyebrow: 'VERIFY',
    mark: { icon: 'shield', size: 24, stroke: 2.4, style: 'markBack' },
    toLabel: 'THEN',
    to: stage.verifyTo || 'Waiting for approval',
    fine:
      stage.verifyFine ||
      'Verifies this item; it then waits for approval. Logged against your name.',
    slide: 'Slide to verify',
    busy: 'Verifying…',
    tone: 'approve',
  }),
  reject: stage => ({
    eyebrow:
      stage.rejectTitle ||
      (stage.key === 'inv' ? 'REJECT INVOICE' : 'REJECT PAYMENT'),
    mark: { icon: 'x', size: 26, stroke: 2.8, style: 'markReject' },
    toLabel: 'RETURNS TO',
    to: stage.rejectTo || 'Registered',
    fine:
      stage.rejectFine ||
      'Returns the invoice all the way to the desk that registered it. Logged against your name.',
    // a stage's own words where its second choice is not a rejection
    // (TrustMark's Version Tracker: feedback)
    slide: stage.rejectSlide || 'Slide to reject',
    busy: stage.rejectBusy || 'Rejecting…',
    tone: 'return',
    reason: {
      label: stage.rejectReason || 'Reason for rejecting · required',
      required: true,
      missing: stage.rejectMissing || 'Enter a reason before rejecting.',
    },
  }),
  back: stage => ({
    eyebrow: 'SEND BACK',
    mark: { icon: 'undo', size: 24, stroke: 2.4, style: 'markBack' },
    toLabel: 'RETURNS TO',
    to: stage.back || 'Previous stage',
    fine: 'Returns the item one stage back for correction. Logged against your name.',
    slide: 'Slide to send back',
    busy: 'Sending back…',
    tone: 'return',
    reason: { label: 'Reason for sending back · optional', required: false },
  }),
};

function Fact({ label, value, strong }) {
  return (
    <View style={[styles.fact, strong ? styles.factStrong : null]}>
      <Eyebrow size={11} track={0.07}>
        {label}
      </Eyebrow>
      <AppText size={13.5} weight={strong ? 800 : 700} numberOfLines={1}>
        {value || '—'}
      </AppText>
    </View>
  );
}

/* It was not sent: what went wrong, above a slide to try again */
function Failure({ error }) {
  return (
    <View accessibilityRole="alert" style={styles.failure}>
      <View style={styles.failureMark}>
        <Icon name="wifiOff" size={20} stroke={2.2} />
      </View>
      <View style={styles.grow}>
        <AppText size={14} weight={800}>
          {error.title}
        </AppText>
        <AppText size={12.5} lh={1.4} color={colors.muted}>
          {error.text}
        </AppText>
      </View>
    </View>
  );
}

/* The big tick after a decision in the swipe review */
function Done({ done, approve, more, onNext }) {
  return (
    <View style={styles.done}>
      <View
        style={[
          styles.doneHalo,
          { backgroundColor: approve ? colors.yellowSoft : colors.mint },
        ]}
      >
        <View
          style={[
            styles.doneDisc,
            { backgroundColor: approve ? colors.yellow : colors.teal },
          ]}
        >
          <Icon
            name="check"
            size={50}
            stroke={2.6}
            color={approve ? colors.ink : colors.white}
          />
        </View>
      </View>
      <AppText display size={30} weight={800} style={styles.doneTitle}>
        {done.title}
      </AppText>
      <AppText
        size={14}
        lh={1.5}
        color={colors.muted}
        align="center"
        style={styles.doneText}
      >
        {done.text}
      </AppText>
      <Button
        variant="yellow"
        height={58}
        fontSize={16}
        iconRight="arrowRight"
        iconSize={20}
        label={more ? 'Next approval' : 'Done'}
        onPress={onNext}
        style={styles.doneButton}
      />
    </View>
  );
}

/* The fan of cards on the "move all" sheet */
function Fan({ label, count }) {
  return (
    <View style={styles.fan}>
      <View style={[styles.fanCard, styles.fanBack]} />
      <View style={[styles.fanCard, styles.fanMid]} />
      <View style={[styles.fanCard, styles.fanTop]}>
        <AppText size={11} weight={800} track={0.08} color={colors.white} numberOfLines={1}>
          {label.toUpperCase()}
        </AppText>
        <AppText display size={40} lh={1} weight={800} color={colors.white}>
          ×{count}
        </AppText>
      </View>
    </View>
  );
}

/* Bottom sheet that confirms an approve, a send-back, a rejection or a
   "move all". Nothing is sent until the slider is slid to the end. */
export default function ConfirmSheet() {
  const {
    sheet,
    sheetBusy,
    sheetError,
    sheetDone,
    store,
    gone,
    closeSheet,
    confirmSheet,
  } = useHub();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const rise = useRef(new Animated.Value(0)).current;
  const keyboard = useKeyboardHeight();
  const bodyScroll = useRef(null);
  const reasonY = useRef(0);
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  // The live selfie, for the one decision that needs it (signing a Sales
  // Pulse contract), and whether signing was tried without it
  const [photo, setPhoto] = useState(null);
  const [noPhoto, setNoPhoto] = useState(false);
  const [tooTall, setTooTall] = useState(false);
  // Changing this sends the slider back to its start
  const [attempt, setAttempt] = useState(0);
  const busyNow = useRef(false);
  busyNow.current = sheetBusy;
  const open = !!sheet;
  const sheetKey = sheet ? `${sheet.type}:${sheet.id || sheet.stage}` : null;

  useEffect(() => {
    if (!open) return undefined;
    setReason('');
    setMissing(false);
    setPhoto(null);
    setNoPhoto(false);
    rise.setValue(0);
    Animated.timing(rise, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    // Android's back button closes the sheet — but not while a decision is
    // on its way to the server (read fresh each time: `busy` changes after
    // this was set up)
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busyNow.current) closeSheet();
      return true;
    });
    return () => back.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sheetKey, rise, closeSheet]);

  // It failed: the slider comes back so it can be slid again
  useEffect(() => {
    if (sheetError) setAttempt(n => n + 1);
  }, [sheetError]);

  if (!sheet) return null;
  const sw = findSoftware(sheet.swId);
  const stage = sw.stages.find(x => x.key === sheet.stage);
  const cancel = sheetBusy ? undefined : closeSheet;
  const retry = sheetError
    ? { label: 'Slide to try again', icon: 'refresh' }
    : null;
  // The sheet stands on the keyboard when it is open, and must still fit
  const maxHeight = height - insets.top - mvs(16) - keyboard;

  let body;
  if (sheetDone) {
    body = (
      <Done
        done={sheetDone}
        approve={sheet.type === 'approve'}
        more={(waitingCount(store, sw, stage, gone) || 0) > 0}
        onNext={closeSheet}
      />
    );
  } else if (sheet.type === 'bulk') {
    const n = sheet.count;
    body = (
      <>
        <Fan label={stage.label} count={n} />
        <View style={styles.bulkHead}>
          <Eyebrow>MOVE ALL</Eyebrow>
          <AppText
            display
            size={28}
            lh={1.1}
            weight={800}
            align="center"
            accessibilityRole="header"
          >
            {(stage.bulkTitle || 'Move all {n}').replace('{n}', n)}
          </AppText>
        </View>
        <View style={styles.route}>
          <View style={[styles.routeBox, styles.routeFrom]}>
            <Eyebrow size={11} track={0.07}>
              FROM
            </Eyebrow>
            <AppText size={14} weight={800} numberOfLines={1}>
              {stage.label}
            </AppText>
          </View>
          <View style={styles.routeArrow}>
            <Icon name="arrowRight" size={18} stroke={2.6} />
          </View>
          <View style={[styles.routeBox, styles.routeTo]}>
            <Eyebrow size={11} track={0.07}>
              TO
            </Eyebrow>
            <AppText size={14} weight={800} numberOfLines={1}>
              {stage.next}
            </AppText>
          </View>
        </View>
        <AppText size={13} lh={1.45} color={colors.muted} align="center">
          All {n} are approved together and each is logged against your name.
        </AppText>
        {sheetError ? <Failure error={sheetError} /> : null}
        <SlideToConfirm
          label={
            retry
              ? retry.label
              : (stage.bulkSlide || 'Slide to move all {n}').replace('{n}', n)
          }
          icon={retry ? retry.icon : 'arrowRight'}
          holdKey={attempt}
          busy={sheetBusy}
          busyLabel={`Moving all ${n}…`}
          onComplete={() => confirmSheet()}
        />
      </>
    );
  } else {
    const item = sheet.item;
    const amountNow = item.decides || item.balance || item.amount;
    const kind = KINDS[sheet.type](stage, {
      amountNow,
      plainSlide: item.plainSlide,
    });
    // Signing a contract: the selfie first, as Sales Pulse's own review window
    // asks, and an optional note for whoever raised the contract
    const selfie = sheet.type === 'approve' && !!item.needsSelfie;
    if (selfie) {
      kind.slide = 'Slide to approve & sign';
      kind.busy = 'Applying signature…';
      kind.reason = {
        label: 'Note for the initiator · optional',
        required: false,
        placeholder: 'Anything they should know',
      };
    }
    const text = reason.trim();
    const blocked = !!(kind.reason && kind.reason.required && !text);
    body = (
      <>
        <View style={styles.head}>
          <View style={[styles.mark, styles[kind.mark.style]]}>
            <Icon
              name={kind.mark.icon}
              size={kind.mark.size}
              stroke={kind.mark.stroke}
            />
          </View>
          <View style={styles.headCopy}>
            <Eyebrow accessibilityRole="header">{kind.eyebrow}</Eyebrow>
            <AppText size={13.5} lh={1.35} weight={700} numberOfLines={1}>
              {item.party}
            </AppText>
          </View>
        </View>
        <AppText
          display
          size={44}
          lh={1}
          weight={800}
          track={-0.02}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {amountNow}
        </AppText>
        <View style={styles.facts}>
          <Fact label="REFERENCE" value={item.ref || item.id} />
          <Fact label="TYPE" value={item.type} />
          <Fact
            label={item.dueLabel || 'DUE'}
            value={String(item.due || '').replace(/^Sent /, '')}
          />
          <Fact strong label={kind.toLabel} value={kind.to} />
        </View>

        {selfie ? (
          <SelfieStep
            value={photo}
            onChange={value => {
              setPhoto(value);
              setNoPhoto(false);
            }}
            disabled={sheetBusy}
            missing={noPhoto}
          />
        ) : null}

        {kind.reason ? (
          <View
            style={styles.reason}
            onLayout={e => {
              reasonY.current = e.nativeEvent.layout.y;
            }}
          >
            <AppText size={13} weight={700}>
              {kind.reason.label}
            </AppText>
            <TextInput
              accessibilityLabel={kind.reason.label}
              value={reason}
              onChangeText={value => {
                setReason(value);
                setMissing(false);
              }}
              placeholder={
                kind.reason.placeholder ||
                (stage.rejectTitle
                  ? 'What should be corrected?'
                  : "e.g. GST number doesn't match the supplier")
              }
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.teal}
              multiline
              maxLength={300}
              // On a small phone the sheet scrolls once the keyboard is up:
              // bring the reason box to the top of what is left
              onFocus={() =>
                setTimeout(() => {
                  if (bodyScroll.current) {
                    bodyScroll.current.scrollTo({
                      y: Math.max(reasonY.current - ms(12), 0),
                      animated: true,
                    });
                  }
                }, 350)
              }
              editable={!sheetBusy}
              allowFontScaling={false}
              style={styles.reasonInput}
            />
            {missing ? (
              <FieldError
                text={kind.reason.missing || 'Enter a reason before rejecting.'}
              />
            ) : null}
          </View>
        ) : null}

        <AppText size={13} lh={1.45} color={colors.muted}>
          {kind.fine}
        </AppText>
        {sheetError ? <Failure error={sheetError} /> : null}
        <SlideToConfirm
          label={retry ? retry.label : kind.slide}
          icon={retry ? retry.icon : 'arrowRight'}
          tone={kind.tone}
          holdKey={attempt}
          busy={sheetBusy}
          busyLabel={kind.busy}
          canStart={() => {
            // signing waits for the selfie
            if (selfie && !photo) {
              setNoPhoto(true);
              return false;
            }
            if (!blocked) return true;
            setMissing(true);
            return false;
          }}
          onComplete={() => {
            Keyboard.dismiss();
            confirmSheet(text, selfie ? photo : undefined);
          }}
        />
      </>
    );
  }

  return (
    <KeyboardAvoider style={styles.host} accessibilityViewIsModal>
      <Animated.View style={[styles.scrim, { opacity: rise }]}>
        <Pressable
          style={styles.fill}
          onPress={sheetDone ? closeSheet : cancel}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { maxHeight },
          {
            transform: [
              {
                translateY: rise.interpolate({
                  inputRange: [0, 1],
                  outputRange: [ms(80), 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.grab} />
        <ScrollView
          ref={bodyScroll}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Scrolls only when the sheet cannot fit (small phone + keyboard)
          scrollEnabled={tooTall}
          onContentSizeChange={(_, h) => setTooTall(h > maxHeight - ms(40))}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: mvs(28) + insets.bottom },
          ]}
        >
          {body}
          {sheetDone ? null : (
            <Button
              variant="text"
              height={44}
              weight={700}
              label="Cancel"
              disabled={sheetBusy}
              onPress={cancel}
            />
          )}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoider>
  );
}

const FAN_W = ms(170);

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  fill: { flex: 1 },
  grow: { flex: 1, gap: 2 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: ms(36),
    borderTopRightRadius: ms(36),
    paddingTop: ms(12),
    boxShadow: shadows.sheet,
  },
  grab: {
    alignSelf: 'center',
    width: ms(44),
    height: ms(5),
    borderRadius: ms(3),
    backgroundColor: colors.line,
  },
  content: { paddingTop: mvs(16), paddingHorizontal: s(20), gap: mvs(16) },

  head: { flexDirection: 'row', alignItems: 'center', gap: s(14) },
  headCopy: { flex: 1, minWidth: 0, gap: 3 },
  mark: {
    width: ms(54),
    height: ms(54),
    borderRadius: ms(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  markApprove: { backgroundColor: colors.yellow },
  markReject: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.teal,
  },
  markBack: { backgroundColor: colors.mint },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: ms(8) },
  fact: {
    flexBasis: '45%',
    flexGrow: 1,
    backgroundColor: colors.mint,
    borderRadius: ms(16),
    paddingVertical: ms(10),
    paddingHorizontal: s(12),
    gap: 3,
  },
  factStrong: { backgroundColor: colors.yellowSoft },
  reason: { gap: mvs(7) },
  reasonInput: {
    minHeight: ms(62),
    maxHeight: ms(110),
    borderWidth: 2,
    borderColor: colors.teal,
    borderRadius: ms(16),
    paddingVertical: ms(10),
    paddingHorizontal: s(14),
    backgroundColor: colors.white,
    ...fontStyle(false, 400),
    fontSize: fs(14),
    lineHeight: fs(14) * 1.4,
    color: colors.ink,
    textAlignVertical: 'top',
  },

  failure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.yellow,
    borderRadius: ms(20),
    paddingVertical: ms(12),
    paddingHorizontal: s(14),
  },
  failureMark: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },

  done: { alignItems: 'center', gap: mvs(12), paddingTop: mvs(2) },
  doneHalo: {
    width: ms(140),
    height: ms(140),
    borderRadius: ms(70),
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneDisc: {
    width: ms(112),
    height: ms(112),
    borderRadius: ms(56),
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { marginTop: mvs(2) },
  doneText: { maxWidth: s(300) },
  doneButton: { alignSelf: 'stretch', marginTop: mvs(10) },

  fan: { height: ms(118), alignItems: 'center' },
  fanCard: {
    position: 'absolute',
    width: FAN_W,
    borderRadius: ms(22),
  },
  fanBack: {
    top: ms(18),
    height: ms(96),
    backgroundColor: colors.mint,
    transform: [{ rotate: '-10deg' }, { translateX: -ms(40) }],
  },
  fanMid: {
    top: ms(12),
    height: ms(96),
    backgroundColor: colors.mintMid,
    transform: [{ rotate: '8deg' }, { translateX: ms(40) }],
  },
  fanTop: {
    top: ms(6),
    height: ms(100),
    backgroundColor: colors.teal,
    padding: ms(14),
    justifyContent: 'space-between',
  },
  bulkHead: { alignItems: 'center', gap: mvs(6) },
  route: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  routeBox: {
    flex: 1,
    borderRadius: ms(18),
    paddingVertical: ms(10),
    paddingHorizontal: s(14),
    gap: 2,
  },
  routeFrom: { backgroundColor: colors.mint },
  routeTo: { backgroundColor: colors.yellowSoft },
  routeArrow: {
    width: ms(38),
    height: ms(38),
    borderRadius: ms(19),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
