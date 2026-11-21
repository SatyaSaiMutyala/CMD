import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { findSoftware } from '../../data/registry';
import { DetailsSkeleton } from '../approvals/Skeletons';
import { useCreateFileLinkMutation, useGetItemQuery } from '../../store/api';
import { useHub } from '../../store/HubProvider';
import { visibleItems } from '../../store/selectors';
import { colors, hairline, ms, mvs, s, shadows } from '../../theme';
import { amountOf } from '../../utils/format';
import {
  AppText,
  Button,
  Card,
  CircleButton,
  Eyebrow,
  Notice,
  Pill,
  Ring,
  SlideToConfirm,
} from '../common';
import { Icon } from '../icons';

// Shown in the header or in "Payment so far", so not repeated under Figures
const NOT_FIGURES = ['Reference', 'Due', 'Already paid', 'To approve now'];
const IMAGE = /\.(png|jpe?g|gif|webp|heic|bmp)$/i;

/* One attached document: a small preview, its name and where it is kept.
   Tapping opens it in the phone's browser. */
function DocCard({ doc, tint, busy, disabled, onPress }) {
  const image = IMAGE.test(doc.name);
  const kind = image
    ? 'Image'
    : (/\.([a-z0-9]{2,5})$/i.exec(doc.name) || [])[1];
  const lines = tint ? colors.yellowMid : colors.mintMid;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${doc.group || doc.name}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.doc, pressed ? styles.pressed : null]}
    >
      {image ? (
        <View style={[styles.preview, styles.previewImage]}>
          <Icon name="image" size={34} stroke={1.8} color={colors.teal} />
        </View>
      ) : (
        <View
          style={[
            styles.preview,
            { backgroundColor: tint ? colors.yellowSoft : colors.mint },
          ]}
        >
          <View
            style={[
              styles.bar,
              styles.barHead,
              { width: tint ? '50%' : '60%' },
            ]}
          />
          <View
            style={[styles.bar, { width: '90%', backgroundColor: lines }]}
          />
          <View
            style={[
              styles.bar,
              { width: tint ? '70%' : '80%', backgroundColor: lines },
            ]}
          />
          <View
            style={[styles.bar, { width: '85%', backgroundColor: lines }]}
          />
          {tint ? null : <View style={styles.stampMark} />}
        </View>
      )}
      <AppText size={13} weight={800} numberOfLines={2}>
        {busy ? 'Opening…' : doc.group || doc.name}
      </AppText>
      <AppText size={11.5} color={colors.muted} numberOfLines={2}>
        {[
          kind ? kind.toUpperCase().replace('IMAGE', 'Image') : '',
          doc.size,
          doc.source,
        ]
          .filter(Boolean)
          .join(' · ')}
      </AppText>
    </Pressable>
  );
}

/* One approval in full, as a page over whatever was open: the amount and due
   date on teal, the attached documents (each opens in the phone's browser),
   how much is already paid, the figures, the note from the desk that raised
   it and the latest activity. Send back and the slide to approve are at the
   bottom, so the CMD can read the paperwork and decide without going back to
   the list. */
export default function DetailsModal() {
  const { detail, sheet, store, closeDetail, openSheet, confirmSheet } =
    useHub();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const rise = useRef(new Animated.Value(0)).current;
  const open = !!detail;
  const { data, error, isFetching, refetch } = useGetItemQuery(
    detail ? { swId: detail.swId, id: detail.id } : undefined,
    { skip: !open },
  );
  const [createFileLink] = useCreateFileLinkMutation();
  const [opening, setOpening] = useState(null); // id of the document being opened
  const [fileError, setFileError] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    setFileError(null);
    rise.setValue(0);
    Animated.timing(rise, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDetail();
      return true;
    });
    return () => back.remove();
  }, [open, rise, closeDetail]);

  if (!detail) return null;

  const sw = findSoftware(detail.swId);
  const stage = sw.stages.find(x => x.key === detail.stage);
  // The list's copy of the item: what a decision is about, and what is allowed
  const item = visibleItems(store, sw, stage).find(i => i.id === detail.id);
  const release = stage.key === 'rel';
  const facts = data ? Object.fromEntries(data.facts) : {};
  const amount =
    (item && (item.decides || item.balance || item.amount)) ||
    facts['To approve now'] ||
    '';
  const due = facts.Due || (item && item.due) || '';
  const overdue = item ? item.overdue : /overdue/i.test(due);

  const paid = amountOf(facts['Already paid']);
  const now = amountOf(facts['To approve now']);
  const paidShare =
    paid + now > 0 ? Math.round((paid / (paid + now)) * 100) : 0;

  const openDocument = async doc => {
    setOpening(doc.id);
    setFileError(null);
    try {
      const url = await createFileLink({
        swId: detail.swId,
        id: detail.id,
        docId: doc.id,
      }).unwrap();
      await Linking.openURL(url);
    } catch (e) {
      setFileError((e && e.message) || 'That document could not be opened.');
    } finally {
      setOpening(null);
    }
  };

  // The sheet opens over this page; a decision that goes through closes both
  const decide = type => () =>
    openSheet(type, detail.swId, detail.stage, detail.id, { from: 'details' });

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[
        styles.host,
        {
          transform: [
            {
              translateY: rise.interpolate({
                inputRange: [0, 1],
                outputRange: [height, 0],
              }),
            },
          ],
        },
      ]}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + ms(140) }}
      >
        <View style={[styles.header, { paddingTop: insets.top + mvs(6) }]}>
          <Ring
            size={168}
            width={24}
            color={colors.yellow}
            style={styles.ringThick}
          />
          <Ring
            size={238}
            color={colors.white}
            opacity={0.35}
            style={styles.ringThin}
          />
          <View style={styles.headerTop}>
            <CircleButton
              icon="x"
              iconSize={20}
              stroke={2.4}
              border={null}
              label="Close"
              onPress={closeDetail}
            />
            <Pill
              label={`${sw.name} · ${stage.label}`}
              height={32}
              pad={12}
              style={styles.shrink}
            />
          </View>
          <AppText
            size={12.5}
            weight={800}
            track={0.04}
            color={colors.white}
            style={styles.ref}
          >
            {(item && item.ref) || detail.id}
          </AppText>
          <AppText
            display
            size={23}
            lh={1.2}
            weight={700}
            color={colors.white}
            accessibilityRole="header"
            style={styles.party}
          >
            {(data && data.party) || (item && item.party) || 'Details'}
          </AppText>
          {amount ? (
            <View style={styles.amount}>
              <AppText
                display
                size={50}
                lh={1}
                weight={800}
                track={-0.02}
                color={colors.white}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={styles.shrink}
              >
                {amount}
              </AppText>
              <AppText
                size={13}
                weight={700}
                color={colors.white}
                style={styles.amountNote}
              >
                {item && item.amountNote != null
                  ? item.amountNote
                  : `to ${release ? 'release' : 'approve'} now`}
              </AppText>
            </View>
          ) : null}
          {due ? (
            <Pill
              // "Due 21 Nov · in 2d" for a payment; "Sent 20 Nov" as it is
              label={/^Sent /.test(due) ? due : `Due ${due}`}
              icon={overdue ? 'alert' : 'clock'}
              height={30}
              pad={12}
              size={12.5}
              iconSize={14}
              iconStroke={2.4}
              bg={colors.yellow}
            />
          ) : null}
        </View>

        {!data && isFetching ? (
          <DetailsSkeleton />
        ) : !data ? (
          <View style={styles.waiting}>
            <Notice
              tone="info"
              icon="wifiOff"
              text={(error && error.message) || 'Could not load the details.'}
            />
            <Button
              variant="teal"
              icon="refresh"
              label="Try again"
              onPress={refetch}
            />
          </View>
        ) : (
          <>
            {/* Documents ride up over the bottom of the header */}
            <View style={styles.docs}>
              {data.documents.length ? (
                <ScrollView
                  horizontal
                  bounces={false}
                  overScrollMode="never"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.docRow}
                >
                  {data.documents.map((doc, i) => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      tint={i % 2 === 1}
                      busy={opening === doc.id}
                      disabled={!!opening}
                      onPress={() => openDocument(doc)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={[styles.doc, styles.noDocs]}>
                  <AppText size={13} weight={800}>
                    No documents
                  </AppText>
                  <AppText size={11.5} lh={1.4} color={colors.muted}>
                    Nothing is attached to this item.
                  </AppText>
                </View>
              )}
              <View style={styles.docNote}>
                <Icon name="info" size={14} stroke={2} color={colors.muted} />
                <AppText
                  size={12}
                  weight={500}
                  color={colors.muted}
                  style={styles.grow}
                >
                  {[
                    data.documents.length ? 'Tap a document to open it.' : '',
                    data.documentsNote,
                  ]
                    .filter(Boolean)
                    .join(' ') || 'Documents are read live from the source.'}
                </AppText>
              </View>
              {fileError ? (
                <Notice
                  tone="info"
                  icon="alert"
                  text={fileError}
                  style={styles.fileError}
                />
              ) : null}
            </View>

            <View style={styles.sections}>
              {paid > 0 && now > 0 ? (
                <Card bg={colors.mint} style={styles.section}>
                  <View style={styles.sectionHead}>
                    <AppText display size={18} weight={800}>
                      Payment so far
                    </AppText>
                    <AppText size={12.5} weight={700} color={colors.muted}>
                      Invoice {facts['Invoice total'] || ''}
                    </AppText>
                  </View>
                  <View style={styles.split}>
                    <View
                      style={[styles.splitPaid, { width: `${paidShare}%` }]}
                    />
                    <View style={styles.splitNow} />
                  </View>
                  <View style={styles.sectionHead}>
                    <View style={styles.splitSide}>
                      <View style={styles.key}>
                        <View
                          style={[
                            styles.swatch,
                            { backgroundColor: colors.teal },
                          ]}
                        />
                        <AppText size={12} weight={700} color={colors.muted}>
                          Already paid
                        </AppText>
                      </View>
                      <AppText size={16} weight={800}>
                        {facts['Already paid']}
                      </AppText>
                    </View>
                    <View style={[styles.splitSide, styles.right]}>
                      <View style={styles.key}>
                        <View
                          style={[
                            styles.swatch,
                            { backgroundColor: colors.yellow },
                          ]}
                        />
                        <AppText size={12} weight={700} color={colors.muted}>
                          To {release ? 'release' : 'approve'} now
                        </AppText>
                      </View>
                      <AppText size={16} weight={800}>
                        {facts['To approve now']}
                      </AppText>
                    </View>
                  </View>
                </Card>
              ) : null}

              <Card>
                <AppText
                  display
                  size={18}
                  weight={800}
                  style={styles.figuresHead}
                >
                  {data.factsTitle || 'Figures'}
                </AppText>
                {data.facts
                  .filter(([label]) => !NOT_FIGURES.includes(label))
                  .map(([label, value], i, all) => (
                    <View
                      key={label}
                      style={[
                        styles.figure,
                        i === all.length - 1 ? styles.figureLast : null,
                      ]}
                    >
                      <AppText size={13.5} color={colors.muted}>
                        {label}
                      </AppText>
                      <AppText
                        size={14}
                        weight={/total/i.test(label) ? 800 : 700}
                        align="right"
                        style={styles.figureValue}
                      >
                        {value}
                      </AppText>
                    </View>
                  ))}
              </Card>

              {data.notes ? (
                <View style={styles.note}>
                  <Eyebrow track={0.08}>NOTE FROM THE DESK</Eyebrow>
                  <AppText size={14.5} lh={1.55} weight={500}>
                    {data.notes}
                  </AppText>
                </View>
              ) : null}

              {data.activity.length ? (
                <Card>
                  <AppText
                    display
                    size={18}
                    weight={800}
                    style={styles.activityHead}
                  >
                    Recent activity
                  </AppText>
                  {data.activity.map((a, i, all) => {
                    const last = i === all.length - 1;
                    return (
                      <View key={`${a.at}-${i}`} style={styles.event}>
                        <View style={styles.rail}>
                          <View
                            style={[
                              styles.eventMark,
                              i ? styles.eventOld : null,
                            ]}
                          >
                            {i ? (
                              <View style={styles.eventDot} />
                            ) : (
                              <Icon name="arrowUp" size={14} stroke={2.6} />
                            )}
                          </View>
                          {last ? null : <View style={styles.eventLine} />}
                        </View>
                        <View
                          style={[
                            styles.eventCopy,
                            last ? styles.eventLast : null,
                          ]}
                        >
                          <AppText size={14} lh={1.35} weight={700}>
                            {a.msg}
                          </AppText>
                          <AppText size={12.5} color={colors.muted}>
                            {[a.who, a.at].filter(Boolean).join(' · ')}
                          </AppText>
                        </View>
                      </View>
                    );
                  })}
                </Card>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      {item ? (
        <View
          style={[styles.actions, { paddingBottom: insets.bottom + mvs(18) }]}
        >
          {item.canSendBack === false ? null : (
            <CircleButton
              icon="undo"
              size={64}
              stroke={2.4}
              borderWidth={2}
              label="Send back"
              onPress={decide('back')}
            />
          )}
          {/* AIMS: still at the first sign-off, so it can be verified only */}
          {item.canVerify ? (
            <CircleButton
              icon="shield"
              size={64}
              stroke={2.4}
              borderWidth={2}
              label="Verify"
              onPress={decide('verify')}
            />
          ) : null}
          {item.canReject ? (
            <CircleButton
              icon="x"
              size={64}
              stroke={2.6}
              borderWidth={2}
              label="Reject"
              onPress={decide('reject')}
            />
          ) : null}
          {/* Sliding here is the confirmation: the sheet comes up only to
              show it being sent, or what went wrong */}
          <SlideToConfirm
            label={
              item.plainSlide
                ? 'Slide to approve'
                : `Slide to ${release ? 'release' : 'approve'} ${amount}`
            }
            tone="page"
            holdKey={sheet ? 1 : 0}
            busyLabel={release ? 'Releasing…' : 'Approving…'}
            onComplete={() => {
              decide('approve')();
              confirmSheet();
            }}
            style={styles.approve}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFill, backgroundColor: colors.white },
  grow: { flex: 1 },
  shrink: { flexShrink: 1 },
  pressed: { opacity: 0.85 },
  right: { alignItems: 'flex-end' },

  header: {
    overflow: 'hidden',
    backgroundColor: colors.teal,
    borderBottomLeftRadius: ms(42),
    borderBottomRightRadius: ms(42),
    paddingHorizontal: s(20),
    paddingBottom: ms(110),
    gap: mvs(14),
  },
  ringThick: { right: -s(44), top: ms(76) },
  ringThin: { right: -s(79), top: ms(41) },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  ref: { marginTop: mvs(8) },
  party: { maxWidth: s(300) },
  amount: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: s(12),
    marginTop: 4,
  },
  amountNote: { paddingBottom: ms(6) },

  waiting: { padding: s(20), gap: mvs(14) },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    paddingVertical: mvs(30),
  },

  docs: { marginTop: -ms(86), gap: mvs(10) },
  // Room for the cards' shadow inside the scroller
  docRow: { gap: s(12), paddingHorizontal: s(20), paddingBottom: ms(30) },
  doc: {
    width: s(148),
    borderRadius: ms(24),
    backgroundColor: colors.white,
    padding: ms(12),
    gap: mvs(8),
    boxShadow: shadows.doc,
  },
  noDocs: { marginLeft: s(20), marginBottom: ms(30), width: s(200) },
  preview: {
    height: ms(96),
    borderRadius: ms(14),
    padding: ms(12),
    gap: ms(6),
  },
  previewImage: {
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { height: ms(5), borderRadius: ms(3) },
  barHead: { height: ms(6), backgroundColor: colors.teal },
  stampMark: {
    marginTop: 'auto',
    alignSelf: 'flex-end',
    width: ms(36),
    height: ms(12),
    borderRadius: ms(4),
    backgroundColor: colors.yellow,
  },
  docNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(7),
    paddingHorizontal: s(20),
    marginTop: -ms(22),
  },
  fileError: { marginHorizontal: s(16) },

  sections: { paddingTop: mvs(22), paddingHorizontal: s(16), gap: mvs(14) },
  section: { gap: mvs(12) },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: s(10),
  },
  split: {
    flexDirection: 'row',
    height: ms(16),
    borderRadius: ms(8),
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  splitPaid: { backgroundColor: colors.teal },
  splitNow: { flex: 1, backgroundColor: colors.yellow },
  splitSide: { gap: 2 },
  key: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  swatch: { width: ms(10), height: ms(10), borderRadius: ms(3) },

  figuresHead: { marginBottom: 4 },
  figure: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: s(12),
    paddingVertical: ms(10),
    borderBottomWidth: hairline,
    borderStyle: 'dashed',
    borderBottomColor: colors.line,
  },
  figureLast: { borderBottomWidth: 0, paddingBottom: 2 },
  figureValue: { flexShrink: 1 },

  note: {
    backgroundColor: colors.yellowSoft,
    borderRadius: ms(28),
    borderBottomLeftRadius: ms(8),
    padding: s(18),
    gap: mvs(8),
  },

  activityHead: { marginBottom: mvs(14) },
  event: { flexDirection: 'row', gap: s(12) },
  rail: { alignItems: 'center' },
  eventMark: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventOld: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.teal,
  },
  eventDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: colors.teal,
  },
  eventLine: { flex: 1, width: 2, backgroundColor: colors.line },
  eventCopy: { flex: 1, gap: 3, paddingTop: 4, paddingBottom: mvs(18) },
  eventLast: { paddingBottom: 0 },

  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    backgroundColor: colors.white,
    borderTopLeftRadius: ms(30),
    borderTopRightRadius: ms(30),
    paddingTop: ms(14),
    paddingHorizontal: s(16),
    boxShadow: shadows.bar,
  },
  approve: { flex: 1, alignSelf: 'center' },
});
