import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useGetContentsQuery } from '../../store/api';
import { colors, hairline, ms, mvs, s } from '../../theme';
import { AppText, Eyebrow } from '../common';
import { Icon } from '../icons';

/* What is inside a zip, read where it is stored — the archive itself is never
   downloaded — the way Trust Prism's own zip browser lists it. Tapping a
   picture, a PDF or a text file opens it; anything else is saved. Password-
   protected entries are listed but cannot be opened.

   `onOpen(entryDocId)` opens one entry like any other document. */

// How many rows are drawn; a kit can hold thousands of files
const SHOWN = 80;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// The path as URL-safe base64 of its UTF-8 bytes (no padding)
function pathCode(path) {
  const bytes = [];
  const escaped = encodeURIComponent(path);
  for (let i = 0; i < escaped.length; i += 1) {
    if (escaped[i] === '%') {
      bytes.push(parseInt(escaped.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(escaped.charCodeAt(i));
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | ((b || 0) >> 4)];
    if (b !== undefined) out += B64[((b & 15) << 2) | ((c || 0) >> 6)];
    if (c !== undefined) out += B64[c & 63];
  }
  return out;
}

/** "zip~master~<code>" — how one file inside a zip is asked for */
export const zipEntryId = (docId, path) => `zip~${docId}~${pathCode(path)}`;

export default function ZipList({ swId, id, docId, opening, onOpen }) {
  const { data, error, isFetching } = useGetContentsQuery({ swId, id, docId });

  let body;
  if (isFetching && !data) {
    body = (
      <AppText size={12.5} color={colors.muted}>
        Reading the archive…
      </AppText>
    );
  } else if (error || !data) {
    body = (
      <AppText size={12.5} color={colors.muted}>
        {(error && error.message) || 'Could not read this zip.'}
      </AppText>
    );
  } else if (!data.entries.length) {
    body = (
      <AppText size={12.5} color={colors.muted}>
        This zip is empty.
      </AppText>
    );
  } else {
    const entries = data.entries;
    body = (
      <>
        {entries.slice(0, SHOWN).map((entry, i) => {
          const cut = entry.name.lastIndexOf('/');
          const eid = zipEntryId(docId, entry.name);
          const busy = opening === eid;
          return (
            <Pressable
              key={entry.name}
              accessibilityRole="button"
              accessibilityLabel={
                entry.encrypted
                  ? `${entry.name}, password-protected`
                  : `${entry.opens ? 'Open' : 'Save'} ${entry.name}`
              }
              disabled={entry.encrypted || !!opening}
              onPress={() => onOpen(eid)}
              style={({ pressed }) => [
                styles.row,
                i ? styles.rowLine : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.grow}>
                {cut >= 0 ? (
                  <AppText size={11} color={colors.muted} numberOfLines={1}>
                    {entry.name.slice(0, cut + 1)}
                  </AppText>
                ) : null}
                <AppText size={13} weight={700} numberOfLines={2}>
                  {entry.name.slice(cut + 1)}
                </AppText>
              </View>
              <AppText size={11.5} color={colors.muted}>
                {busy ? 'Opening…' : entry.size_text}
              </AppText>
              <Icon
                name={
                  entry.encrypted ? 'lock' : entry.opens ? 'eye' : 'arrowRight'
                }
                size={15}
                stroke={2.2}
                color={entry.encrypted ? colors.muted : colors.teal}
              />
            </Pressable>
          );
        })}
        {entries.length > SHOWN || data.truncated ? (
          <AppText size={11.5} color={colors.muted} style={styles.more}>
            Showing the first {Math.min(entries.length, SHOWN)} of{' '}
            {data.count || entries.length} files.
          </AppText>
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.box}>
      <Eyebrow size={11} track={0.07}>
        INSIDE THIS ZIP
        {data && data.entries.length ? ` · ${data.entries.length} FILES` : ''}
      </Eyebrow>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: s(16),
    marginTop: mvs(10),
    padding: ms(14),
    gap: mvs(8),
    borderRadius: ms(18),
    borderWidth: hairline,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: mvs(7),
  },
  rowLine: { borderTopWidth: hairline, borderTopColor: colors.line },
  grow: { flex: 1 },
  pressed: { opacity: 0.6 },
  more: { paddingTop: mvs(4) },
});
