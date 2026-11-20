import { createSlice } from '@reduxjs/toolkit'
import { sessionCleared } from './authSlice.js'

/* The hub's own state — everything that is not data from the server.
   (What is waiting, and the history, live in the RTK Query cache: see api.js.)

     settings    alert switches the CMD can change
     detail      the item whose details are open: { swId, stage, id }
     sheet       the open confirm sheet: { type, swId, stage, id }
     toast       the success message after a decision: { swId, text }
     banner      the new-approval snackbar: { mono, title, sub, swId }
     remindOpen  the full-screen reminder is showing
     push        browser notifications: see PUSH in lib/push.js */

export const SETTINGS_KEY = 'cmd-hub-web-settings'

function readSettings() {
  const settings = { sound: true, hourly: true }
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'))
  } catch {
    /* storage unavailable: defaults */
  }
  return settings
}

const overlays = {
  detail: null,
  sheet: null,
  sheetBusy: false,
  sheetError: null,
  toast: null,
  banner: null,
  remindOpen: false,
}

const hubSlice = createSlice({
  name: 'hub',
  initialState: () => ({
    settings: readSettings(),
    push: 'off',
    ...overlays,
  }),
  reducers: {
    detailOpened(state, action) {
      state.detail = action.payload
    },
    detailClosed(state) {
      state.detail = null
    },
    sheetOpened(state, action) {
      state.sheet = action.payload
      state.sheetError = null
    },
    sheetClosed(state) {
      state.sheet = null
      state.sheetError = null
    },
    sheetBusySet(state, action) {
      state.sheetBusy = action.payload
    },
    sheetErrorSet(state, action) {
      state.sheetError = action.payload
    },
    toastSet(state, action) {
      state.toast = action.payload
    },
    toastCleared(state) {
      state.toast = null
    },
    bannerSet(state, action) {
      state.banner = action.payload
    },
    bannerCleared(state) {
      state.banner = null
    },
    // The reminder takes over the screen: anything else that was open goes
    reminderOpened(state) {
      state.remindOpen = true
      state.detail = null
      state.sheet = null
      state.sheetError = null
      state.banner = null
    },
    reminderClosed(state) {
      state.remindOpen = false
    },
    settingToggled(state, action) {
      state.settings[action.payload] = !state.settings[action.payload]
    },
    pushSet(state, action) {
      state.push = action.payload
    },
  },
  extraReducers: (builder) => {
    // Signed out: nothing of the last session stays on screen
    builder.addCase(sessionCleared, (state) => ({
      ...state,
      ...overlays,
      push: 'off',
    }))
  },
})

export const {
  detailOpened,
  detailClosed,
  sheetOpened,
  sheetClosed,
  sheetBusySet,
  sheetErrorSet,
  toastSet,
  toastCleared,
  bannerSet,
  bannerCleared,
  reminderOpened,
  reminderClosed,
  settingToggled,
  pushSet,
} = hubSlice.actions
export default hubSlice.reducer
