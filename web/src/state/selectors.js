import { REGISTRY } from '../data/registry.js'

/* Read-only views over the live data in the store.
   `store.live[swId]` is { loaded, error, stages: { [key]: { count, items } } }.
   A count is `null` until the software's data has arrived, so the screens can
   show "—" instead of a misleading 0. */

const liveOf = (store, sw) => (store.live || {})[sw.id]

const stageData = (store, sw, key) => {
  const live = liveOf(store, sw)
  return live && live.stages ? live.stages[key] : null
}

export const isLoaded = (store, sw) => !!(liveOf(store, sw) || {}).loaded
export const loadError = (store, sw) => (liveOf(store, sw) || {}).error || null

export const stageCount = (store, sw, st) => {
  if (!isLoaded(store, sw)) return null
  const data = stageData(store, sw, st.key)
  return data ? data.count : 0
}

// "₹4,52,100" — what the stage's items add up to, where the source says
export const stageValue = (store, sw, st) => {
  const data = stageData(store, sw, st.key)
  return data ? data.valueText : ''
}

export const visibleItems = (store, sw, st) => {
  const data = stageData(store, sw, st.key)
  return data ? data.items : []
}

export const swPending = (store, sw) =>
  isLoaded(store, sw)
    ? sw.stages.reduce((n, st) => n + (stageCount(store, sw, st) || 0), 0)
    : null

export const totalPending = store =>
  REGISTRY.filter(s => s.connected).reduce(
    (n, sw) => n + (swPending(store, sw) || 0),
    0,
  )

export const defaultStage = (store, sw) =>
  (sw.stages.find(s => (stageCount(store, sw, s) || 0) > 0) || sw.stages[0])
    .key
