import React, { useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { findSoftware } from '../../data/registry';
import { useCreateFileLinkMutation, useGetItemQuery } from '../../store/api';
import { useHub } from '../../store/HubProvider';
import { colors, hairline, ms, mvs, s } from '../../theme';
import { AppText, Button, Card, Eyebrow } from '../common';

/* One approval in full: the figures behind it, the note from the desk that
   raised it, the attached documents (each opens in the phone's browser) and
   the latest activity. Approve and Send back are here too, so the CMD can
   read the paperwork and decide without going back to the list. */
export default function DetailsModal() {
  const { detail, closeDetail, openSheet } = useHub();
  const insets = useSafeAreaInsets();
  const open = !!detail;
  const { data, error, isFetching, refetch } = useGetItemQuery(
    detail ? { swId: detail.swId, id: detail.id } : undefined,
    { skip: !open },
  );
  const [createFileLink] = useCreateFileLinkMutation();
  const [opening, setOpening] = useState(null); // id of the document being opened
  const [fileError, setFileError] = useState(null);

  const sw = detail ? findSoftware(detail.swId) : null;
  const stage =
    sw && sw.stages ? sw.stages.find(x => x.key === detail.stage) : null;
  // At the release stage the forward action is releasing the payment
  const approveLabel =
    stage && stage.key === 'rel' ? 'Release payment' : 'Approve';

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

  const decide = type => {
    const { swId, stage: stageKey, id } = detail;
    closeDetail();
    openSheet(type, swId, stageKey, id);
  };

  const close = () => {
    setFileError(null);
    closeDetail();
  };

  let body;
  if (!data && isFetching) {
    body = (
      <AppText size={14.5} color={colors.muted}>
        Loading the details…
      </AppText>
    );
  } else if (!data) {
    body = (
      <>
        <ErrorLine
          text={(error && error.message) || 'Could not load the details.'}
        />
        <Button variant="ghost" label="Try again" onPress={refetch} />
      </>
    );
  } else {
    body = (
      <>
        <Card style={styles.card}>
          {data.facts.map(([label, value], i) => (
            <View key={label} style={[styles.fact, i ? styles.line : null]}>
              <AppText size={13.5} color={colors.muted}>
                {label}
              </AppText>
              <AppText
                size={13.5}
                weight={700}
                align="right"
                style={styles.factValue}
              >
                {value}
              </AppText>
            </View>
          ))}
        </Card>

        {data.notes ? (
          <>
            <Eyebrow style={styles.eyebrow}>NOTE</Eyebrow>
            <Card style={styles.pad}>
              <AppText size={14} lh={1.5}>
                {data.notes}
              </AppText>
            </Card>
          </>
        ) : null}

        <Eyebrow style={styles.eyebrow}>DOCUMENTS</Eyebrow>
        {data.documents.length ? (
          <Card style={styles.card}>
            {data.documents.map((doc, i) => (
              <View key={doc.id} style={[styles.doc, i ? styles.line : null]}>
                <View style={styles.docCopy}>
                  <AppText size={14} weight={600} numberOfLines={2}>
                    {doc.name}
                  </AppText>
                  <AppText size={12} color={colors.muted}>
                    {[doc.group, doc.size, doc.source]
                      .filter(Boolean)
                      .join(' · ')}
                  </AppText>
                </View>
                <Button
                  size="mini"
                  variant="ghost"
                  label={opening === doc.id ? 'Opening…' : 'Open'}
                  disabled={!!opening}
                  onPress={() => openDocument(doc)}
                />
              </View>
            ))}
          </Card>
        ) : (
          <AppText size={13.5} color={colors.muted}>
            No documents are attached to this item.
          </AppText>
        )}
        {data.documentsNote ? (
          <AppText size={12.5} lh={1.5} color={colors.muted}>
            {data.documentsNote}
          </AppText>
        ) : null}
        {fileError ? <ErrorLine text={fileError} /> : null}

        {data.activity.length ? (
          <>
            <Eyebrow style={styles.eyebrow}>RECENT ACTIVITY</Eyebrow>
            <Card style={styles.card}>
              {data.activity.map((a, i) => (
                <View
                  key={`${a.at}-${i}`}
                  style={[styles.activity, i ? styles.line : null]}
                >
                  <AppText size={13.5} lh={1.45}>
                    {a.msg}
                  </AppText>
                  <AppText size={12} color={colors.muted}>
                    {[a.who, a.at].filter(Boolean).join(' · ')}
                  </AppText>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </>
    );
  }

  return (
    <Modal
      visible={open}
      animationType="slide"
      onRequestClose={close}
      presentationStyle="pageSheet"
    >
      <View style={styles.screen}>
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={styles.content}
        >
          <View style={styles.head}>
            <View style={styles.headCopy}>
              <AppText size={13} weight={700} color={colors.link}>
                {detail ? detail.id : ''}
                {sw ? ` · ${sw.name}` : ''}
              </AppText>
              <AppText display size={22} lh={1.2} accessibilityRole="header">
                {data ? data.party : 'Details'}
              </AppText>
            </View>
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
          {body}
        </ScrollView>

        {data ? (
          <View
            style={[styles.actions, { paddingBottom: mvs(14) + insets.bottom }]}
          >
            <Button
              variant="dangerOutline"
              label="Send back"
              onPress={() => decide('back')}
              style={styles.sendBack}
            />
            <Button
              variant="approve"
              label={approveLabel}
              onPress={() => decide('approve')}
              style={styles.approve}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function ErrorLine({ text }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <AppText size={13.5} weight={500} color={colors.badTintText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { padding: s(20), paddingTop: mvs(24), gap: mvs(12) },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: s(12),
    marginBottom: mvs(4),
  },
  headCopy: { flex: 1, gap: mvs(4) },
  eyebrow: { marginTop: mvs(8) },
  card: { paddingHorizontal: s(14) },
  pad: { padding: ms(14) },
  line: { borderTopWidth: 1, borderTopColor: colors.line2 },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: s(12),
    paddingVertical: mvs(10),
  },
  factValue: { flex: 1 },
  doc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: mvs(10),
  },
  docCopy: { flex: 1, gap: mvs(2) },
  activity: { paddingVertical: mvs(10), gap: mvs(2) },
  error: {
    backgroundColor: colors.badTint,
    borderRadius: ms(10),
    paddingVertical: mvs(10),
    paddingHorizontal: s(12),
  },
  actions: {
    flexDirection: 'row',
    gap: s(10),
    paddingTop: mvs(12),
    paddingHorizontal: s(20),
    backgroundColor: colors.white,
    borderTopWidth: hairline,
    borderTopColor: colors.line,
  },
  sendBack: { flex: 1 },
  approve: { flex: 1.4 },
});
