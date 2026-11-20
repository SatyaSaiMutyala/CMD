// The floating tab bar: its height, its gap from the bottom of the screen, and
// the room a page leaves under its content so nothing hides behind the bar
// (all before the device's bottom inset is added)
export const TAB_BAR_HEIGHT = 70;
export const TAB_BAR_BOTTOM = 22;
export const TAB_BAR_SPACE = 120;

export const ROUTES = {
  // bottom tabs
  approvals: 'Approvals',
  history: 'History',
  alerts: 'Alerts',
  // Android's "full-screen reminder" setup: reached from Alerts, not a tab
  reminderSetup: 'ReminderSetup',
  // inside the Approvals tab
  home: 'Home',
  notifications: 'Notifications', // what the hub announced
  software: 'Software', // params: { swId, view: 'list' | 'cards' }
};
