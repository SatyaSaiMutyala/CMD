/* Font files live in src/assets/fonts and are linked into both native projects
   (re-run `npx react-native-asset` after adding one). Each weight is its own
   family name, so never combine these with `fontWeight`. */

const inter = {
  400: 'Inter-Regular',
  500: 'Inter-Medium',
  600: 'Inter-SemiBold',
  700: 'Inter-Bold',
};

const grotesk = {
  500: 'SpaceGrotesk-Medium',
  600: 'SpaceGrotesk-SemiBold',
  700: 'SpaceGrotesk-Bold',
};

// display = Space Grotesk (names, amounts, counts); otherwise Inter (body text)
export const fontFor = (display, weight) =>
  display ? grotesk[weight] || grotesk[700] : inter[weight] || inter[400];
