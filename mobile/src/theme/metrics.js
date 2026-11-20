import { scale, verticalScale } from 'react-native-size-matters';

/* Responsive sizing, built on react-native-size-matters.

   size-matters assumes designs drawn on a 350 x 680 screen. The Approval Hub
   design is drawn at 390 x 844, so the helpers below re-base its scale: a value
   of 16 in the design is exactly 16 on a 390-wide phone and grows or shrinks
   in proportion on other screens.

   Which helper to use:
     s(n)    horizontal spacing: side gutters, horizontal padding and gaps
     mvs(n)  vertical spacing: vertical padding, margins and gaps
     ms(n)   everything with a fixed look: font sizes, radii, icons, button heights
     vs(n)   rarely: things that should track the full screen height            */

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

export const s = n => scale((n * 350) / DESIGN_WIDTH);
export const vs = n => verticalScale((n * 680) / DESIGN_HEIGHT);

// "Moderate" versions only take part of the screen-size change, so text and
// controls do not balloon on tablets or become tiny on small phones.
export const ms = (n, factor = 0.5) => n + (s(n) - n) * factor;
export const mvs = (n, factor = 0.5) => n + (vs(n) - n) * factor;

// Text. The design's sizes read large on a real phone, so every font size is
// drawn a little smaller than drawn there; change TEXT_SCALE to resize all
// text in the app at once.
const TEXT_SCALE = 0.88;
export const fs = n => Math.round(ms(n) * TEXT_SCALE * 2) / 2;

export const gutter = s(16); // side padding of a page
export const hairline = 1.5; // card border width; not scaled
