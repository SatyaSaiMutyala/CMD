import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ApprovalItem, StageTabs } from '../components/approvals';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Notice,
  ScreenHeader,
  Screen,
} from '../components/common';
import { findSoftware } from '../data/registry';
import { useHub } from '../store/HubProvider';
import {
  defaultStage,
  isLoaded,
  loadError,
  stageCount,
  visibleItems,
} from '../store/selectors';
import { colors, gutter, hairline, ms, mvs, s } from '../theme';

/* Shown for software whose approvals are not shared with the hub yet */
function NotConnected({ sw, onHome }) {
  return (
    <>
      <EmptyState
        dashed
        title="Approval page not connected yet"
        text={`Once ${sw.name} shares its CMD-level approvals, they show up here the same way LedgerTrace's do: one tab per stage, each item with Approve and Send back.`}
        style={styles.notConnected}
      />
      <Eyebrow style={styles.eyebrow}>PLANNED APPROVALS</Eyebrow>
      <Card style={styles.plan}>
        {sw.planned.map((line, i) => (
          <View key={line} style={[styles.planRow, i ? styles.planLine : null]}>
            <AppText size={14.5}>{line}</AppText>
          </View>
        ))}
      </Card>
      <Button
        label="Back to all software"
        height={52}
        radius={14}
        onPress={onHome}
        style={styles.cta}
      />
    </>
  );
}

/* The items of one stage, or the right empty message */
function StageBody({ sw, stage, onSheet, onDetails }) {
  const { store, reload } = useHub();
  const error = loadError(store, sw);

  if (!isLoaded(store, sw)) {
    return error ? (
      <>
        <EmptyState title={`Could not load ${sw.name}`} text={error} />
        <Button
          label="Try again"
          height={52}
          radius={14}
          onPress={() => reload(sw.id)}
          style={styles.cta}
        />
      </>
    ) : (
      <EmptyState
        title="Loading…"
        text={`Getting what is waiting for you in ${sw.name}.`}
      />
    );
  }

  const count = stageCount(store, sw, stage);
  if (count === 0) {
    return (
      <EmptyState
        title={stage.done}
        text="Nothing is waiting for your decision in this stage."
      />
    );
  }
  const items = visibleItems(store, sw, stage);
  return (
    <View style={styles.list}>
      {error ? (
        <AppText
          size={13}
          color={colors.bad}
          accessibilityRole="button"
          onPress={() => reload(sw.id)}
          suppressHighlighting
        >
          Could not refresh — showing the last list. Tap to try again.
        </AppText>
      ) : null}
      {stage.bulk && count > 1 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSheet('bulk')}
          style={styles.bulk}
        >
          <AppText size={14} weight={600} align="center">
            {stage.bulk.replace('{n}', count)}
          </AppText>
        </Pressable>
      ) : null}
      {items.map(item => (
        <ApprovalItem
          key={item.id}
          item={item}
          onApprove={() => onSheet('approve', item.id)}
          onSendBack={() => onSheet('back', item.id)}
          onDetails={() => onDetails(item.id)}
          onReject={
            item.canReject ? () => onSheet('reject', item.id) : undefined
          }
        />
      ))}
      {count > items.length ? (
        <AppText
          size={13}
          color={colors.muted}
          align="center"
          style={styles.more}
        >
          + {count - items.length} more in this stage
        </AppText>
      ) : null}
    </View>
  );
}

/* One software: stage tabs and the approvals waiting in the chosen stage */
export default function SoftwareScreen({ route, navigation }) {
  const sw = findSoftware(route.params.swId);
  const { store, toast, openSheet, openDetail, clearToast, reload } =
    useHub();
  // Until a tab is picked, show the first stage that has something pending
  const [picked, setPicked] = useState(null);
  const stageKey =
    picked || (sw.connected ? defaultStage(store, sw) : null);

  // Fresh data on every visit; the confirmation strip belongs to this visit only
  useFocusEffect(
    useCallback(() => {
      reload(sw.id);
      return clearToast;
    }, [reload, clearToast, sw.id]),
  );

  const goHome = () => navigation.goBack();
  const header = (
    <ScreenHeader
      onBack={goHome}
      mono={sw.mono}
      title={sw.name}
      sub={sw.sub}
    />
  );

  if (!sw.connected) {
    return (
      <Screen>
        {header}
        <NotConnected sw={sw} onHome={goHome} />
      </Screen>
    );
  }

  const stage = sw.stages.find(x => x.key === stageKey) || sw.stages[0];
  const tabs = sw.stages.map(st => ({
    key: st.key,
    label: st.short,
    count: stageCount(store, sw, st),
  }));

  return (
    <Screen>
      {header}
      <StageTabs
        tabs={tabs}
        current={stage.key}
        onSelect={key => {
          setPicked(key);
          clearToast();
        }}
      />
      {toast && toast.swId === sw.id ? <Notice text={toast.text} /> : null}
      <StageBody
        sw={sw}
        stage={stage}
        onSheet={(type, id) => openSheet(type, sw.id, stage.key, id)}
        onDetails={id => openDetail(sw.id, stage.key, id)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notConnected: { marginTop: mvs(24) },
  eyebrow: {
    marginTop: mvs(20),
    marginHorizontal: gutter,
    marginBottom: mvs(10),
  },
  plan: { marginHorizontal: gutter },
  planRow: { paddingVertical: mvs(14), paddingHorizontal: s(16) },
  planLine: { borderTopWidth: 1, borderTopColor: colors.line2 },
  cta: { marginHorizontal: gutter, marginTop: mvs(22) },
  list: { paddingHorizontal: gutter, gap: mvs(14) },
  bulk: {
    minHeight: ms(44),
    justifyContent: 'center',
    padding: ms(13),
    backgroundColor: colors.pressed,
    borderWidth: hairline,
    borderStyle: 'dashed',
    borderColor: colors.bulkLine,
    borderRadius: ms(12),
  },
  more: { paddingTop: mvs(4), paddingBottom: mvs(8) },
});
