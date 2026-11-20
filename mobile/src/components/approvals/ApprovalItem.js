import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, mvs, s } from '../../theme';
import { AppText, Button, Card, Pill } from '../common';

/* One item waiting for a decision, with Send back and Approve.
   `onReject` adds the Reject link (only some stages allow it);
   `onDetails` adds the link to the full details and attached documents. */
export default function ApprovalItem({
  item,
  onApprove,
  onSendBack,
  onReject,
  onDetails,
}) {
  return (
    <Card borderColor={colors.brand} style={styles.card}>
      <View style={styles.row}>
        <AppText size={13} weight={700} color={colors.link}>
          {item.id}
        </AppText>
        <AppText
          size={12.5}
          weight={item.overdue ? 700 : 400}
          color={item.overdue ? colors.bad : colors.muted}
        >
          {item.due}
        </AppText>
      </View>
      {item.note ? (
        <AppText
          size={12.5}
          weight={600}
          color={colors.note}
          style={styles.note}
        >
          {item.note}
        </AppText>
      ) : null}
      <AppText display size={18}>
        {item.party}
      </AppText>

      {item.balance ? (
        <View style={[styles.row, styles.bottom]}>
          <AppText display size={20} color={colors.muted}>
            {item.amount}
          </AppText>
          <View style={styles.balance}>
            <AppText size={11} weight={700} spacing={1} color={colors.muted}>
              BALANCE
            </AppText>
            <AppText display size={28} color={colors.brandDark}>
              {item.balance}
            </AppText>
          </View>
        </View>
      ) : (
        <View style={[styles.row, styles.bottom]}>
          <AppText display size={28}>
            {item.amount}
          </AppText>
          <View style={styles.tags}>
            {item.tags.map(tag => (
              <Pill key={tag} shape="tag" label={tag} />
            ))}
          </View>
        </View>
      )}

      {item.auto ? (
        <View style={styles.auto}>
          <AppText size={13} weight={500} color={colors.okTintText}>
            {item.auto}
          </AppText>
        </View>
      ) : null}

      {onDetails ? (
        <AppText
          size={13}
          weight={600}
          color={colors.link}
          underline
          accessibilityRole="button"
          onPress={onDetails}
          suppressHighlighting
        >
          Details and documents
        </AppText>
      ) : null}

      <View style={styles.buttons}>
        <Button
          variant="dangerOutline"
          label="Send back"
          onPress={onSendBack}
          style={styles.sendBack}
        />
        <Button
          variant="approve"
          label={item.approve}
          onPress={onApprove}
          style={styles.approve}
        />
      </View>
      {onReject ? (
        <AppText
          size={13}
          weight={600}
          color={colors.bad}
          align="center"
          underline
          accessibilityRole="button"
          onPress={onReject}
          suppressHighlighting
          style={styles.reject}
        >
          Reject and return to Registered
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: ms(16), gap: mvs(10) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  bottom: { alignItems: 'flex-end' },
  note: { marginTop: -mvs(6) },
  balance: { alignItems: 'flex-end' },
  tags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: ms(6),
    paddingBottom: ms(4),
  },
  auto: {
    backgroundColor: colors.okTint,
    borderRadius: ms(8),
    paddingVertical: mvs(8),
    paddingHorizontal: s(12),
  },
  buttons: { flexDirection: 'row', gap: s(10), marginTop: mvs(4) },
  sendBack: { flex: 1 },
  approve: { flex: 1.4 },
  reject: { paddingVertical: mvs(6) },
});
