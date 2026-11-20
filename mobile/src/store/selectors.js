import { REGISTRY } from '../data/registry';

/* Read-only views over the live data in the store.
   `store.live[swId]` is { loaded, error, stages: { [key]: { count, items } } }.
   A count is `null` until the software's data has arrived, so the screens can
   show "—" instead of a misleading 0. */

const liveOf = (store, sw) => (store.live || {})[sw.id];

const stageData = (store, sw, key) => {
  const live = liveOf(store, sw);
  return live && live.stages ? live.stages[key] : null;
};

export const isLoaded = (store, sw) => !!(liveOf(store, sw) || {}).loaded;
// When the list on screen was fetched (ms since 1970), or null
export const loadedAt = (store, sw) => (liveOf(store, sw) || {}).at || null;
export const loadError = (store, sw) => (liveOf(store, sw) || {}).error || null;

export const stageCount = (store, sw, st) => {
  if (!isLoaded(store, sw)) return null;
  const data = stageData(store, sw, st.key);
  return data ? data.count : 0;
};

export const visibleItems = (store, sw, st) => {
  const data = stageData(store, sw, st.key);
  return data ? data.items : [];
};

export const swPending = (store, sw) =>
  isLoaded(store, sw)
    ? sw.stages.reduce((n, st) => n + (stageCount(store, sw, st) || 0), 0)
    : null;

export const totalPending = store =>
  REGISTRY.filter(s => s.connected).reduce(
    (n, sw) => n + (swPending(store, sw) || 0),
    0,
  );

/* How many notifications are unread, in the whole list (the server counts) */
export const unseenNotifications = store => store.unread || 0;

export const defaultStage = (store, sw) =>
  (sw.stages.find(s => (stageCount(store, sw, s) || 0) > 0) || sw.stages[0])
    .key;

/* ---- with what was just decided taken out ----
   `gone` (hubSlice.js) lists items decided a moment ago; until the list has
   refreshed they are hidden by hand, so a decided card never comes back. */

export const waitingItems = (store, sw, st, gone) =>
  visibleItems(store, sw, st).filter(
    item =>
      !gone.some(
        g => g.id === item.id && g.swId === sw.id && g.stage === st.key,
      ),
  );

export const waitingCount = (store, sw, st, gone) => {
  const count = stageCount(store, sw, st);
  if (count === null) return null;
  const hidden =
    visibleItems(store, sw, st).length -
    waitingItems(store, sw, st, gone).length;
  return Math.max(count - hidden, 0);
};
