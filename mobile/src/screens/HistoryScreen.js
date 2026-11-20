import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HistoryRow } from '../components/approvals';
import {
  EmptyState,
  ScreenHeader,
  Screen,
} from '../components/common';
import { useHub } from '../store/HubProvider';
import { gutter, mvs } from '../theme';

/* Decisions made so far, newest first */
export default function HistoryScreen() {
  const { store } = useHub();
  const { history } = store;

  return (
    <Screen>
      <ScreenHeader title="History" sub="Your decisions, newest first" />
      {history.length ? (
        <View style={styles.list}>
          {history.map(entry => (
            <HistoryRow
              key={`${entry.ts}-${entry.id}-${entry.verb}`}
              entry={entry}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title="No decisions yet"
          text="Approvals and send-backs you make appear here."
          style={styles.empty}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: mvs(14),
    paddingHorizontal: gutter,
    paddingTop: mvs(16),
    paddingBottom: mvs(24),
  },
  empty: { marginTop: mvs(20) },
});
