import { createSlice } from '@reduxjs/toolkit';

/* The connection, as the pop-up shows it.
     status  'online'       all good: no pop-up
             'offline'      the phone has no Wi-Fi or mobile data
             'unreachable'  the phone is online but the hub does not answer
             'slow'         the hub answers, slowly
     hidden  the CMD closed the pop-up; it stays closed until the status
             changes again                                                   */
const netSlice = createSlice({
  name: 'net',
  initialState: { status: 'online', hidden: false },
  reducers: {
    netStatusSet(state, action) {
      if (state.status === action.payload) return;
      state.status = action.payload;
      state.hidden = false;
    },
    netPopupHidden(state) {
      state.hidden = true;
    },
  },
});

export const { netStatusSet, netPopupHidden } = netSlice.actions;
export default netSlice.reducer;
