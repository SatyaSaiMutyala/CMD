/* Colour tokens of the Approval Hub design: teal, yellow and their soft tints
   on white. Nothing else is used anywhere in the app. */
export const colors = {
  teal: '#27B198', // brand: headers, selected states, primary buttons
  tealLight: '#5CC6B2', // tracks drawn on teal
  ink: '#053A32', // every text and icon on a light surface
  muted: '#3D6B63', // secondary text
  placeholder: '#8FB5AD', // the hint inside an empty field: clearly not typed text

  yellow: '#FFED00', // the action colour: approve, counts, highlights
  yellowMid: '#FFF7A1',
  yellowSoft: '#FFF9C4', // tinted surfaces and tags

  mint: '#EAF8F5', // quiet surfaces
  mintMid: '#BFEBE2',
  line: '#D9EFEA', // borders

  white: '#FFFFFF',
  scrim: 'rgba(39,177,152,0.38)', // behind a sheet

  // Older names, still used by the app shell
  brand: '#27B198',
  ground: '#FFFFFF',
};

/* Shadows, exactly as drawn (CSS box-shadow; React Native draws these on both
   platforms). */
export const shadows = {
  hero: '0px 24px 50px rgba(39,177,152,0.3)',
  deck: '0px 26px 50px rgba(39,177,152,0.25)',
  card: '0px 14px 30px rgba(39,177,152,0.12)',
  row: '0px 10px 24px rgba(39,177,152,0.1)',
  doc: '0px 18px 36px rgba(39,177,152,0.25)',
  tabBar: '0px 18px 40px rgba(39,177,152,0.25)',
  sheet: '0px -20px 50px rgba(39,177,152,0.25)',
  bar: '0px -14px 34px rgba(39,177,152,0.16)',
  banner: '0px 22px 44px rgba(39,177,152,0.45)',
  knob: '0px 6px 14px rgba(39,177,152,0.35)',
  stamp: '0px 10px 24px rgba(39,177,152,0.3)',
  soft: '0px 8px 18px rgba(39,177,152,0.15)',
  yellow: '0px 12px 26px rgba(255,237,0,0.55)',
  yellowSoft: '0px 12px 26px rgba(255,237,0,0.45)',
  ink: '0px 10px 22px rgba(5,58,50,0.14)',
  inkCard: '0px 24px 44px rgba(5,58,50,0.16)',
  tealButton: '0px 14px 28px rgba(39,177,152,0.4)',
  reminderCard: '0px 24px 44px rgba(39,177,152,0.22)',
};
