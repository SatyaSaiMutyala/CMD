import { Platform } from 'react-native';

/* Font files live in src/assets/fonts and are linked into both native projects
   (re-run `npx react-native-asset` after adding one, then rebuild the app:
   a reload does not bring a new font in). Each weight is its own family name.
   Use fontStyle() below rather than writing `fontWeight` yourself. */

const inter = {
  400: 'Inter-Regular',
  500: 'Inter-Medium',
  600: 'Inter-SemiBold',
  700: 'Inter-Bold',
  800: 'Inter-ExtraBold',
};

const bricolage = {
  700: 'BricolageGrotesque-Bold',
  800: 'BricolageGrotesque-ExtraBold',
};

// display = Bricolage Grotesque (titles, amounts, counts); otherwise Inter
export const fontFor = (display, weight) =>
  display ? bricolage[weight] || bricolage[800] : inter[weight] || inter[400];

/* The style for a piece of text: { fontFamily } — plus, on iPhone, the weight
   as well, so a title still comes out bold if its font file is ever missing
   from the build. Android must NOT be given the weight: with one it stops
   looking for the font file by name and falls back to the system font. */
export const fontStyle = (display, weight) => {
  const fontFamily = fontFor(display, weight);
  if (Platform.OS !== 'ios') return { fontFamily };
  const drawn = display ? (weight === 700 ? 700 : 800) : weight;
  return { fontFamily, fontWeight: String(drawn) };
};
