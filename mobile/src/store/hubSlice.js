import { createSlice } from '@reduxjs/toolkit';
import { api } from './api';
import { sessionCleared } from './authSlice';

/* The hub's own state — everything that is not data from the server.
   (What is waiting, and the history, live in the RTK Query cache: see api.js.)

     settings    alert switches the CMD can change
     detail      the item whose details are open: { swId, stage, id }
     sheet       the open confirm sheet:
                   { type, swId, stage, id, item, count, from }
                 `item` is a copy of the item taken when the sheet opened, so
                 the sheet can still name it after it has left the list
     sheetDone   the sheet's "Approved" view: { title, text }
     toast       the strip after a decision: { swId, tone, text, bold }
     banner      the new-approval banner: { mono, title, sub, swId }
     remindOpen  the full-screen reminder is showing
     push        phone notifications: 'on' | 'off' | 'blocked'
     gone        items just decided, hidden at once instead of waiting for the
                 list to refresh: [{ swId, stage, id, at }]
     decided     how many were decided this visit, per "swId:stage" — the
                 swipe review counts its progress with it                    */

const overlays = {
  detail: null,
  sheet: null,
  sheetBusy: false,
  sheetError: null,
  sheetDone: null,
  toast: null,
  banner: null,
  remindOpen: false,
  gone: [],
  decided: {},
};

const hubSlice = createSlice({
  name: 'hub',
  initialState: {
    settings: { sound: true, hourly: true },
    push: 'off',
    ...overlays,
  },
  reducers: {
    detailOpened(state, action) {
      state.detail = action.payload;
    },
    detailClosed(state) {
      state.detail = null;
    },
    sheetOpened(state, action) {
      state.sheet = action.payload;
      state.sheetError = null;
      state.sheetDone = null;
    },
    sheetClosed(state) {
      state.sheet = null;
      state.sheetError = null;
      state.sheetDone = null;
    },
    sheetBusySet(state, action) {
      state.sheetBusy = action.payload;
    },
    sheetErrorSet(state, action) {
      state.sheetError = action.payload;
    },
    sheetDoneSet(state, action) {
      state.sheetDone = action.payload;
    },
    toastSet(state, action) {
      state.toast = action.payload;
    },
    toastCleared(state) {
      state.toast = null;
    },
    bannerSet(state, action) {
      state.banner = action.payload;
    },
    bannerCleared(state) {
      state.banner = null;
    },
    // { swId, stage, ids, at, counts }: `counts` = they were decided one by
    // one in the review (a refusal hides the item without counting it)
    goneAdded(state, action) {
      const { swId, stage, ids, at, counts } = action.payload;
      ids.forEach(id => state.gone.push({ swId, stage, id, at }));
      if (counts) {
        const key = `${swId}:${stage}`;
        state.decided[key] = (state.decided[key] || 0) + ids.length;
      }
    },
    // A software's page was opened: its progress starts from nothing
    visitStarted(state, action) {
      const swId = action.payload;
      state.gone = state.gone.filter(g => g.swId !== swId);
      Object.keys(state.decided).forEach(key => {
        if (key.startsWith(`${swId}:`)) delete state.decided[key];
      });
    },
    // The reminder takes over the screen: anything else that was open goes
    reminderOpened(state) {
      state.remindOpen = true;
      state.detail = null;
      state.sheet = null;
      state.sheetError = null;
      state.sheetDone = null;
      state.banner = null;
    },
    reminderClosed(state) {
      state.remindOpen = false;
    },
    // The switches as they were left last time (read from the phone on start)
    settingsLoaded(state, action) {
      state.settings = { ...state.settings, ...action.payload };
    },
    settingToggled(state, action) {
      state.settings[action.payload] = !state.settings[action.payload];
    },
    pushSet(state, action) {
      state.push = action.payload;
    },
  },
  extraReducers: builder => {
    // Signed out: nothing of the last session stays on screen
    builder.addCase(sessionCleared, state => ({
      ...state,
      ...overlays,
      push: 'off',
    }));
    // A fresh list has arrived: it no longer holds what was decided before it
    // was asked for, so those need not be hidden by hand any more
    builder.addMatcher(
      api.endpoints.getPending.matchFulfilled,
      (state, action) => {
        const swId = action.meta.arg.originalArgs;
        const asked = action.meta.startedTimeStamp;
        state.gone = state.gone.filter(
          g => g.swId !== swId || (asked != null && g.at > asked),
        );
      },
    );
  },
});

export const {
  detailOpened,
  detailClosed,
  sheetOpened,
  sheetClosed,
  sheetBusySet,
  sheetErrorSet,
  sheetDoneSet,
  toastSet,
  toastCleared,
  bannerSet,
  bannerCleared,
  goneAdded,
  visitStarted,
  reminderOpened,
  reminderClosed,
  settingsLoaded,
  settingToggled,
  pushSet,
} = hubSlice.actions;
export default hubSlice.reducer;
